"""Mechanical pen-centerline trace of the generated sparse sketch (not image editing)."""
import sys, json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize, remove_small_objects

source, target = map(Path, sys.argv[1:3])
rgba = Image.open(source).convert('RGBA')
white = Image.new('RGBA', rgba.size, 'white')
white.alpha_composite(rgba)
gray = np.array(white.convert('L'))
ratio = min(1, 1000 / gray.shape[1])
gray = cv2.resize(gray, None, fx=ratio, fy=ratio, interpolation=cv2.INTER_AREA)
ink = remove_small_objects(gray < 160, min_size=14)
skel = skeletonize(ink)
points = set(zip(*np.where(skel)))
neighbors = {}
for y, x in points:
    connected = []
    for dy in [-1, 0, 1]:
        for dx in [-1, 0, 1]:
            if not (dy or dx) or (y+dy, x+dx) not in points:
                continue
            # Skip diagonal shortcuts when an orthogonal connection exists.
            if dy and dx and ((y+dy, x) in points or (y, x+dx) in points):
                continue
            connected.append((y+dy, x+dx))
    neighbors[(y, x)] = connected
seen = set()
paths = []
def edge(a, b): return tuple(sorted([a, b]))
def walk(start, nxt):
    line = [start, nxt]
    seen.add(edge(start, nxt))
    while len(neighbors[nxt]) == 2:
        after = next((p for p in neighbors[nxt] if edge(nxt, p) not in seen), None)
        if after is None: break
        seen.add(edge(nxt, after)); line.append(after); nxt = after
    if len(line) >= 9:
        contour = np.array([(x, y) for y, x in line], dtype=np.float32)
        simple = cv2.approxPolyDP(contour, .85, False).reshape(-1, 2)
        if len(simple) >= 2: paths.append(simple)
for start in sorted(points):
    if len(neighbors[start]) != 2:
        for nxt in neighbors[start]:
            if edge(start, nxt) not in seen: walk(start, nxt)
for start in sorted(points):
    for nxt in neighbors[start]:
        if edge(start, nxt) not in seen: walk(start, nxt)
allpts = np.concatenate(paths)
low, high = allpts.min(axis=0)-24, allpts.max(axis=0)+24
width, height = high-low
def order(line):
    y = (line[:, 1].mean()-low[1])/height
    group = 0 if y < .3 else 1 if y < .68 else 2
    return group, line[:, 1].min(), line[:, 0].mean()
paths.sort(key=order)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{low[0]:.1f} {low[1]:.1f} {width:.1f} {height:.1f}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">']
for i, line in enumerate(paths):
    d = 'M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in line)
    svg.append(f'<path d="{d}"/>')
svg.append('</svg>')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text('\n'.join(svg))
print(json.dumps({'paths':len(paths),'viewBox':[float(x) for x in [*low,width,height]],'output':str(target)}))
