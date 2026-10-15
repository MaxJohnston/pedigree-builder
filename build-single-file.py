#!/usr/bin/env python3
"""Join index.html, css/ and js/ into one self-contained file.

The result, dist/pedigree-builder.html, works on its own: download it, double-click it,
and it opens in the browser with no other files needed.

Usage (from the project folder):
    python3 tools/build-single-file.py
Needs only Python 3; no packages to install.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "index.html"
OUT = ROOT / "dist" / "pedigree-builder.html"


def read(rel):
    path = ROOT / rel
    if not path.is_file():
        sys.exit(f"Missing file referenced by index.html: {rel}")
    return path.read_text(encoding="utf-8")


def main():
    html = SRC.read_text(encoding="utf-8")

    def inline_css(m):
        return "<style data-pb>\n" + read(m.group(1)).rstrip() + "\n</style>"

    def inline_js(m):
        code = read(m.group(1))
        # A literal "</script" inside the code would end the inline <script> early.
        code = re.sub(r"</(script)", r"<\\/\1", code, flags=re.I)
        return "<script data-pb>\n" + code.rstrip() + "\n</script>"

    html, n_css = re.subn(r'<link rel="stylesheet" href="((?!https?:)[^"]+\.css)"(?: data-pb)?>', inline_css, html)
    html, n_js = re.subn(r'<script src="((?!https?:)[^"]+\.js)"(?: data-pb)?></script>', inline_js, html)

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    size = OUT.stat().st_size / 1024
    print(f"Built {OUT.relative_to(ROOT)} ({size:.0f} KB) from {n_css} stylesheet(s) and {n_js} script(s).")


if __name__ == "__main__":
    main()
