import assert from "node:assert/strict";
import test from "node:test";

import {
  BREATHING_DURATION_DEFAULT,
  BREATHING_MAX_SCALE_DEFAULT,
  BREATHING_TRANSPARENCY_DEFAULT,
  getBreathingDelay,
  getBreathingConfig,
  getBreathingEasing,
  getBreathingSpreadStrength,
} from "./breathingState.ts";

const approximatelyEqual = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 0.000001);

test("default breathing stays inside a subtle motion envelope", () => {
  const config = getBreathingConfig(
    BREATHING_MAX_SCALE_DEFAULT,
    BREATHING_TRANSPARENCY_DEFAULT,
    BREATHING_DURATION_DEFAULT,
  );

  approximatelyEqual(config.scaleDelta, 0.041);
  assert.equal(config.minOpacity, 0.4);
  assert.equal(config.duration, 2700);
});

test("maximum breathing controls expose the expanded effect range", () => {
  const config = getBreathingConfig(1.1, 60, 5000);

  approximatelyEqual(config.scaleDelta * 2, 0.2);
  assert.equal(config.minOpacity, 0.4);
});

test("neutral controls return a visually static breathing cycle", () => {
  const config = getBreathingConfig(1, 0, 3600);

  assert.equal(config.scaleDelta, 0);
  assert.equal(config.minOpacity, 1);
});

test("breathing controls clamp values to their safe ranges", () => {
  const config = getBreathingConfig(2, 100, 9000);

  approximatelyEqual(config.scaleDelta, 0.1);
  assert.equal(config.minOpacity, 0.4);
  assert.equal(config.duration, 5000);
});

test("breathing phase travels from the top of the body to the bottom", () => {
  const topDelay = getBreathingDelay(0, 3600, 520);
  const bottomDelay = getBreathingDelay(520, 3600, 520);

  assert.ok(topDelay < bottomDelay, "the top path must lead the bottom path");
});

test("spread breathing synchronizes every path instead of traveling top to bottom", () => {
  const topDelay = getBreathingDelay(0, 3600, 520, true);
  const middleDelay = getBreathingDelay(260, 3600, 520, true);
  const bottomDelay = getBreathingDelay(520, 3600, 520, true);

  assert.equal(topDelay, 0);
  assert.equal(middleDelay, 0);
  assert.equal(bottomDelay, 0);
});

test("breathing spread strength is independent and clamped to its own range", () => {
  assert.equal(getBreathingSpreadStrength(8), 8);
  assert.equal(getBreathingSpreadStrength(-20), 0);
  assert.equal(getBreathingSpreadStrength(200), 40);
});

test("breathing easing only accepts the supported motion tokens", () => {
  assert.equal(getBreathingEasing("smooth"), "smooth");
  assert.equal(getBreathingEasing("easeOut"), "easeOut");
  assert.equal(getBreathingEasing("linear"), "linear");
  assert.equal(getBreathingEasing("steps(2)"), "linear");
});
