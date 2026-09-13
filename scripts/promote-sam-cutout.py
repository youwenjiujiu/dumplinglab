#!/usr/bin/env python3
"""Promote a reviewed SAM whole-bowl mask into a transparent menu cutout.

SAM selects the ceramic bowl. Filling its largest outer contour also preserves
the photographed food inside the bowl; every visible pixel still comes from
the restaurant source JPG. The result is feathered and cropped to the same
rough canvas ratio as the established menu photography.
"""

from pathlib import Path
import sys

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "web" / "img"
SAM_DIR = IMAGE_DIR / "candidates" / "sam3"
TARGET_RATIO = 1100 / 763

# Per-dish silhouette constraints are only used when a white ceramic rim has
# nearly the same value as the studio background. Values are measured in the
# original source coordinate space and describe the smooth upper bowl arc.
SILHOUETTE_TOP = {
    "dry-wonton-noodles": {"center_x": 910, "center_y": 365, "curvature": 0.00050},
}

# Manually reviewed ceramic silhouette in the 1440x960 source. SAM confuses
# this white bowl's shaded lower edge with the grey studio surface. These
# curves change only the alpha boundary, never any source colour pixels.
SHOOT_OUTLINE = {
    'shoot-20260908-1163': [
        (384, 475),
        ((374, 362), (554, 251), (769, 249)),
        ((982, 244), (1167, 342), (1176, 454)),
        ((1180, 514), (1134, 565), (1079, 606)),
        ((1028, 637), (987, 718), (937, 742)),
        ((866, 771), (752, 778), (672, 748)),
        ((596, 722), (562, 699), (526, 650)),
        ((505, 622), (495, 620), (458, 589)),
        ((411, 552), (387, 515), (384, 475)),
    ],
}

# Smooth clipping paths reviewed against 720px proofs; coordinates are scaled
# back to the unchanged 1440px source. All food lies within these vessel rims.
# This repairs SAM's fragmented rims, not the food or the photographed pixels.
SHOOT_OUTLINE_720 = {
    '0752': [(139,242), ((140,169),(231,121),(363,119)), ((497,116),(591,164),(598,238)), ((602,276),(575,311),(543,340)), ((503,380),(437,401),(373,401)), ((298,402),(229,378),(197,346)), ((160,310),(139,282),(139,242))],
    '0893': [(165,233), ((165,169),(258,117),(373,117)), ((491,115),(584,170),(589,236)), ((592,278),(556,315),(520,340)), ((474,371),(445,395),(386,396)), ((327,397),(283,375),(238,341)), ((191,306),(165,274),(165,233))],
    '0955': [(128,281), ((127,246),(159,219),(195,205)), ((241,188),(319,166),(356,153)), ((420,131),(494,153),(530,191)), ((557,219),(555,251),(531,276)), ((510,298),(474,306),(441,318)), ((405,329),(358,348),(325,359)), ((276,376),(202,371),(165,344)), ((140,326),(128,306),(128,281))],
    '0980': [(132,292), ((133,256),(161,232),(205,218)), ((251,204),(316,187),(357,174)), ((416,155),(493,176),(530,210)), ((560,240),(558,272),(535,294)), ((516,313),(477,325),(444,335)), ((408,346),(358,363),(315,375)), ((260,392),(198,382),(162,357)), ((141,342),(131,315),(132,292))],
    '1036': [(198,267), ((198,214),(271,169),(361,170)), ((450,169),(526,211),(527,266)), ((531,313),(482,353),(426,373)), ((389,387),(343,385),(306,374)), ((245,354),(198,318),(198,267))],
    '1044': [(116,219), ((117,160),(196,126),(281,127)), ((418,126),(561,177),(607,246)), ((627,276),(626,307),(602,330)), ((572,364),(509,381),(439,381)), ((318,380),(195,334),(145,278)), ((126,257),(116,238),(116,219))],
    '1048': [(141,252), ((143,173),(247,111),(373,111)), ((504,111),(605,172),(609,249)), ((614,306),(557,359),(480,382)), ((402,405),(289,399),(224,371)), ((170,347),(141,302),(141,252))],
    '1060': [(156,274), ((156,235),(187,205),(227,192)), ((278,177),(354,160),(409,145)), ((466,131),(540,147),(577,180)), ((611,209),(610,247),(585,276)), ((563,301),(524,311),(480,324)), ((439,336),(385,351),(340,363)), ((284,379),(224,366),(189,345)), ((166,330),(156,304),(156,274))],
    '0852': [(134,249), ((137,200),(206,162),(268,163)), ((331,164),(422,167),(479,172)), ((546,178),(599,208),(606,251)), ((613,291),(577,322),(535,335)), ((497,347),(452,343),(403,342)), ((355,341),(289,339),(242,333)), ((179,327),(132,298),(134,249))],
}
for number, segments in SHOOT_OUTLINE_720.items():
    SHOOT_OUTLINE['shoot-20260908-' + number] = [tuple(v * 2 for v in segments[0])] + [tuple(tuple(v * 2 for v in p) for p in segment) for segment in segments[1:]]


def reviewed_outline(segments, shape):
    start = np.array(segments[0], dtype=float)
    points = []
    for first, second, end in segments[1:]:
        first, second, end = (np.array(v, dtype=float) for v in (first, second, end))
        for t in np.linspace(0, 1, 100):
            points.append((1-t)**3*start + 3*(1-t)**2*t*first + 3*(1-t)*t*t*second + t**3*end)
        start = end
    mask = np.zeros(shape, dtype=np.uint8)
    cv2.fillPoly(mask, [np.round(points).astype(np.int32)], 255)
    return mask


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: scripts/promote-sam-cutout.py <dish-id>")
        return 2
    dish_id = sys.argv[1]
    if '/' in dish_id or '..' in dish_id:
        raise ValueError('Expected one asset ID, not a path')
    shoot = dish_id.startswith('shoot-20260908-')
    source_path = IMAGE_DIR / 'l' / f"{dish_id}.webp" if shoot else IMAGE_DIR / f"{dish_id}.jpg"
    sam_path = SAM_DIR / f"{dish_id}-image.png"
    output_path = IMAGE_DIR / f"{dish_id}-cutout.png"
    source = cv2.imread(str(source_path), cv2.IMREAD_COLOR)
    segmented = cv2.imread(str(sam_path), cv2.IMREAD_UNCHANGED)
    if source is None or segmented is None:
        raise FileNotFoundError(f"Missing {source_path} or {sam_path}")

    if segmented.shape[:2] != source.shape[:2]:
        raise ValueError('SAM and source dimensions differ; do not silently resize')
    if segmented.ndim == 3 and segmented.shape[2] == 4 and np.min(segmented[:, :, 3]) < 255:
        binary = np.where(segmented[:, :, 3] > 127, 255, 0).astype(np.uint8)
    else:
        gray = cv2.cvtColor(segmented[:, :, :3], cv2.COLOR_BGR2GRAY)
        binary = np.where(gray > 4, 255, 0).astype(np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise RuntimeError("SAM output contains no usable contour")
    contour = max(contours, key=cv2.contourArea)
    if dish_id == 'shoot-20260908-1044':
        # SAM returned separate pieces of this convex oval plate's rim.
        contour = cv2.convexHull(np.concatenate(contours))
    alpha = np.zeros_like(binary)
    cv2.drawContours(alpha, [contour], -1, 255, cv2.FILLED)

    if shoot and dish_id not in SHOOT_OUTLINE:
        # Refine only a narrow uncertain boundary against the original pixels.
        # The SAM interior remains definite foreground, including all the food.
        seed = np.full(alpha.shape, cv2.GC_BGD, dtype=np.uint8)
        outer = cv2.dilate(alpha, np.ones((31, 31), np.uint8)) > 0
        inner = cv2.erode(alpha, np.ones((31, 31), np.uint8)) > 0
        seed[outer] = cv2.GC_PR_BGD
        seed[alpha > 0] = cv2.GC_PR_FGD
        seed[inner] = cv2.GC_FGD
        cv2.grabCut(source, seed, None, np.zeros((1, 65)), np.zeros((1, 65)), 4, cv2.GC_INIT_WITH_MASK)
        refined = np.where((seed == cv2.GC_FGD) | (seed == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
        refined = cv2.morphologyEx(refined, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        outlines, _ = cv2.findContours(refined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contour = max(outlines, key=cv2.contourArea)
        alpha = np.zeros_like(binary)
        cv2.drawContours(alpha, [contour], -1, 255, cv2.FILLED)

    top_constraint = SILHOUETTE_TOP.get(dish_id)
    if top_constraint:
        x_coords = np.arange(alpha.shape[1])
        top_y = np.round(
            top_constraint["center_y"]
            + top_constraint["curvature"]
            * np.square(x_coords - top_constraint["center_x"])
        ).astype(int)
        for x_coord, y_coord in enumerate(top_y):
            alpha[: max(0, min(alpha.shape[0], y_coord)), x_coord] = 0
        constrained_contours, _ = cv2.findContours(
            alpha, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        contour = max(constrained_contours, key=cv2.contourArea)

    if dish_id in SHOOT_OUTLINE:
        alpha = reviewed_outline(SHOOT_OUTLINE[dish_id], binary.shape)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.8)

    if shoot:
        # Preserve full framing and every RGB pixel. Only add an alpha channel.
        # A tight crop here would unexpectedly enlarge dishes in the existing UI.
        rgba = cv2.merge([*cv2.split(source), alpha])
        coverage = np.count_nonzero(alpha > 127) / alpha.size
        if not 0.08 < coverage < 0.75:
            raise ValueError(f'Unexpected subject coverage: {coverage:.3f}')
        if not cv2.imwrite(str(output_path), rgba):
            raise RuntimeError(f'Could not write {output_path}')
        assert np.array_equal(rgba[:, :, :3], source), 'Source pixels must be unchanged'
        print(f'{dish_id}: full-frame original RGB + alpha, {coverage:.1%} subject coverage')
        return 0

    x, y, width, height = cv2.boundingRect(contour)
    padded_width = int(round(width * 1.10))
    padded_height = int(round(height * 1.10))
    if padded_width / padded_height > TARGET_RATIO:
        padded_height = int(round(padded_width / TARGET_RATIO))
    else:
        padded_width = int(round(padded_height * TARGET_RATIO))
    center_x = x + width / 2
    center_y = y + height / 2
    left = max(0, min(source.shape[1] - padded_width, int(round(center_x - padded_width / 2))))
    top = max(0, min(source.shape[0] - padded_height, int(round(center_y - padded_height / 2))))
    right = min(source.shape[1], left + padded_width)
    bottom = min(source.shape[0], top + padded_height)

    blue, green, red = cv2.split(source)
    rgba = cv2.merge([blue, green, red, alpha])[top:bottom, left:right]
    if not cv2.imwrite(str(output_path), rgba):
        raise RuntimeError(f"Could not write {output_path}")
    print(f"{dish_id}: {width}x{height} contour -> {rgba.shape[1]}x{rgba.shape[0]} cutout")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
