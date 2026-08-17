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


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: scripts/promote-sam-cutout.py <dish-id>")
        return 2
    dish_id = sys.argv[1]
    source_path = IMAGE_DIR / f"{dish_id}.jpg"
    sam_path = SAM_DIR / f"{dish_id}-image.png"
    output_path = IMAGE_DIR / f"{dish_id}-cutout.png"
    source = cv2.imread(str(source_path), cv2.IMREAD_COLOR)
    segmented = cv2.imread(str(sam_path), cv2.IMREAD_COLOR)
    if source is None or segmented is None:
        raise FileNotFoundError(f"Missing {source_path} or {sam_path}")

    gray = cv2.cvtColor(segmented, cv2.COLOR_BGR2GRAY)
    binary = np.where(gray > 4, 255, 0).astype(np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise RuntimeError("SAM output contains no usable contour")
    contour = max(contours, key=cv2.contourArea)
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

    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.8)

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
