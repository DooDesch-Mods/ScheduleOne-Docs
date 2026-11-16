"""Turns the in-game shots of the Based bases into the WebP images the base pages show.

Every page image has one source shot here, so swapping a shot is one line and one run. Sources are relative to
--shots (the folder that holds based-storageunit/ and based-sweatshop/). Prints PASS/FAIL per image.

usage: images.py --shots F:/Projects/Mods/Schedule1/_drafts [--only storage-unit/loft]
"""
import argparse
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "img", "based")
SIZE = (1600, 900)

# page image (under public/img/based, without .webp): source shot
SOURCES = {
    "storage-unit/before": "based-storageunit/vanilla/day-stair-side.png",
    "storage-unit/after": "based-storageunit/final/ray.storageunit-loft-complete/day-stair-side.png",
    "storage-unit/loft": "based-storageunit/final/ray.storageunit-loft-complete/day-loft-south.png",
    "storage-unit/east": "based-storageunit/final/ray.storageunit-east-complete/day-walkway-site-wall.png",
    "storage-unit/south": "based-storageunit/final/ray.storageunit-south-complete/day-south-room.png",
    "storage-unit/bay": "based-storageunit/final/ray.storageunit-bay-complete/day-hall-north.png",
    "sweatshop/before": "based-sweatshop/none/north-high.png",
    "sweatshop/after": "based-sweatshop/dock/north-high.png",
    "sweatshop/wing": "based-sweatshop/complete/wing-room.png",
    "sweatshop/dock": "based-sweatshop/dock/dock-high.png",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", required=True)
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    only = [v for v in a.only.split(",") if v]
    failed = 0
    for name, rel in SOURCES.items():
        if only and name not in only:
            continue
        src = os.path.join(a.shots, rel)
        dest = os.path.join(OUT, name + ".webp")
        try:
            image = Image.open(src).convert("RGB")
        except OSError as e:
            failed += 1
            print("FAIL %s: cannot read %s (%s)" % (name, src, e))
            continue
        if image.size[0] * 9 != image.size[1] * 16:
            print("WARN %s: %s is %dx%d, not 16:9; it is stretched" % (name, rel, *image.size))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        image.resize(SIZE, Image.LANCZOS).save(dest, "WEBP", quality=80, method=6)
        print("PASS %s <- %s (%d KB)" % (name, rel, os.path.getsize(dest) // 1024))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
