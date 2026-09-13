"""Verify added transparency without changing any source RGB pixels or framing."""
from pathlib import Path
import cv2
import numpy as np

root = Path(__file__).resolve().parents[1] / 'web' / 'img'
for number in ['0752','0852','0893','0955','0980','1036','1044','1048','1060','1084','1163']:
    name = 'shoot-20260908-' + number
    original = cv2.imread(str(root / 'l' / (name + '.webp')), cv2.IMREAD_COLOR)
    cutout = cv2.imread(str(root / (name + '-cutout.png')), cv2.IMREAD_UNCHANGED)
    assert cutout.shape == (*original.shape[:2], 4), number
    assert np.array_equal(original, cutout[:, :, :3]), number + ': changed RGB'
    alpha = cutout[:, :, 3]
    assert alpha.min() == 0 and alpha.max() == 255, number
    assert not np.any(alpha[0, :]) and not np.any(alpha[-1, :]), number
    assert not np.any(alpha[:, 0]) and not np.any(alpha[:, -1]), number
    assert 0.08 < np.count_nonzero(alpha > 127) / alpha.size < 0.75, number
    # The food/plate centre must not be a hole in the matte.
    assert alpha[500, 720] == 255, number + ': transparent food centre'
    print(number + ': PASS exact source RGB, full canvas, true alpha, solid food centre')
