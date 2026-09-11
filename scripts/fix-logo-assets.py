"""Restore original black pear TippyMe logos (no purple squircle)."""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
REF = Path(
    r"C:\Users\Iyanu\.cursor\projects\c-Users-Iyanu-OneDrive-Desktop-Cheer"
    r"\assets\c__Users_Iyanu_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"501c239e0809d8222b05aee35a267fad_images_image-2207027b-9e75-41e6-99c0-2bebf29113cc.png"
)


def git_blob(commit: str, path: str) -> bytes:
    return subprocess.check_output(["git", "show", f"{commit}:{path}"], cwd=ROOT)


def is_bg(pixel: tuple[int, int, int, int], thr: int = 248) -> bool:
    r, g, b, a = pixel
    return a < 16 or (r >= thr and g >= thr and b >= thr)


def content_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    px = img.load()
    w, h = img.size
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if not is_bg(px[x, y]):
                minx = min(minx, x)
                maxx = max(maxx, x)
                miny = min(miny, y)
                maxy = max(maxy, y)
    if maxx < 0:
        raise SystemExit("No content")
    return minx, miny, maxx, maxy


def to_transparent(img: Image.Image, thr: int = 248) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_bg((r, g, b, a), thr):
                continue
            op[x, y] = (r, g, b, a)
    return out


def tight_crop(img: Image.Image, pad: int = 1) -> Image.Image:
    minx, miny, maxx, maxy = content_bbox(img)
    minx = max(0, minx - pad)
    miny = max(0, miny - pad)
    maxx = min(img.size[0] - 1, maxx + pad)
    maxy = min(img.size[1] - 1, maxy + pad)
    return img.crop((minx, miny, maxx + 1, maxy + 1))


def load_git_png(commit: str, path: str) -> Image.Image:
    data = git_blob(commit, path)
    tmp = PUBLIC / "_tmp_restore.png"
    tmp.write_bytes(data)
    im = Image.open(tmp).convert("RGBA")
    return im


def extract_text_from_ref(ref: Image.Image) -> Image.Image:
    src = to_transparent(ref)
    px = src.load()
    w, h = src.size
    cols = [any(not is_bg(px[x, y]) for y in range(h)) for x in range(w)]
    runs: list[tuple[int, int]] = []
    start = None
    for x in range(w):
        if cols[x] and start is None:
            start = x
        elif not cols[x] and start is not None:
            runs.append((start, x - 1))
            start = None
    if start is not None:
        runs.append((start, w - 1))
    if len(runs) < 2:
        raise SystemExit(f"Could not split reference logo runs={runs}")
    text = tight_crop(src.crop((runs[1][0], 0, runs[-1][1] + 1, h)))
    return text


def compose_wordmark(mark: Image.Image, text: Image.Image, gap: int, pad: int = 4) -> Image.Image:
    # Optical vertical center: align centers
    logo_h = max(mark.size[1], text.size[1]) + pad * 2
    logo_w = pad + mark.size[0] + gap + text.size[0] + pad
    logo = Image.new("RGBA", (logo_w, logo_h), (0, 0, 0, 0))
    logo.paste(mark, (pad, (logo_h - mark.size[1]) // 2), mark)
    logo.paste(text, (pad + mark.size[0] + gap, (logo_h - text.size[1]) // 2), text)
    return logo


def main() -> None:
    # Original black pear mark from pre-purple branding
    candidates = [
        ("f031cec", "public/cheers-logo.png"),
        ("f031cec", "public/cheers-logo-nav.png"),
        ("9eaf2ca", "apps/web/public/cheers-logo.png"),
        ("9eaf2ca", "apps/web/public/cheers-logo-nav.png"),
    ]
    mark_src: Image.Image | None = None
    for commit, path in candidates:
        try:
            im = load_git_png(commit, path)
            print(f"loaded {commit}:{path} {im.size}")
            # Prefer square-ish icon assets
            if mark_src is None or (im.size[0] <= 64 and im.size[1] <= 64):
                mark_src = im
                if im.size[0] <= 64 and im.size[1] <= 64 and abs(im.size[0] - im.size[1]) < 20:
                    break
        except Exception as e:
            print(f"skip {commit}:{path}: {e}")

    if mark_src is None:
        raise SystemExit("Could not load original pear mark from git")

    mark = tight_crop(to_transparent(mark_src))
    print("mark cropped", mark.size)

    # Text from the user's reference wordmark
    ref = Image.open(REF).convert("RGBA")
    text = extract_text_from_ref(ref)
    print("text", text.size)

    # Scale mark and text to a shared display height (~96px for retina)
    target_h = 96
    mark_hi = mark.resize(
        (max(1, round(mark.size[0] * target_h / mark.size[1])), target_h),
        Image.Resampling.LANCZOS,
    )
    text_hi = text.resize(
        (max(1, round(text.size[0] * (target_h * 0.72) / text.size[1])), round(target_h * 0.72)),
        Image.Resampling.LANCZOS,
    )
    # Wordmark: pear height ~ matches capital letter height (text a bit shorter than full pear)
    # Re-scale mark slightly shorter so pear optical center matches text better
    mark_for_wm = mark.resize(
        (max(1, round(mark.size[0] * 72 / mark.size[1])), 72),
        Image.Resampling.LANCZOS,
    )
    text_for_wm = text.resize(
        (max(1, round(text.size[0] * 56 / text.size[1])), 56),
        Image.Resampling.LANCZOS,
    )
    wordmark = compose_wordmark(mark_for_wm, text_for_wm, gap=18, pad=6)

    mark_hi.save(PUBLIC / "cheers-logo-nav.png", optimize=True)
    mark_hi.save(PUBLIC / "tippyme-mark.png", optimize=True)
    wordmark.save(PUBLIC / "tippyme-logo.png", optimize=True)
    wordmark.save(PUBLIC / "cheers-logo.png", optimize=True)

    # Preserve originals for regeneration
    mark.save(PUBLIC / "tippyme-logo.source.png", optimize=True)

    tmp = PUBLIC / "_tmp_restore.png"
    if tmp.exists():
        tmp.unlink()

    for path in (
        PUBLIC / "cheers-logo-nav.png",
        PUBLIC / "tippyme-mark.png",
        PUBLIC / "tippyme-logo.png",
    ):
        im = Image.open(path)
        print(path.name, im.size, "corner", im.getpixel((0, 0)))


if __name__ == "__main__":
    main()
