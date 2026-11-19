"""Apply the photo-referenced exterior to the approved base GLB.

Usage: py tools/enhance_ege_model.py <original.glb> <updated.glb>
Requires NumPy and Pillow.
The source model's coordinates are metres, with east at +X and south at +Z.
"""

import argparse
import io
import json
import math
from pathlib import Path
import random
import struct

import numpy as np
from PIL import Image, ImageDraw

from ege_surface_textures import surface_textures
from ege_vegetation import add_campus_trees, add_entrance_trees


PAINT = {
    "plaster": "e1e3df",
    "soffit": "d4d7d3",
    "white-frame": "f0f1ed",
    "cobalt": "2c55a3",
    "rail": "30568e",
    "glass": "788b98",
    "terracotta": "a56855",
    "step-face": "595b5d",
    "step-tread": "b9b9b3",
}

LANDSCAPE = {
    "site-soil": "9f9e8f",
    "campus-road": "969893",
    "road-edge": "aaa79e",
    "curb-pink": "984467",
    "curb-white": "c8c4c2",
    "tactile-base": "c4a340",
    "tactile-rib": "e6bf54",
    "stone": "9a9a8f",
    "stone-light": "aba99e",
    "stone-weathered": "797b71",
    "lamp-post": "5e6669",
    "lamp-head": "3d4648",
    "lamp-lens": "b5c0bd",
    "flag-cloth": "ffffff",
    "broad-bark": "493e34",
    "pale-bark": "b6afa0",
    "pale-bark-dark": "7d7868",
    "needle-bark": "625447",
    "leaf-green": "566440",
    "leaf-light": "70824a",
    "leaf-olive": "7d7144",
    "needles": "3a543f",
    "needles-light": "4d6a50",
}


def linear_channel(value):
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4


def base_color(hex_color):
    return [linear_channel(int(hex_color[i:i+2], 16) / 255) for i in (0, 2, 4)] + [1]


class GLB:
    def __init__(self, path):
        raw = path.read_bytes()
        magic, version, size, json_size, chunk = struct.unpack_from("<4sIII4s", raw)
        if (magic, version, size, chunk) != (b"glTF", 2, len(raw), b"JSON"):
            raise ValueError("Expected a complete glTF 2 binary")
        end = 20 + json_size
        buffer_size, buffer_type = struct.unpack_from("<I4s", raw, end)
        if buffer_type != b"BIN\0" or end + 8 + buffer_size != size:
            raise ValueError("Expected one embedded binary buffer")
        self.doc = json.loads(raw[20:end])
        self.buffer = bytearray(raw[end + 8:])
        if self.doc["asset"].get("extras", {}).get("landscape"):
            raise ValueError("Use the original GLB as input")
        self.materials = {item["name"]: i for i, item in enumerate(self.doc["materials"])}

    def add(self, collection, item):
        index = len(self.doc[collection])
        self.doc[collection].append(item)
        return index

    def buffer_view(self, data, target=None):
        offset = len(self.buffer)
        self.buffer.extend(data)
        self.buffer.extend(b"\0" * (-len(self.buffer) % 4))
        item = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target is not None:
            item["target"] = target
        return self.add("bufferViews", item)

    def accessor(self, array, kind, *, bounds=False, indices=False):
        view = self.buffer_view(array.tobytes(), 34963 if indices else 34962)
        type_code = {2: 5123, 4: 5125}[array.dtype.itemsize] if indices else 5126
        item = {"bufferView": view, "type": kind, "count": len(array), "componentType": type_code}
        if bounds:
            item.update(min=array.min(axis=0).tolist(), max=array.max(axis=0).tolist())
        return self.add("accessors", item)

    def tint(self, name, value):
        self.doc["materials"][self.materials[name]]["pbrMetallicRoughness"]["baseColorFactor"] = base_color(value)

    def material(self, name, color):
        self.materials[name] = self.add("materials", {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": base_color(color),
                "metallicFactor": 0,
                "roughnessFactor": .94,
            },
            "doubleSided": name == "flag-cloth",
        })

    def texture(self, name, png, repeat=False):
        image = self.add("images", {"name": name, "mimeType": "image/png", "bufferView": self.buffer_view(png)})
        mode = 10497 if repeat else 33071
        sampler = self.add("samplers", {"wrapS": mode, "wrapT": mode, "minFilter": 9987, "magFilter": 9729})
        texture = self.add("textures", {"source": image, "sampler": sampler})
        material = self.doc["materials"][self.materials[name]]["pbrMetallicRoughness"]
        material.update(baseColorFactor=[1, 1, 1, 1], baseColorTexture={"index": texture})

    def map_existing_surfaces(self, periods):
        mapped = {self.materials[name]: period for name, period in periods.items()}
        for mesh in self.doc["meshes"]:
            for primitive in mesh["primitives"]:
                period = mapped.get(primitive["material"])
                if period is None:
                    continue
                attributes = primitive["attributes"]
                positions = self.doc["accessors"][attributes["POSITION"]]
                view = self.doc["bufferViews"][positions["bufferView"]]
                offset = view["byteOffset"] + positions.get("byteOffset", 0)
                coordinates = np.frombuffer(
                    self.buffer, dtype="<f4", count=positions["count"] * 3, offset=offset,
                ).reshape(-1, 3)
                uv = (coordinates[:, [0, 2]] / period).astype("<f4")
                del coordinates
                attributes["TEXCOORD_0"] = self.accessor(uv, "VEC2")

    def add_mesh(self, name, group):
        primitives = []
        for material, faces in group.faces.items():
            unique = {}
            index_values = [unique.setdefault(vertex, len(unique)) for vertex in faces]
            coordinates = np.asarray(list(unique), dtype="<f4")
            positions = self.accessor(coordinates[:, :3], "VEC3", bounds=True)
            normals = self.accessor(coordinates[:, 3:6], "VEC3")
            attributes = {"POSITION": positions, "NORMAL": normals}
            if coordinates.shape[1] == 8:
                attributes["TEXCOORD_0"] = self.accessor(coordinates[:, 6:], "VEC2")
            index_type = "<u2" if len(unique) <= 65535 else "<u4"
            indices = self.accessor(np.asarray(index_values, dtype=index_type), "SCALAR", indices=True)
            primitives.append({"attributes": attributes, "indices": indices, "material": self.materials[material]})
        mesh = self.add("meshes", {"name": name, "primitives": primitives})
        node = self.add("nodes", {"name": name, "mesh": mesh, "extras": {"group": name}})
        self.doc["scenes"][self.doc["scene"]]["nodes"].append(node)

    def write(self, target):
        self.doc["buffers"][0]["byteLength"] = len(self.buffer)
        doc = json.dumps(self.doc, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        doc += b" " * (-len(doc) % 4)
        header = struct.pack("<4sII", b"glTF", 2, 28 + len(doc) + len(self.buffer))
        target.write_bytes(header + struct.pack("<I4s", len(doc), b"JSON") + doc +
                           struct.pack("<I4s", len(self.buffer), b"BIN\0") + self.buffer)


def cross(a, b):
    return a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]


def subtract(a, b):
    return tuple(x - y for x, y in zip(a, b))


def unit(vector):
    size = math.hypot(*vector)
    return tuple(value / size for value in vector)


class Geometry:
    def __init__(self, periods):
        self.faces = {}
        self.periods = periods

    def triangle(self, material, a, b, c, uv=None):
        normal = cross(subtract(b, a), subtract(c, a))
        if math.hypot(*normal) < 1e-9:
            return
        normal = unit(normal)
        coordinates = (a, b, c)
        if material in self.periods:
            period = self.periods[material]
            uv = [(x / period, z / period) for x, _, z in coordinates]
        group = self.faces.setdefault(material, [])
        if uv is None:
            group.extend(tuple(point) + normal for point in coordinates)
        else:
            group.extend(tuple(point) + normal + tuple(tex) for point, tex in zip(coordinates, uv))

    def quad(self, material, a, b, c, d):
        self.triangle(material, a, b, c)
        self.triangle(material, a, c, d)

    def plane(self, material, x0, x1, z0, z1, y):
        self.quad(material, (x0, y, z0), (x0, y, z1), (x1, y, z1), (x1, y, z0))

    def box(self, material, x0, x1, y0, y1, z0, z1):
        bottom = [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)]
        top = [(x, y1, z) for x, _, z in bottom]
        for i in range(4):
            j = (i + 1) % 4
            self.quad(material, bottom[i], top[i], top[j], bottom[j])
        self.quad(material, top[0], top[3], top[2], top[1])
        self.quad(material, *bottom)

    def tube(self, material, a, b, radius, tip=None, sides=8):
        direction = unit(subtract(b, a))
        side = unit(cross(direction, (1, 0, 0) if abs(direction[1]) > .92 else (0, 1, 0)))
        up = cross(direction, side)

        def ring(position, width):
            return [
                tuple(p + width * (u * math.cos(turn) + v * math.sin(turn)) for p, u, v in zip(position, side, up))
                for turn in (math.tau * i / sides for i in range(sides))
            ]

        start, end = ring(a, radius), ring(b, tip if tip is not None else radius)
        for i in range(sides):
            j = (i + 1) % sides
            self.quad(material, start[i], start[j], end[j], end[i])
            self.triangle(material, a, start[j], start[i])
            self.triangle(material, b, end[i], end[j])


def ground_geometry(periods):
    mesh = Geometry(periods)
    mesh.box("site-soil", -127, 116, -.31, -.112, -91, 92)
    for x0, x1, z0, z1 in (
        (-111, 65, -87, -55.4), (-46, 52.9, -26.8, -13.6),
        (-44, 53.6, 13.35, 25.7), (-50, 55.35, 56.8, 72.9),
        (71.61, 95.2, 56.45, 72.9), (98.73, 115.5, -42.0, 73.0),
    ):
        mesh.plane("lawn", x0, x1, z0, z1, -.043)
    mesh.plane("terrace", -116, 45.8, 73, 76.4, -.024)
    mesh.plane("terrace", 88.8, 113, 73, 76.4, -.024)
    mesh.plane("terrace", 67.45, 74.95, 27.8, 54.55, -.022)
    mesh.plane("terrace", -49.8, 53.75, -17.0, -15.0, -.008)
    mesh.plane("terrace", -43.4, 53.7, 22.0, 24.0, -.008)
    mesh.plane("road-edge", -126.9, 115.9, 79.7, 85.4, -.042)
    mesh.plane("campus-road", -126.9, 115.9, 80.05, 85.05, -.008)
    return mesh


def painted_curb(mesh, axis, edge, a, b, start_pink=True):
    count = math.ceil((b - a) / 1.11)
    for i in range(count):
        x0 = a + (b - a) * i / count + .008
        x1 = a + (b - a) * (i + 1) / count - .008
        material = "curb-pink" if (i % 2 == 0) == start_pink else "curb-white"
        if axis == "x":
            mesh.box(material, x0, x1, -.012, .127, edge-.07, edge+.07)
        else:
            mesh.box(material, edge-.07, edge+.07, -.012, .127, x0, x1)


def tactile_paving(mesh):
    for z in np.arange(56.78, 75.0, .31):
        mesh.box("tactile-base", 58.06, 58.37, .014, .024, z, z+.304)
        for x in (58.097, 58.166, 58.235, 58.304):
            mesh.box("tactile-rib", x, x+.023, .023, .038, z+.022, z+.285)
    for x in np.arange(46.0, 86.9, .31):
        if 57.79 < x < 58.42:
            continue
        mesh.box("tactile-base", x, x+.304, .015, .024, 75.08, 75.39)
        for z in (75.116, 75.185, 75.254, 75.323):
            mesh.box("tactile-rib", x+.022, x+.285, .023, .037, z, z+.023)
    mesh.box("tactile-base", 57.91, 58.52, .014, .024, 74.9, 75.52)
    for x in np.linspace(57.98, 58.45, 5):
        for z in np.linspace(74.97, 75.45, 5):
            mesh.tube("tactile-rib", (x, .023, z), (x, .043, z), .023, .019, sides=6)


def standing_stone(mesh, x, z, height, width, depth, seed):
    rng = random.Random(seed)
    sides = 10
    angles = [math.tau * i / sides for i in range(sides)]
    rings = []
    for fraction, scale, shift in ((0, .96, .00), (.34, 1, .008), (.83, .90, -.033), (1, .61, -.045)):
        ring = []
        for angle in angles:
            ratio = scale * rng.uniform(.86, 1.15)
            y = .04 + height * (fraction + (rng.uniform(-.045, .013) if fraction else 0))
            ring.append((x + shift + width*.5*ratio*math.cos(angle), y, z + depth*.5*ratio*math.sin(angle)))
        rings.append(ring)
    tones = ("stone", "stone", "stone", "stone-weathered", "stone-light")
    for low, high in zip(rings, rings[1:]):
        for i in range(sides):
            j = (i + 1) % sides
            mesh.quad(rng.choice(tones), low[i], high[i], high[j], low[j])
    crown = (x-.028, height+.053, z+.025)
    for i in range(sides):
        mesh.triangle("stone-light", rings[-1][i], crown, rings[-1][(i+1) % sides])


def street_light(mesh, x, z, height, direction):
    mesh.box("stone", x-.25, x+.25, .007, .16, z-.25, z+.25)
    mesh.tube("lamp-post", (x, .16, z), (x, height-.43, z), .063, .042)
    mesh.tube("lamp-post", (x, height-.43, z), (x+.32*direction, height-.17, z), .043, .038)
    mesh.tube("lamp-post", (x+.32*direction, height-.17, z), (x+1.56*direction, height-.11, z), .038, .034)
    head = sorted((x+1.47*direction, x+1.95*direction))
    mesh.box("lamp-head", *head, height-.158, height-.052, z-.09, z+.09)
    mesh.box("lamp-lens", head[0]+.058, head[1]-.05, height-.172, height-.154, z-.064, z+.064)


def flag_image():
    image = Image.new("RGB", (360, 240), "#c92536")
    draw = ImageDraw.Draw(image)
    draw.ellipse((58, 60, 178, 180), fill="#f2f1ed")
    draw.ellipse((92, 73, 185, 167), fill="#c92536")
    points = []
    for i in range(10):
        angle = math.tau * i / 10 + math.pi
        radius = 31 if i % 2 == 0 else 11.8
        points.append((194 + radius * math.cos(angle), 120 + radius * math.sin(angle)))
    draw.polygon(points, fill="#f2f1ed")
    encoded = io.BytesIO()
    image.save(encoded, format="PNG", optimize=True)
    return encoded.getvalue()


def flag(mesh):
    def position(u, v):
        return (
            60.45 + 1.69*u, 7.18 - 1.12*v - .23*u,
            55.11 + .11*math.sin(u*math.tau*1.4)*math.sin((u+.12)*math.pi/1.6) + .18*u,
        )

    for i in range(12):
        u, next_u = i/12, (i+1)/12
        a, b, c, d = position(u, 0), position(u, 1), position(next_u, 1), position(next_u, 0)
        mesh.triangle("flag-cloth", a, b, c, [(u, 0), (u, 1), (next_u, 1)])
        mesh.triangle("flag-cloth", a, c, d, [(u, 0), (next_u, 1), (next_u, 0)])


def approach_geometry(periods):
    mesh = Geometry(periods)
    painted_curb(mesh, "x", 56.76, 59.26, 68.22)
    painted_curb(mesh, "x", 72.89, 59.26, 68.22, False)
    painted_curb(mesh, "z", 59.29, 56.75, 72.91, False)
    painted_curb(mesh, "z", 68.22, 56.75, 72.91)
    painted_curb(mesh, "z", 55.32, 57.14, 72.92)
    painted_curb(mesh, "z", 71.64, 57.06, 72.92, False)
    painted_curb(mesh, "x", 72.90, 46.2, 55.28)
    painted_curb(mesh, "x", 72.90, 71.73, 89.0, False)
    tactile_paving(mesh)
    standing_stone(mesh, 61.66, 61.53, 1.86, .33, .34, 209)
    standing_stone(mesh, 60.55, 58.81, 1.16, .70, .43, 804)
    street_light(mesh, 59.73, 72.15, 6.8, -1)
    street_light(mesh, 72.52, 66.34, 7.3, -1)
    flag(mesh)
    return mesh


def enhance(source, target):
    model = GLB(source)
    for name, color in PAINT.items():
        model.tint(name, color)
    for name, color in LANDSCAPE.items():
        model.material(name, color)
    surfaces = surface_textures()
    periods = {name: period for name, (_, period) in surfaces.items()}
    for name, (texture, _) in surfaces.items():
        model.texture(name, texture, repeat=True)
    model.texture("flag-cloth", flag_image())
    model.map_existing_surfaces(periods)
    model.add_mesh("Kampüs Zemini", ground_geometry(periods))
    model.add_mesh("Giriş Yolları ve Taşlar", approach_geometry(periods))
    vegetation = Geometry(periods)
    add_entrance_trees(vegetation)
    model.add_mesh("Giriş Ağaçları", vegetation)
    campus_trees = Geometry(periods)
    add_campus_trees(campus_trees)
    model.add_mesh("Kampüs Ağaçları", campus_trees)
    model.doc["asset"]["extras"]["landscape"] = {
        "sources": ["Photographs of the shared deanery entrance", "Izmir municipal orthophoto, 2021"],
        "precision": "Visible entrance landmarks aligned approximately; vegetation shapes and distant landscaping modelled.",
    }
    model.write(target)
    print(f"{target.name}: {target.stat().st_size:,} bytes, {len(model.doc['nodes'])} groups")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    arguments = parser.parse_args()
    enhance(arguments.source, arguments.target)
