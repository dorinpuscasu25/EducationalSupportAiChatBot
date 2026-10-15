import { expect, test } from "vitest";
import { safeRedirect } from "./redirect";

test("AUTH-05 with redirect: only paths inside the app are followed", () => {
  expect(safeRedirect("/settings")).toBe("/settings");
  expect(safeRedirect("/sessions?chatId=c1")).toBe("/sessions?chatId=c1");
  expect(safeRedirect("https://evil.example/login")).toBeUndefined();
  expect(safeRedirect("//evil.example")).toBeUndefined();
  expect(safeRedirect("/\\evil.example")).toBeUndefined();
  expect(safeRedirect("javascript:alert(1)")).toBeUndefined();
  expect(safeRedirect("")).toBeUndefined();
  expect(safeRedirect(undefined)).toBeUndefined();
});
