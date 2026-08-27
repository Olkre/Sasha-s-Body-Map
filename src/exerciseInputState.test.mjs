import assert from "node:assert/strict";
import test from "node:test";

import {
  getAutocompleteSuggestions,
  getAutocompleteSuggestion,
  shouldClearBodyMapForInputChange,
} from "./exerciseInputState.ts";

test("editing a fresh exercise name leaves the initial body map still", () => {
  assert.equal(shouldClearBodyMapForInputChange("idle", true), false);
});

test("editing a completed exercise clears its active body map", () => {
  assert.equal(shouldClearBodyMapForInputChange("complete", true), true);
});

test("autocomplete uses the first existing exercise whose name starts with the input", () => {
  const suggestion = getAutocompleteSuggestion("press", [
    { name: "Arnold Press" },
    { name: "Press Behind Neck" },
  ]);

  assert.equal(suggestion?.name, "Press Behind Neck");
  assert.equal(getAutocompleteSuggestion("press", [{ name: "Arnold Press" }]), null);
});

test("autocomplete returns all matching prefix exercises for mobile suggestions", () => {
  const suggestions = getAutocompleteSuggestions("press", [
    { name: "Arnold Press" },
    { name: "Press Behind Neck" },
    { name: "Press Up" },
  ]);

  assert.deepEqual(suggestions.map(({ name }) => name), ["Press Behind Neck", "Press Up"]);
});
