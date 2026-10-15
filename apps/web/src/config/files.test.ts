import assert from "node:assert/strict";
import { test } from "vitest";
import { isChatAttachment, isImageName, selectAttachments } from "./files";

test("accepts documents and screenshots, refuses other files", () => {
  const file = (name: string, type = "") => new File(["x"], name, { type });
  assert.equal(isChatAttachment(file("curs.pdf")), true);
  assert.equal(isChatAttachment(file("slides.pptx")), true);
  assert.equal(isChatAttachment(file("x", "image/png")), true);
  assert.equal(isChatAttachment(file("virus.exe")), false);
  assert.equal(isImageName("Screenshot.PNG"), true);
  assert.equal(isImageName("tema.docx"), false);
});

test("selectAttachments keeps valid files within the limit and explains the rest", () => {
  const file = (name: string, size = 10) =>
    new File([new Uint8Array(size)], name);
  const result = selectAttachments(
    [file("a.pdf"), file("b.exe"), file("c.png"), file("d.png")],
    3,
  );
  assert.deepEqual(
    result.accepted.map((f) => f.name),
    ["a.pdf", "c.png"],
  );
  assert.match(result.notice ?? "", /b\.exe/);
  assert.match(result.notice ?? "", /cel mult 5/);
});
