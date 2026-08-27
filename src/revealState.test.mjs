import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSIGNED_MUSCLE_IDS,
  createPathShockwaveSchedule,
  easeRevealProgress,
  getRevealEasing,
  getRevealDuration,
  getRevealPathState,
  getAssignmentOpacity,
  getAssignmentFill,
  getRevealTravelDelay,
  REVEAL_DURATION,
  SHOCKWAVE_BY_MUSCLE,
} from "./revealState.ts";

const GRAY = "#e6e6e6";
const PURPLE = "#9d91ff";

test("frame 0 is an untransformed gray body", () => {
  for (const muscleId of Object.keys(SHOCKWAVE_BY_MUSCLE).map(Number)) {
    assert.deepEqual(getRevealPathState(muscleId, 0), {
      scale: 1,
      transform: "scale(1)",
      opacity: 1,
      fill: GRAY,
    });
  }
});

test("the last frame is untransformed with only assigned muscles activated", () => {
  for (const muscleId of Object.keys(SHOCKWAVE_BY_MUSCLE).map(Number)) {
    const state = getRevealPathState(muscleId, REVEAL_DURATION);
    assert.equal(state.scale, 1);
    assert.equal(state.opacity, 1);
    assert.equal(state.fill, ASSIGNED_MUSCLE_IDS.has(muscleId) ? getAssignmentFill(muscleId) : GRAY);
  }
});

test("the shockwave squashes then rebounds from top to bottom", () => {
  const headAtImpact = getRevealPathState(0, 157);
  const chestBeforeImpact = getRevealPathState(2, 69);
  const chestAtImpact = getRevealPathState(2, 227);
  const calvesBeforeImpact = getRevealPathState(16, 519);
  const calvesAtImpact = getRevealPathState(16, 677);

  assert.ok(headAtImpact.scale < 1);
  assert.equal(chestBeforeImpact.scale, 1);
  assert.ok(chestAtImpact.scale < 1);
  assert.equal(calvesBeforeImpact.scale, 1);
  assert.ok(calvesAtImpact.scale < 1);

  assert.ok(getRevealPathState(0, 325).scale > 1);
  assert.ok(getRevealPathState(16, 845).scale > 1);
});

test("the rebound never exceeds the restrained 1.05 scale peak", () => {
  for (const muscleId of Object.keys(SHOCKWAVE_BY_MUSCLE).map(Number)) {
    for (let revealTime = 0; revealTime <= REVEAL_DURATION; revealTime += 1) {
      assert.ok(getRevealPathState(muscleId, revealTime).scale <= 1.05);
    }
  }
});

test("assigned muscles blend continuously toward their activation color", () => {
  const chestDelay = SHOCKWAVE_BY_MUSCLE[2].delay;
  const halfwayFromGrayToLavender = chestDelay + 560 * 0.14;
  const halfwayThroughColorBlend = chestDelay + 560 * 0.53;

  assert.equal(
    getRevealPathState(2, halfwayFromGrayToLavender).fill,
    "rgb(215 211 243)",
  );
  assert.equal(
    getRevealPathState(
      2,
      halfwayThroughColorBlend,
      SHOCKWAVE_BY_MUSCLE[2],
      { x: 0, y: 0 },
      14,
    ).fill,
    "rgb(180 171 254)",
  );
  assert.equal(getRevealPathState(2, chestDelay + 560 * 0.78).fill, "rgb(161 149 254)");
});

test("opacity follows scale displacement and returns to opaque", () => {
  const squash = getRevealPathState(0, 560 * 0.28);
  const rebound = getRevealPathState(0, 560 * 0.58);

  assert.ok(squash.opacity < rebound.opacity);
  assert.ok(rebound.opacity < 1);
  assert.equal(getRevealPathState(0, 0).opacity, 1);
  assert.equal(getRevealPathState(0, REVEAL_DURATION).opacity, 1);
});

test("assigned muscles settle at different color intensities", () => {
  assert.ok(getAssignmentOpacity(13) > getAssignmentOpacity(10));
  assert.ok(getAssignmentOpacity(10) > getAssignmentOpacity(16));
  assert.equal(getRevealPathState(13, REVEAL_DURATION).fill, PURPLE);
  assert.equal(getRevealPathState(16, REVEAL_DURATION).fill, "rgb(195 189 242)");
  assert.equal(getRevealPathState(16, REVEAL_DURATION).opacity, 1);
});

test("assigned muscles reach their activation color before the reveal settles", () => {
  for (const muscleId of ASSIGNED_MUSCLE_IDS) {
    const timing = SHOCKWAVE_BY_MUSCLE[muscleId];
    const darkColorFrame = getRevealPathState(
      muscleId,
      timing.delay + 560 * 0.79,
      timing,
    );
    assert.notEqual(darkColorFrame.fill, GRAY);
    assert.equal(darkColorFrame.opacity, 1 - Math.abs(1 - darkColorFrame.scale));
    assert.equal(
      getRevealPathState(muscleId, REVEAL_DURATION).fill,
      darkColorFrame.fill,
    );
  }
});

test("path mode gives each ab segment its own top-to-bottom timing", () => {
  const abs = Array.from({ length: 6 }, (_, index) => ({
    pathKey: `m10-p${index}`,
    muscleId: 10,
    centerX: index % 2,
    centerY: Math.floor(index / 2) * 20,
  }));
  const schedule = createPathShockwaveSchedule(abs);
  const delays = abs.map(({ pathKey }) => schedule[pathKey].delay);

  assert.equal(new Set(delays).size, 6);
  assert.deepEqual(delays, [...delays].sort((a, b) => a - b));
  assert.deepEqual(delays.slice(1).map((delay, index) => delay - delays[index]), [30, 30, 30, 30, 30]);
});

test("spread mode moves paths outward during impact and restores both endpoint frames", () => {
  const timing = SHOCKWAVE_BY_MUSCLE[10];
  const impactTime = timing.delay + 560 * 0.28;
  const left = getRevealPathState(10, impactTime, timing, { x: -1, y: 0 });
  const right = getRevealPathState(10, impactTime, timing, { x: 1, y: 0 });

  assert.ok(left.translateX < 0);
  assert.ok(right.translateX > 0);
  assert.equal(left.translateY, 0);
  assert.match(left.transform, /^translate\(-/);
  assert.equal(getRevealPathState(10, 0, timing, { x: -1, y: 0 }).transform, "scale(1)");
  assert.equal(getRevealPathState(10, REVEAL_DURATION, timing, { x: -1, y: 0 }).transform, "scale(1)");
});

test("spread strength scales displacement and clamps excessive values", () => {
  const timing = SHOCKWAVE_BY_MUSCLE[10];
  const impactTime = timing.delay + 560 * 0.28;
  const defaultSpread = getRevealPathState(10, impactTime, timing, { x: 1, y: 0 }, 14);
  const doubleSpread = getRevealPathState(10, impactTime, timing, { x: 1, y: 0 }, 28);
  const clampedSpread = getRevealPathState(10, impactTime, timing, { x: 1, y: 0 }, 400);

  assert.equal(doubleSpread.translateX, defaultSpread.translateX * 2);
  assert.equal(clampedSpread.translateX, timing.impact * 40);
});

test("reveal easing slows the travel schedule near calves without reshaping paths", () => {
  assert.equal(getRevealEasing("easeOut"), "easeOut");
  assert.equal(getRevealEasing("smooth"), "smooth");
  assert.equal(getRevealEasing("linear"), "linear");
  assert.equal(getRevealEasing("steps(3)"), "linear");

  assert.equal(easeRevealProgress(0, "easeOut"), 0);
  assert.equal(easeRevealProgress(1, "smooth"), 1);
  assert.equal(easeRevealProgress(0.5, "linear"), 0.5);
  assert.ok(easeRevealProgress(0.5, "easeOut") > 0.5);
  assert.ok(easeRevealProgress(0.25, "smooth") < 0.25);

  const linearMiddle = getRevealTravelDelay(260, "linear");
  const easedMiddle = getRevealTravelDelay(260, "easeOut", 520);
  const easedHamstrings = getRevealTravelDelay(450, "easeOut", 520);
  const easedCalves = getRevealTravelDelay(520, "easeOut", 520);

  assert.equal(linearMiddle, 260);
  assert.ok(easedMiddle < linearMiddle, "upper and middle regions should arrive sooner");
  assert.equal(easedCalves, 520);
  assert.ok(easedCalves - easedHamstrings > 70, "the final travel gap should slow near calves");
});

test("the default linear reveal keeps assigned muscles ordered from top to bottom", () => {
  const topToBottomAssignedMuscles = [2, 4, 6, 10, 14, 13, 16];
  const delays = topToBottomAssignedMuscles.map((muscleId) =>
    getRevealTravelDelay(SHOCKWAVE_BY_MUSCLE[muscleId].delay, "linear"),
  );
  const gaps = delays.slice(1).map((delay, index) => delay - delays[index]);

  assert.deepEqual(delays, [...delays].sort((a, b) => a - b));
  assert.ok(gaps.every((gap) => gap >= 20), "each vertical region should have time to register");
  assert.ok(delays.at(-1) - delays[0] >= 400, "the assignment should travel across the body");
});

test("reveal animation length clamps to the supported playback range", () => {
  assert.equal(getRevealDuration(1080), 1080);
  assert.equal(getRevealDuration(100), 480);
  assert.equal(getRevealDuration(9000), 3000);
});
