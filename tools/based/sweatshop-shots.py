"""Fixed day views of the Sweatshop for the Based base page: vanilla, each construction night, finished, with dock.

Every stage is shot from the same cameras, so the page can compare vanilla and finished from one place.
Needs a test slot running a Debug build of Based (the `baseddiag` console command) with the Sweatshop owned.
Prints PASS/FAIL per jump and per view and copies each image to OUT/<stage>/<view>.png.

usage: sweatshop-shots.py --slot mptest4 --out <folder> [--stages none,breakthrough,...] [--only view,view]
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

S1 = os.environ.get("S1_PY", r"F:\Projects\Mods\Schedule1\Workspace\tools\bridge\s1.py")

# name: (eye x y z, target x y z, field of view). World metres. The Sweatshop floor is y -0.25, the yard behind the
# restaurant y -3.9.
VIEWS = {
    # From above the yard behind the restaurant: the wing on the terrace, the dock below it in the yard.
    "north-high": ((-57, 10, 153), (-57.5, -2, 143), 60),
    "north-west-high": ((-63, 9, 154), (-57, -1.5, 143), 60),
    # Steep down onto the dock markings, from the air above the yard; a taller roof north of the yard hides it
    # from further out.
    "dock-high": ((-56.5, 12, 151.5), (-58.8, -3, 146.2), 42),
    "dock-west": ((-61.5, 9, 151.5), (-57, -4, 146), 60),
    # Inside: from the old room through the opened wall, and from the wing's north-east corner.
    "inside-east": ((-64.3, 1.6, 136.3), (-55, 1.0, 143), 70),
    "wing-room": ((-54.6, 1.6, 144.6), (-59.5, 0.8, 137), 70),
}

# stage: console command that moves the build there, and the log line that proves the move.
STAGES = {
    "none": (["baseddiag", "phase", "none"], "construction moved to"),
    "breakthrough": (["baseddiag", "phase", "breakthrough"], "construction moved to"),
    "frame": (["baseddiag", "phase", "frame"], "construction moved to"),
    "roof": (["baseddiag", "phase", "roof"], "construction moved to"),
    "complete": (["baseddiag", "phase", "complete"], "construction moved to"),
    "dock": (["baseddiag", "dockroute", "build"], "wing and loading dock complete"),
}


def s1(slot, *args):
    out = subprocess.run([sys.executable, S1, "--slot", slot, *args], capture_output=True, text=True)
    return out.returncode, (out.stdout + out.stderr).strip()


def jump(slot, stage):
    command, proof = STAGES[stage]
    # `s1.py run` exits non-zero on any error line in the command's frames, also from other mods; the jump is judged
    # by its own log line.
    _, text = s1(slot, "run", "--until", proof + "|baseddiag: .*(fail|rror)", *command)
    if proof not in text:
        print("FAIL jump %s: %s" % (stage, text[-600:]))
        return False
    print("PASS jump %s" % stage)
    return True


def pocket_phone(slot):
    """The phone opens on its own after a save loads and covers every shot; the bridge puts it away."""
    sys.path.insert(0, os.path.dirname(S1))
    import s1 as bridge
    try:
        answer = bridge.Game(slot).call("phone", {"open": False})
    except Exception as e:  # the bridge raises its own types for a dead game and a busy main thread
        print("FAIL phone away: %s" % e)
        return False
    print("PASS phone away: %s" % json.dumps(answer)[:200])
    return True


def shoot(slot, out, only):
    failed = 0
    for name, (eye, target, fov) in VIEWS.items():
        if only and name not in only:
            continue
        code, text = s1(slot, "cam", "shot", "--eye", *map(str, eye), "--target", *map(str, target),
                        "--fov", str(fov), "--hud", "hide", "--settle", "10")
        try:
            path = json.loads(text)["path"]
        except (ValueError, KeyError) as e:
            path = ""
            text = "no path in cam output (%s): %s" % (e, text)
        if code != 0 or not os.path.isfile(path):
            failed += 1
            print("FAIL %s: %s" % (name, text[-400:]))
            continue
        dest = os.path.join(out, name + ".png")
        shutil.copyfile(path, dest)
        print("PASS %s -> %s" % (name, dest))
    return failed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slot", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--stages", default=",".join(STAGES))
    ap.add_argument("--only", default="")
    ap.add_argument("--time", default="1200")
    a = ap.parse_args()
    only = [v for v in a.only.split(",") if v]
    code, text = s1(a.slot, "time", a.time)
    if code != 0:
        print("FAIL time %s: %s" % (a.time, text[-400:]))
        sys.exit(1)
    print("PASS time %s" % a.time)
    if not pocket_phone(a.slot):
        sys.exit(1)
    failed = 0
    try:
        for stage in [s for s in a.stages.split(",") if s]:
            if not jump(a.slot, stage):
                failed += 1
                continue
            os.makedirs(os.path.join(a.out, stage), exist_ok=True)
            failed += shoot(a.slot, os.path.join(a.out, stage), only)
    finally:
        code, text = s1(a.slot, "cam", "release")
        if code != 0:
            print("FAIL cam release: %s" % text[-400:])
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
