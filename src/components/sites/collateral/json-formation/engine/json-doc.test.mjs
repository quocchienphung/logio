import { test } from "node:test";
import assert from "node:assert/strict";
import { COPY_LIMIT, childrenOf, resolve, rootInfo, searchDocument, textOf } from "./json-doc.ts";

const report = { KB001: "20260930", KB002: "A", CNTCTD: [{ TTC01: "00000001", KHACHHANG: [{ TTC03: "C1", THONGTINBD: [{ TS001: "X1", TS013: "Ke hoach" }, { TS001: "X2", TS013: "Hang hoa" }] }] }] };

test("the root and a page of children carry what a row needs, and a path that matches the viewer's", () => {
  assert.equal(rootInfo(report, "report").count, 3); assert.equal(rootInfo(report, "report").path, "report");
  const kids = childrenOf(report, "report", [], 0, 10);
  assert.deepEqual(kids.map(k => k.path), ["report.KB001", "report.KB002", "report.CNTCTD"]);
  assert.equal(kids[2].preview, "[…]"); assert.equal(kids[0].text, '"20260930"');
  const assets = childrenOf(report, "report", ["CNTCTD", "0", "KHACHHANG", "0", "THONGTINBD"], 1, 2);
  assert.equal(assets.length, 1); assert.equal(assets[0].path, "report.CNTCTD[0].KHACHHANG[0].THONGTINBD[1]"); assert.equal(assets[0].key, "1"); assert.equal(assets[0].isIndex, true);
  assert.equal(childrenOf(report, "report", ["KB001"], 0, 5).length, 0, "a primitive has no children");
});

test("a search finds keys and values, and tells the keys to walk to each hit", () => {
  const found = searchDocument(report, "report", "hang hoa");
  assert.equal(found.hits.length, 1);
  assert.deepEqual(found.hits[0].trail.map(s => s.key), ["CNTCTD", "0", "KHACHHANG", "0", "THONGTINBD", "1", "TS013"]);
  assert.equal(found.hits[0].path, "report.CNTCTD[0].KHACHHANG[0].THONGTINBD[1].TS013");
  assert.equal(resolve(report, found.hits[0].trail.map(s => s.key)), "Hang hoa");
});

test("copy: the text of a value, and a refusal above the limit", () => {
  assert.equal(textOf(report, ["KB001"]), "20260930");
  assert.ok(textOf(report, ["CNTCTD", "0"]).includes('"TTC01": "00000001"'));
  const huge = { a: "x".repeat(COPY_LIMIT + 10) };
  assert.equal(textOf(huge, ["a"]), null); assert.equal(textOf(huge, []), null);
});
