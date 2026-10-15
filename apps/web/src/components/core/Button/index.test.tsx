import { expect, test } from "vitest";
import { render, screen } from "@test/render";
import { Button } from "./index";

test("C4 / S19 a button whose request is running cannot be pressed again", () => {
  render(<Button loading>Șterge definitiv</Button>);
  expect(
    screen.getByRole("button", { name: "Șterge definitiv" }),
  ).toBeDisabled();
});
