import { test } from "node:test";
import assert from "node:assert/strict";
import { dockToRestore } from "../src/utils/sidebarDock.ts";

test("keeps the user's visible dock modes", () => {
  assert.equal(dockToRestore("docked"), "docked");
  assert.equal(dockToRestore("auto"), "auto");
});

test("never captures a hidden dock as the original", () => {
  assert.equal(dockToRestore("always_hidden"), "docked");
});

test("falls back to docked when hass has no value", () => {
  assert.equal(dockToRestore(undefined), "docked");
  assert.equal(dockToRestore(""), "docked");
});
