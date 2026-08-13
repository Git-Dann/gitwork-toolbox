#!/usr/bin/env python3
"""Extract every tab of the AI tools workbook into plain JSON rows.

Source: data/source/ai-tools-and-links.xlsx (exported from the Google Sheet).
Output: data/source/workbook-sheets.json  ->  { "<tab name>": [[cell, ...], ...] }

Stdlib only, so it runs anywhere. Re-run this after re-exporting the sheet:

    python3 scripts/extract-workbook.py
"""

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
RELS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"m": MAIN, "r": RELS}

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "data" / "source" / "ai-tools-and-links.xlsx"
OUT = ROOT / "data" / "source" / "workbook-sheets.json"


def column_index(ref: str) -> int:
    letters = re.match(r"([A-Z]+)", ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1


def text_of(el) -> str:
    return "".join(t.text or "" for t in el.iter(f"{{{MAIN}}}t"))


def main() -> None:
    z = zipfile.ZipFile(XLSX)

    shared = [text_of(si) for si in ET.fromstring(z.read("xl/sharedStrings.xml"))]
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    workbook = ET.fromstring(z.read("xl/workbook.xml"))

    sheets = {}
    for sheet in workbook.find("m:sheets", NS):
        name = sheet.get("name")
        target = rels[sheet.get(f"{{{RELS}}}id")].lstrip("/").replace("xl/", "")
        xml = ET.fromstring(z.read(f"xl/{target}"))

        rows = []
        for row in xml.iter(f"{{{MAIN}}}row"):
            cells = {}
            for cell in row:
                ref = cell.get("r") or ""
                value = cell.find("m:v", NS)
                inline = cell.find("m:is", NS)
                if cell.get("t") == "s" and value is not None:
                    raw = shared[int(value.text)]
                elif inline is not None:
                    raw = text_of(inline)
                elif value is not None:
                    raw = value.text or ""
                else:
                    raw = ""
                cells[column_index(ref)] = raw.strip()
            if cells:
                rows.append([cells.get(i, "") for i in range(max(cells) + 1)])
        sheets[name] = rows
        print(f"{name}: {len(rows)} rows")

    OUT.write_text(json.dumps(sheets, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
