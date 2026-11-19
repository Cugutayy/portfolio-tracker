"""Tree geometry for the shared deanship entrance in the model's metre grid."""

from math import cos, sin, sqrt, tau
from random import Random


UP = (0, 1, 0)
EAST = (1, 0, 0)


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


def scale(vector, factor):
    return tuple(value * factor for value in vector)


def cross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def unit(vector):
    return scale(vector, 1 / sqrt(sum(value * value for value in vector)))


def axes(direction):
    reference = EAST if abs(direction[0]) < .75 else UP
    tangent = unit(cross(direction, reference))
    return tangent, cross(direction, tangent)


def tube(mesh, rng, points, radii, bark, sides=7, mottled=False):
    phase = rng.uniform(0, tau)
    grain = [rng.uniform(.87, 1.11) for _ in range(sides)]
    reference = EAST if abs(unit(sub(points[-1], points[0]))[0]) < .8 else UP
    rings = []
    for index, (point, radius) in enumerate(zip(points, radii)):
        direction = unit(sub(points[min(index + 1, len(points) - 1)], points[max(index - 1, 0)]))
        # A fixed reference across the limb keeps the bark ridges continuous.
        tangent = unit(cross(direction, reference))
        normal = cross(direction, tangent)
        ring = []
        for side in range(sides):
            angle = phase + side * tau / sides + index * .07
            vector = add(scale(tangent, cos(angle)), scale(normal, sin(angle)))
            ring.append(add(point, scale(vector, radius * grain[side])))
        rings.append(ring)

    for lower, upper in zip(rings, rings[1:]):
        for side in range(sides):
            nxt = (side + 1) % sides
            shade = "pale-bark-dark" if mottled and rng.random() < .19 else bark
            mesh.triangle(shade, lower[side], lower[nxt], upper[nxt])
            shade = "pale-bark-dark" if mottled and rng.random() < .24 else bark
            mesh.triangle(shade, lower[side], upper[nxt], upper[side])

    for side in range(sides):
        nxt = (side + 1) % sides
        mesh.triangle(bark, points[0], rings[0][nxt], rings[0][side])
        mesh.triangle(bark, points[-1], rings[-1][side], rings[-1][nxt])


def blade(mesh, rng, center, length, width, color, heading=None):
    yaw = rng.uniform(0, tau) if heading is None else heading + rng.uniform(-.65, .65)
    direction = unit((cos(yaw), rng.uniform(-.39, .52), sin(yaw)))
    lateral, normal = axes(direction)
    roll = rng.uniform(-.93, .93)
    lateral = add(scale(lateral, cos(roll)), scale(normal, sin(roll)))
    fold = scale(cross(direction, lateral), width * .2)
    base = add(center, scale(direction, -length * .42))
    tip = add(center, scale(direction, length * .58))
    left = add(add(center, scale(lateral, width * .5)), fold)
    right = add(add(center, scale(lateral, -width * .43)), fold)
    # Each folded blade is visible from above and below the crown.
    mesh.triangle(color, base, tip, left)
    mesh.triangle(color, left, tip, base)
    mesh.triangle(color, tip, base, right)
    mesh.triangle(color, right, base, tip)


def spray(mesh, rng, center, spread, count, size, colors, heading=None):
    for _ in range(count):
        angle = rng.uniform(0, tau)
        altitude = rng.uniform(-1, 1)
        distance = rng.random() ** .44
        horizontal = distance * sqrt(1 - altitude * altitude)
        offset = (
            cos(angle) * horizontal * spread[0],
            altitude * distance * spread[1],
            sin(angle) * horizontal * spread[2],
        )
        length = size * rng.uniform(.55, 1.28)
        ratio = rng.uniform(.46, .78) if heading is None else rng.uniform(.30, .55)
        blade(mesh, rng, add(center, offset), length, length * ratio, rng.choice(colors), heading)


def deciduous(mesh, rng, base, trunk, main_limbs, bark, colors, *, density, leaf_size):
    mottled = bark == "pale-bark"
    tube(mesh, rng, [add(base, point) for point, _ in trunk], [radius for _, radius in trunk],
         bark, sides=11, mottled=mottled)

    for start, elbow, end, radius in main_limbs:
        tube(mesh, rng, [add(base, point) for point in (start, elbow, end)],
             [radius, radius * .66, radius * .23], bark, sides=8, mottled=mottled)
        outward = unit(sub(end, elbow))
        lateral, normal = axes(outward)
        for index in range(4):
            angle = (index + rng.uniform(-.32, .32)) * tau / 4
            progress = rng.uniform(.22, .51) + index * .13
            root = add(elbow, scale(sub(end, elbow), progress))
            offset = add(scale(lateral, cos(angle)), scale(normal, sin(angle)))
            direction = unit(add(outward, scale(offset, rng.uniform(.46, 1.32))))
            length = rng.uniform(.88, 2.1)
            bend = add(root, scale(direction, length * .58))
            tip = add(add(root, scale(direction, length)), (0, rng.uniform(.13, .67), 0))
            r = radius * (1.02 - progress) * .49
            tube(mesh, rng, [add(base, point) for point in (root, bend, tip)],
                 [r, r * .55, max(r * .13, .002)], bark, sides=5, mottled=mottled)
            canopy = add(base, add(tip, scale(direction, .25)))
            spread = rng.uniform(.68, 1.30)
            spray(mesh, rng, canopy, (spread, spread * .72, spread * .87),
                  density, leaf_size, colors)
        spray(mesh, rng, add(base, end), (1.1, .68, .87), density, leaf_size, colors)


def plane_tree(mesh, rng):
    trunk = [
        ((0, 0, 0), .46), ((.03, .4, -.04), .39), ((-.20, 2.23, -.19), .33),
        ((-.6, 4.74, -.34), .31), ((-.88, 7.45, -.46), .24), ((-1.35, 10.1, -.53), .17),
        ((-1.04, 12.6, -.38), .10), ((-.76, 15.18, -.48), .038),
    ]
    limbs = [
        ((-.41, 3.8, -.29), (-1.70, 6.0, .12), (-3.77, 9.1, .96), .19),
        ((-.58, 4.8, -.34), (.66, 7.12, .37), (2.75, 10.6, 1.24), .22),
        ((-.73, 5.82, -.39), (-.83, 7.57, -2.12), (-1.08, 10.25, -3.97), .15),
        ((-.82, 7.03, -.42), (-1.03, 9.21, 1.26), (-.57, 11.8, 3.34), .16),
        ((-1.02, 8.65, -.47), (-2.89, 10.87, -.68), (-4.23, 13.32, -.88), .145),
        ((-1.21, 9.45, -.51), (.77, 11.1, -1.99), (1.88, 13.05, -3.14), .124),
        ((-1.15, 11.62, -.45), (-.66, 13.47, 1.11), (.48, 15.42, 1.83), .105),
        ((-1.07, 12.4, -.38), (-1.12, 14.36, -.58), (-1.97, 15.85, -1.02), .083),
    ]
    deciduous(mesh, rng, (62.10, .08, 57.75), trunk, limbs, "pale-bark",
              ("leaf-green", "leaf-light", "leaf-light", "leaf-olive"), density=19, leaf_size=.43)


def forked_tree(mesh, rng):
    trunk = [
        ((0, 0, 0), .61), ((-.11, .42, -.025), .51), ((-.19, 1.43, -.13), .47),
        ((.10, 3.29, -.24), .40), ((.63, 6.05, -.35), .33), ((1.04, 9.15, -.30), .25),
        ((1.09, 12.39, -.12), .15), ((1.64, 15.82, .12), .056),
    ]
    limbs = [
        ((-.19, 1.43, -.13), (-3.06, 3.97, .17), (-5.89, 8.13, .14), .46),
        ((-3.06, 3.97, .17), (-5.17, 5.50, -1.02), (-7.22, 8.83, -2.59), .20),
        ((-4.35, 5.78, .15), (-6.23, 7.16, 1.82), (-7.28, 10.55, 2.58), .22),
        ((-5.68, 7.82, .14), (-6.18, 10.34, .27), (-5.49, 13.63, .40), .21),
        ((.21, 4.0, -.27), (1.34, 6.42, -1.04), (3.78, 10.38, -2.37), .25),
        ((.82, 7.46, -.34), (2.46, 9.44, 1.71), (4.13, 12.09, 2.89), .19),
        ((1.07, 10.15, -.25), (.35, 11.63, -2.18), (-.32, 13.65, -4.31), .17),
        ((1.09, 11.85, -.15), (1.98, 14.72, .41), (3.12, 16.15, .56), .115),
        ((1.09, 12.39, -.12), (.40, 14.46, 1.30), (-.75, 16.34, 1.63), .10),
    ]
    deciduous(mesh, rng, (72.45, .08, 70.80), trunk, limbs, "broad-bark",
              ("leaf-green", "leaf-green", "leaf-olive", "leaf-light"), density=18, leaf_size=.47)


def rounded_tree(mesh, rng):
    trunk = [
        ((0, 0, 0), .40), ((.06, .53, .08), .33), ((.12, 2.11, .12), .24),
        ((.38, 3.60, .06), .21), ((.17, 5.64, .23), .12), ((.31, 8.48, .40), .038),
    ]
    branches = []
    for index in range(9):
        angle = index * 2.40 + rng.uniform(-.18, .18)
        start = (.26, rng.uniform(2.44, 5.28), .12)
        radius = rng.uniform(1.4, 3.05)
        outward = (cos(angle) * radius, 0, sin(angle) * radius)
        elbow = add(add(start, scale(outward, .52)), (0, 1.07, 0))
        end = add(outward, (.21, rng.uniform(5.30, 8.20), .14))
        branches.append((start, elbow, end, rng.uniform(.09, .17)))
    deciduous(mesh, rng, (52.20, .08, 60.50), trunk, branches, "broad-bark",
              ("leaf-green", "leaf-green", "leaf-green", "leaf-olive"), density=23, leaf_size=.58)


def evergreen(mesh, rng):
    base = (47.80, .08, 58.80)
    trunk = [
        ((0, 0, 0), .30), ((-.056, .68, .11), .255), ((-.18, 2.92, .16), .188),
        ((-.16, 5.84, .05), .126), ((-.07, 8.54, -.04), .083), ((.15, 12.62, .01), .019),
    ]
    tube(mesh, rng, [add(base, point) for point, _ in trunk], [radius for _, radius in trunk],
         "needle-bark", sides=9)
    colors = ("needles", "needles", "needles", "needles-light")
    tiers = ((2.6, 2.58, 4), (3.53, 3.02, 5), (4.60, 2.78, 5), (5.72, 2.72, 5),
             (6.77, 2.31, 5), (7.85, 1.98, 5), (8.93, 1.65, 5), (9.82, 1.11, 4),
             (10.77, .84, 4), (11.53, .52, 3), (12.01, .33, 3))
    for height, spread, branches in tiers:
        angle = rng.uniform(0, tau)
        for index in range(branches):
            yaw = angle + tau * index / branches + rng.uniform(-.28, .28)
            reach = spread * rng.uniform(.73, 1.14)
            heading = (cos(yaw), 0, sin(yaw))
            root = add(base, (-.10, height + rng.uniform(-.18, .18), .08))
            bend = add(add(root, scale(heading, reach * .55)), (0, -.14, 0))
            tip = add(add(root, scale(heading, reach)), (0, rng.uniform(.06, .38), 0))
            radius = .045 + spread * .019
            tube(mesh, rng, [root, bend, tip], [radius, radius * .53, radius * .12],
                 "needle-bark", sides=5)

            for offset, pack in ((.43, .42), (.66, .55), (.87, .47), (1.0, .29)):
                center = add(add(root, scale(heading, reach * offset)), (0, .04 + offset * .18, 0))
                width = min(pack, spread * .41)
                spray(mesh, rng, center, (width, width * .39, width), 6,
                      min(.60, .25 + spread * .16), colors, yaw)


def add_entrance_trees(mesh):
    """Add the four trees visible around the south approach, with stable variation."""
    plane_tree(mesh, Random(117))
    forked_tree(mesh, Random(303))
    rounded_tree(mesh, Random(91))
    evergreen(mesh, Random(212))


def crown_lobe(mesh, rng, center, spread):
    sides = 5
    phase = rng.uniform(0, tau)
    rings = []
    for height, radial in ((-.29, .80), (.27, 1)):
        ring = []
        for side in range(sides):
            angle = phase + side * tau / sides
            extent = radial * rng.uniform(.76, 1.19)
            offset = (cos(angle) * extent * spread[0],
                      (height + rng.uniform(-.17, .16)) * spread[1],
                      -sin(angle) * extent * spread[2])
            ring.append(add(center, offset))
        rings.append(ring)
    lower, upper = rings
    bottom = add(center, (0, -.84 * spread[1], 0))
    top = add(center, (.12 * spread[0], spread[1], -.09 * spread[2]))
    for side in range(sides):
        nxt = (side + 1) % sides
        mesh.triangle("leaf-green", bottom, lower[nxt], lower[side])
        mesh.triangle("leaf-green", lower[side], lower[nxt], upper[nxt])
        mesh.triangle(rng.choice(("leaf-green", "leaf-olive")), lower[side], upper[nxt], upper[side])
        mesh.triangle(rng.choice(("leaf-green", "leaf-olive", "leaf-olive")), top, upper[side], upper[nxt])
    spray(mesh, rng, center, scale(spread, 1.19), 6, spread[0] * .64,
          ("leaf-green", "leaf-olive"))


def campus_tree(mesh, rng, x, z, height, radius):
    base = (x, .05, z)
    slope = (rng.uniform(-.42, .42), 0, rng.uniform(-.42, .42))
    fork = add(add(base, scale(slope, .7)), (0, height * .44, 0))
    upper = add(add(base, slope), (0, height * .83, 0))
    tube(mesh, rng, [base, fork, upper], [.17 + radius * .052, .14, .045], "broad-bark", sides=6)
    phase = rng.uniform(0, tau)
    for index in range(4):
        angle = phase + index * tau / 4 + rng.uniform(-.24, .24)
        reach = radius * rng.uniform(.43, .58)
        offset = (cos(angle) * reach, 0, sin(angle) * reach)
        elbow = add(add(fork, scale(offset, .57)), (0, height * .17, 0))
        center = add(add(fork, offset), (0, height * rng.uniform(.23, .35), 0))
        tube(mesh, rng, [fork, elbow, center], [.098, .059, .022], "broad-bark", sides=5)
        crown_lobe(mesh, rng, center,
                   (radius * rng.uniform(.49, .63), height * rng.uniform(.15, .25), radius * .52))
    crown_lobe(mesh, rng, upper, (radius * .52, height * .19, radius * .55))


def add_campus_trees(mesh):
    """Add approximate crowns centered on the campus orthophoto canopy positions."""
    court = [(-40.6, -22.4), (-35.3, 16.5), (-27.2, -19.9), (-17.2, -26.7),
             (20.8, 16.5), (35.9, -24.9), (40.3, 19.9), (52.7, 19.6)]
    north = [(-73, -66.4), (-54, -65.1), (-27, -69), (-1.7, -61.5),
             (19.6, -63.5), (32, -72.5), (41, -78.2)]
    south = [(-34.6, 54.5), (-10.7, 67.2), (11.3, 71.7), (24.2, 65.9),
             (40.6, 64.8), (80.2, 69.5), (95.5, 68)]
    rng = Random(4036)
    for x, z in court:
        campus_tree(mesh, rng, x, z, rng.uniform(4.9, 7.9), rng.uniform(1.6, 2.8))
    for x, z in north + south:
        campus_tree(mesh, rng, x, z, rng.uniform(5.2, 9.7), rng.uniform(2.1, 3.7))
