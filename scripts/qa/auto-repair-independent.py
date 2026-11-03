"""Independent test oracle: Python stdlib zipfile + ElementTree, no app parser/normalizer imports."""
import json
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

root = Path("docs/auto-repair/synthetic-artifacts")
manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
count = {"xml_parts_parsed": 0, "cells_compared": 0, "patches_checked": 0, "unchanged_parts_equal": 0, "formula_cells_unchanged": 0}

def parse(data):
    count["xml_parts_parsed"] += 1
    return ET.fromstring(data)

def workbook(z):
    shared = parse(z.read("xl/sharedStrings.xml"))
    strings = ["".join(n.itertext()) for si in shared for n in [si]]
    rels = {n.attrib["Id"]: n.attrib["Target"] for n in parse(z.read("xl/_rels/workbook.xml.rels"))}
    wb = parse(z.read("xl/workbook.xml"))
    out = {}
    for sheet in wb.find("m:sheets", ns):
        path = "xl/" + rels[sheet.attrib["{" + ns["r"] + "}id"]]
        tree = parse(z.read(path))
        cells = {}
        for row in tree.findall("m:sheetData/m:row", ns):
            for cell in row:
                kind = cell.attrib.get("t", "n")
                value = cell.findtext("m:v", default="", namespaces=ns)
                if kind == "s":
                    assert value.isdigit() and int(value) < len(strings)
                    value = strings[int(value)]
                elif kind == "inlineStr":
                    value = "".join(n.text or "" for n in cell.findall(".//m:t", ns))
                formula = cell.find("m:f", ns)
                cells[cell.attrib["r"]] = (dict(cell.attrib), value, ET.tostring(formula) if formula is not None else None, dict(row.attrib))
        out[sheet.attrib["name"]] = (path, cells)
    return out

def ref(col, row):
    name = ""
    col += 1
    while col:
        col, remainder = divmod(col - 1, 26)
        name = chr(65 + remainder) + name
    return name + str(row)

with ZipFile(root / "original.xlsx") as a, ZipFile(root / "repaired.xlsx") as b:
    assert a.testzip() is None and b.testzip() is None
    assert sorted(a.namelist()) == sorted(b.namelist())
    for part in a.namelist():
        if part.endswith((".xml", ".rels")):
            parse(a.read(part))
            parse(b.read(part))
    before, after = workbook(a), workbook(b)
    patches = {(p["sheet"], ref(p["col"], p["row"])): p for p in manifest["patches"]}
    touched = {before[p["sheet"]][0] for p in manifest["patches"]}
    for part in a.namelist():
        if part not in touched:
            assert a.read(part) == b.read(part), part
            count["unchanged_parts_equal"] += 1
    for sheet, (_, cells) in before.items():
        other = after[sheet][1]
        assert set(cells) == set(other)
        for address, original in cells.items():
            count["cells_compared"] += 1
            current = other[address]
            patch = patches.get((sheet, address))
            if patch:
                assert current[1] == patch["value"], address
                assert {k: v for k, v in original[0].items() if k != "t"} == {k: v for k, v in current[0].items() if k != "t"}
                assert current[2] is None
                count["patches_checked"] += 1
            else:
                assert original == current, address
                count["formula_cells_unchanged"] += int(original[2] is not None)
    assert count["patches_checked"] == len(patches)
print(json.dumps({"oracle": "Python zipfile + ElementTree", "ok": True, **count}))
