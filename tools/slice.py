#!/usr/bin/env python3
"""
Character-sheet slicer for TURUNCU KRAMPON.

Takes an AI-generated character sheet (poses in one horizontal row on a
white background), removes the background, splits the poses apart, trims
each one, normalizes height, and writes them into the game's asset paths.

Usage:
    python tools/slice.py SHEET.png OUT_DIR NAME1 NAME2 [NAME3 ...]

Example (kicker sheet for the black-white skin):
    python tools/slice.py sheet_bw_kicker.png src/assets/chars/bw \\
        kicker_idle kicker_run_a kicker_run_b kicker_kick celebrate

Example (keeper sheet):
    python tools/slice.py sheet_bw_keeper.png src/assets/chars/bw \\
        keeper_idle keeper_dive keeper_save keeper_sad

Requirements:
    pip install rembg pillow onnxruntime

Notes:
  - Output names are given in LEFT-TO-RIGHT order of the poses on the sheet.
  - The number of names must match the number of poses detected; if it
    doesn't, the script tells you what it found so you can retry.
  - keeper_save may contain a ball hugged against the chest — that is part
    of the sprite by design and slices fine.
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow eksik: pip install pillow")

TARGET_HEIGHT = 1024
# A column is "empty" when fewer than this fraction of its pixels are opaque.
EMPTY_COL_ALPHA_FRACTION = 0.002
# Ignore gaps narrower than this (pixels) — they're inside a single pose.
MIN_GAP_WIDTH = 12
# Ignore segments narrower than this — they're specks, not poses.
MIN_POSE_WIDTH = 40


def remove_background(img: Image.Image) -> Image.Image:
    """White/solid background -> transparent, via rembg."""
    try:
        from rembg import remove
    except ImportError:
        sys.exit("rembg eksik: pip install rembg onnxruntime")
    return remove(img).convert("RGBA")


def column_occupancy(img: Image.Image) -> list[float]:
    """Fraction of opaque pixels per column."""
    alpha = img.getchannel("A")
    w, h = img.size
    data = alpha.load()
    occ = []
    for x in range(w):
        count = 0
        for y in range(0, h, 4):  # sample every 4th row for speed
            if data[x, y] > 16:
                count += 1
        occ.append(count / (h / 4))
    return occ


def find_segments(occ: list[float]) -> list[tuple[int, int]]:
    """Split into [start, end) column ranges separated by empty gaps."""
    segments = []
    in_seg = False
    start = 0
    for x, v in enumerate(occ):
        filled = v > EMPTY_COL_ALPHA_FRACTION
        if filled and not in_seg:
            in_seg = True
            start = x
        elif not filled and in_seg:
            in_seg = False
            segments.append((start, x))
    if in_seg:
        segments.append((start, len(occ)))

    # merge segments separated by tiny gaps
    merged = []
    for seg in segments:
        if merged and seg[0] - merged[-1][1] < MIN_GAP_WIDTH:
            merged[-1] = (merged[-1][0], seg[1])
        else:
            merged.append(list(seg))
    return [(a, b) for a, b in merged if b - a >= MIN_POSE_WIDTH]


def slice_sheet(sheet_path: Path, out_dir: Path, names: list[str]) -> None:
    print(f"Okunuyor: {sheet_path}")
    img = Image.open(sheet_path).convert("RGBA")

    print("Arka plan temizleniyor (rembg, ilk çalıştırmada model indirir)...")
    img = remove_background(img)

    print("Pozlar tespit ediliyor...")
    occ = column_occupancy(img)
    segments = find_segments(occ)
    print(f"  {len(segments)} poz bulundu, {len(names)} isim verildi.")

    if len(segments) != len(names):
        widths = [b - a for a, b in segments]
        sys.exit(
            f"HATA: {len(names)} isim verildi ama {len(segments)} poz bulundu "
            f"(genişlikler: {widths}). Sheet'i kontrol et veya isim sayısını düzelt."
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    for (x0, x1), name in zip(segments, names):
        pose = img.crop((x0, 0, x1, img.height))
        bbox = pose.getbbox()
        if bbox:
            pose = pose.crop(bbox)
        scale = TARGET_HEIGHT / pose.height
        pose = pose.resize(
            (max(1, round(pose.width * scale)), TARGET_HEIGHT),
            Image.LANCZOS,
        )
        out_path = out_dir / f"{name}.png"
        pose.save(out_path)
        print(f"  yazıldı: {out_path}  ({pose.width}x{pose.height})")

    print("Bitti.")


def main() -> None:
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    sheet = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    names = sys.argv[3:]
    if not sheet.exists():
        sys.exit(f"Dosya yok: {sheet}")
    slice_sheet(sheet, out_dir, names)


if __name__ == "__main__":
    main()
