"""Small seamless base-color textures for the Ege University site model."""

import math
import random
import struct
import zlib


SIZE = 192
RGB = tuple[float, float, float]
NoiseGrid = list[list[float]]


def noise_grid(size: int, rng: random.Random) -> NoiseGrid:
    return [[rng.uniform(-1, 1) for _ in range(size)] for _ in range(size)]


def smooth(value: float) -> float:
    value = max(0, min(1, value))
    return value * value * (3 - 2 * value)


def noise(grid: NoiseGrid, u: float, v: float) -> float:
    """Interpolate periodically so opposite sides of the tile meet."""
    size = len(grid)
    x, y = u * size, v * size
    column, row = math.floor(x), math.floor(y)
    tx, ty = smooth(x - column), smooth(y - row)
    current, following = grid[row % size], grid[(row + 1) % size]
    c0, c1 = column % size, (column + 1) % size
    top = current[c0] + tx * (current[c1] - current[c0])
    bottom = following[c0] + tx * (following[c1] - following[c0])
    return top + ty * (bottom - top)


def blend(first: RGB, second: RGB, amount: float) -> RGB:
    red, green, blue = first
    return (
        red + (second[0] - red) * amount,
        green + (second[1] - green) * amount,
        blue + (second[2] - blue) * amount,
    )


def terrace_pixels() -> bytearray:
    rng = random.Random(31)
    mottling = noise_grid(20, rng)
    grain = noise_grid(64, rng)
    columns, rows = 6, 12
    stones = noise_grid(rows, rng)
    pixels = bytearray()

    for y in range(SIZE):
        v = (y + 0.5) / SIZE
        for x in range(SIZE):
            u = (x + 0.5) / SIZE
            # Six 20 cm stones across a 1.2 m tile, with every second
            # ten-centimetre course offset by half a stone.
            course = v * rows + 0.065 * math.cos(4 * math.pi * u * columns)
            row = math.floor(course)
            across_course = course - row
            stone = u * columns - 0.5 * (row % 2)
            stone += 0.10 * math.cos(2 * math.pi * across_course)
            col = math.floor(stone)
            across_stone = stone - col

            side = min(across_stone, 1 - across_stone) * SIZE / columns
            end = min(across_course, 1 - across_course) * SIZE / rows
            corner = max(0, 2.3 - max(side, end)) * 0.36
            edge = min(side, end) - corner
            coverage = smooth((edge - 0.25) / 1.15)

            texture = noise(mottling, u, v) * 4 + noise(grain, u, v) * 2.6
            variation = stones[row % rows][col % columns] * 6.5
            bevel = 6 * (1 - smooth((edge - 0.9) / 1.6))
            gray = 163 + variation + texture - bevel
            color = blend((106 + texture, 104 + texture, 99 + texture),
                          (gray + 2, gray + 1, gray - 2), coverage)
            pixels.extend(round(channel) for channel in color)

    return pixels


def earth_pixels(lawn: bool) -> bytearray:
    rng = random.Random(61 if lawn else 97)
    patches = noise_grid(5, rng)
    clusters = noise_grid(19, rng)
    fine = noise_grid(72, rng)
    pixels = bytearray()

    dark, light = ((53, 72, 43), (82, 103, 66)) if lawn else ((138, 141, 132), (153, 155, 147))

    for y in range(SIZE):
        v = (y + 0.5) / SIZE
        for x in range(SIZE):
            u = (x + 0.5) / SIZE
            broad = noise(patches, u, v)
            middle = noise(clusters, u, v)
            small = noise(fine, u, v)
            amount = smooth(0.55 + 0.32 * broad + 0.11 * middle)
            color = blend(dark, light, amount)
            if lawn:
                exposed_earth = smooth((-broad - 0.52) * 0.85 + middle * 0.08)
                color = blend(color, (106, 93, 67), exposed_earth)
            tone = 3.5 * middle + 3 * small if lawn else 1.5 * middle + 1.4 * small
            pixels.extend(round(channel + tone) for channel in color)

    return pixels


def png_bytes(pixels: bytearray) -> bytes:
    def chunk(kind: bytes, content: bytes) -> bytes:
        block = kind + content
        return struct.pack(">I", len(content)) + block + struct.pack(">I", zlib.crc32(block))

    lines = bytearray()
    stride = SIZE * 3
    for offset in range(0, len(pixels), stride):
        row = pixels[offset:offset + stride]
        lines.append(1)  # PNG Sub filter, predicting from the previous RGB pixel.
        lines.extend(row[:3])
        lines.extend((row[i] - row[i - 3]) & 255 for i in range(3, stride))

    header = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 2, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(lines, level=9)) + chunk(b"IEND", b""))


def surface_textures() -> dict[str, tuple[bytes, float]]:
    """Return sRGB PNG data and tile width in metres, by material name."""
    return {
        "terrace": (png_bytes(terrace_pixels()), 1.2),
        "lawn": (png_bytes(earth_pixels(lawn=True)), 1.8),
        "site-soil": (png_bytes(earth_pixels(lawn=False)), 4.4),
    }
