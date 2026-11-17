"""Fixed day views of a Based base for its docs page: vanilla, then each finished stage, from the same cameras.

Every stage is shot from the same camera poses, so a before/after pair differs only in what was built. Before the
shots the weather is set to clear, an open phone app is closed, and before every view the time is set to 12:00. The game lights the sky and the ambient light from where
the player stands (indoors it blends to the room's own sky), not from the free camera, so before each view the
player is moved to that view's stand point: outdoors for outside views, in the room for inside views.

Needs a test slot with a Debug build of Based (the `baseddiag` console command) and a fresh save, because the
stage jumps only go forward. Prints PASS/FAIL per step and copies each image to OUT/<base>/<stage>/<view>.png.

usage: base-shots.py --slot mptest4 --base sweatshop --out <folder> [--stages none,complete] [--only view,view]
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

S1 = os.environ.get("S1_PY", r"F:\Projects\Mods\Schedule1\Workspace\tools\bridge\s1.py")

# Views: name -> (eye x y z, target x y z, field of view, stand x y z). World metres.
# Stages: name -> console command that moves the build there and the log line that proves it; None for vanilla.
BASES = {
    "sweatshop": {
        # The Sweatshop floor is y -0.25, the yard behind the restaurant y -3.9.
        "views": {
            "north-high": ((-57, 10, 153), (-57.5, -2, 143), 60, (-63, -3.6, 148)),
            "dock-high": ((-56.5, 12, 151.5), (-58.8, -3, 146.2), 42, (-63, -3.6, 148)),
            "wing-room": ((-54.6, 1.6, 144.6), (-59.5, 0.8, 137), 70, (-54.5, 0, 144.8)),
            "inside-east": ((-64.3, 1.6, 136.3), (-55, 1.0, 143), 70, (-64.5, 0, 135.4)),
            # Down at a slant from above the east roof edge, so the dock marking fills the frame and the roof only a corner.
            "dock-yard": ((-55, 2.5, 151), (-56.3, -3.9, 148.6), 36, (-53, -3.6, 151)),
            # From the yard: the wing stands on the low building behind the restaurant, so it fills the upper half.
            "wing-yard": ((-57, -2, 151), (-57, 0.5, 142), 60, (-57, -3.6, 151)),
        },
        "stages": {
            "none": (["baseddiag", "phase", "none"], "construction moved to"),
            "complete": (["baseddiag", "phase", "complete"], "construction moved to"),
            "dock": (["baseddiag", "dockroute", "build"], "wing and loading dock complete"),
        },
    },
    "storage": {
        # The hall floor is y 0.1, the upper floor y 3.25; the grass west of the building is about y 0.2.
        "views": {
            "west-high": ((-22, 7, 92), (-9.5, 3, 104), 55, (-16, 0.5, 96)),
            # From z 103 the overpass pillar stands beside the stair foot instead of across the stair and landing.
            "stair-side": ((-15.5, 3.2, 103), (-9.8, 3, 102.3), 75, (-16, 0.5, 96)),
            "door-front": ((-14, 4.5, 105.5), (-9, 4.4, 105.5), 70, (-16, 0.5, 96)),
            "south-high": ((-3, 8, 80), (-3, 3, 97), 60, (-6, 0.5, 86)),
            "roof-sw": ((-1, 26, 80), (-3, 6, 104), 60, (-6, 0.5, 86)),
            "roof-ne": ((14, 18, 126), (-3, 6, 104), 60, (-6, 0.5, 86)),
            "loft-south": ((-3, 4.9, 113.3), (-8.2, 4, 105.2), 70, (-3, 3.5, 113.6)),
            "loft-east": ((-7.5, 4.9, 109), (3, 4.3, 109), 70, (-8.4, 3.5, 109)),
            "east-room": ((2.9, 4.9, 113.4), (-2, 4, 104.5), 70, (3.0, 3.5, 113.6)),
            "south-room": ((2.9, 4.9, 94.4), (-1.5, 4, 101.5), 70, (3.0, 3.5, 94.2)),
            "hall-bays": ((-5.3, 2.2, 93.9), (-5.3, 0.3, 101.5), 70, (-5.3, 0.4, 93.6)),
        },
        "stages": {
            "vanilla": None,
            "loft": (["baseddiag", "site=storageunit", "phase", "ray.storageunit-loft:complete"], "construction moved to"),
            "east": (["baseddiag", "site=storageunit", "phase", "ray.storageunit-east:complete"], "construction moved to"),
            "south": (["baseddiag", "site=storageunit", "phase", "ray.storageunit-south:complete"], "construction moved to"),
            "bay": (["baseddiag", "site=storageunit", "phase", "ray.storageunit-bay:complete"], "construction moved to"),
        },
    },
}


def s1(slot, *args):
    out = subprocess.run([sys.executable, S1, "--slot", slot, *args], capture_output=True, text=True)
    return out.returncode, (out.stdout + out.stderr).strip()


def step(name, ok, detail):
    print("%s %s: %s" % ("PASS" if ok else "FAIL", name, detail[-400:]))
    return ok


def prepare(slot, time):
    """Clear weather, the requested time and the phone put away; every later shot depends on all three."""
    # `s1.py run` exits non-zero on any error line in the command's frames, also from other mods; the command is
    # judged by its own log line.
    _, text = s1(slot, "run", "--until", "Setting weather|No weather sequence", "setweather", "clear")
    if not step("weather clear", "Setting weather" in text and "No weather sequence" not in text, text):
        return False
    code, text = s1(slot, "time", time)
    if not step("time %s" % time, code == 0, text):
        return False
    sys.path.insert(0, os.path.dirname(S1))
    import s1 as bridge
    game = bridge.Game(slot)
    # An open Sideload app keeps a "Rotate Phone" hint on screen even with the phone lowered and the HUD hidden, so
    # the app is closed with the phone's own home button first.
    try:
        game.call("phone", {"open": True})
    except Exception as e:  # the bridge raises its own types for a dead game and a busy main thread
        return step("phone up", False, str(e))
    _, text = s1(slot, "run", "--until", "sideloadhome:", "sideloadhome")
    line = next((l for l in text.splitlines() if "sideloadhome:" in l), text)
    # "nothing closed (app on screen: none" means there was no app to close, which is just as good.
    if not step("app closed", "PASS" in line or "app on screen: none" in line, line):
        return False
    try:
        answer = game.call("phone", {"open": False})
    except Exception as e:
        return step("phone away", False, str(e))
    return step("phone away", True, json.dumps(answer)[:200])


def jump(slot, stage, spec):
    if spec is None:
        return step("stage %s" % stage, True, "vanilla, no command")
    command, proof = spec
    _, text = s1(slot, "run", "--until", proof + "|baseddiag: .*(fail|rror)", *command)
    return step("stage %s" % stage, proof in text, text)


def shoot(slot, views, out, only, time):
    failed = 0
    for name, (eye, target, fov, stand) in views.items():
        if only and name not in only:
            continue
        code, text = s1(slot, "tp", *map(str, stand))
        if not step("%s stand" % name, code == 0, text):
            failed += 1
            continue
        # Game time runs on during a long run and moves the sun; every view is shot at the same time of day, so a
        # before/after pair differs only in what was built.
        code, text = s1(slot, "time", time)
        if not step("%s time %s" % (name, time), code == 0, text):
            failed += 1
            continue
        code, text = s1(slot, "cam", "shot", "--eye", *map(str, eye), "--target", *map(str, target),
                        "--fov", str(fov), "--hud", "hide", "--settle", "45")
        try:
            path = json.loads(text)["path"]
        except (ValueError, KeyError) as e:
            path = ""
            text = "no path in cam output (%s): %s" % (e, text)
        if code != 0 or not os.path.isfile(path):
            failed += 1
            step(name, False, text)
            continue
        dest = os.path.join(out, name + ".png")
        shutil.copyfile(path, dest)
        step(name, True, dest)
    return failed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slot", required=True)
    ap.add_argument("--base", required=True, choices=sorted(BASES))
    ap.add_argument("--out", required=True)
    ap.add_argument("--stages", default="")
    ap.add_argument("--only", default="")
    ap.add_argument("--time", default="1200")
    a = ap.parse_args()
    base = BASES[a.base]
    stages = [s for s in a.stages.split(",") if s] or list(base["stages"])
    only = [v for v in a.only.split(",") if v]
    unknown = [s for s in stages if s not in base["stages"]]
    if unknown:
        step("stages", False, "unknown for %s: %s" % (a.base, ", ".join(unknown)))
        sys.exit(2)
    if not prepare(a.slot, a.time):
        sys.exit(1)
    failed = 0
    try:
        for stage in stages:
            if not jump(a.slot, stage, base["stages"][stage]):
                failed += 1
                continue
            folder = os.path.join(a.out, a.base, stage)
            os.makedirs(folder, exist_ok=True)
            failed += shoot(a.slot, base["views"], folder, only, a.time)
    finally:
        code, text = s1(a.slot, "cam", "release")
        if code != 0:
            step("cam release", False, text)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
