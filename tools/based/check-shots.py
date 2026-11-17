"""Fails page screenshots that came out blank in parts.

A full-page browser shot can paint only its first screens and leave the rest as plain background. This walks every
shot in bands and fails a shot when a band above the page footer is one flat colour. Prints PASS/FAIL per shot.

usage: check-shots.py <folder> [--band 300] [--footer 0.08]
"""
import argparse
import glob
import os
import sys

from PIL import Image, ImageStat


def blank_bands(path, band, footer):
    image = Image.open(path).convert("L")
    width, height = image.size
    last = int(height * (1 - footer))
    flat = []
    for top in range(0, max(last - band, 1), band):
        stat = ImageStat.Stat(image.crop((0, top, width, min(top + band, last))))
        if stat.stddev[0] < 1.5:
            flat.append(top)
    return image.size, flat


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--band", type=int, default=300)
    ap.add_argument("--footer", type=float, default=0.08)
    a = ap.parse_args()
    shots = sorted(glob.glob(os.path.join(a.folder, "*.png")))
    if not shots:
        print("FAIL no png in %s" % a.folder)
        sys.exit(1)
    failed = 0
    for path in shots:
        try:
            size, flat = blank_bands(path, a.band, a.footer)
        except OSError as e:
            failed += 1
            print("FAIL %s: cannot read (%s)" % (os.path.basename(path), e))
            continue
        if flat:
            failed += 1
            print("FAIL %s %dx%d: blank from y %s" % (os.path.basename(path), size[0], size[1], ", ".join(map(str, flat[:6]))))
        else:
            print("PASS %s %dx%d" % (os.path.basename(path), *size))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
