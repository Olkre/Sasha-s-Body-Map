import React, { useState } from "react";
import MuscleMapMaleBodySvg from "./MuscleMapMaleBodySvg";
import { FemaleBodySvg } from "./bodymap";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";
// @ts-ignore
import BezierEditor from "bezier-easing-editor";
import {
  ANIMATION_CONTROL_STYLES,
  AnimationControlPanel,
  BODYMAP_DEFAULTS,
  BODYMAP_SETTINGS_VERSION,
  EASING_OPTIONS,
  LiquidGlassButton,
  SCALE_ORIGIN_OPTIONS,
  type BezierCoords,
} from "./animation-control";

// human-readable names, descriptions, and sample exercises for each muscle ID
const MUSCLE_DETAILS: Record<
  number,
  { name: string; desc: string; exercises: string[] }
> = {
  1: {
    name: "Lower Chest",
    desc: "Pectoralis major (sternocostal head), crucial for pushing movements, shoulder adduction, and chest thickness.",
    exercises: [
      "Flat Bench Press",
      "Decline Press",
      "Chest Dips",
      "Cable Crossovers",
    ],
  },
  2: {
    name: "Upper Chest",
    desc: "Pectoralis major (clavicular head), responsible for pushing upwards and giving the chest a full, lifted appearance.",
    exercises: [
      "Incline Bench Press",
      "Incline Dumbbell Press",
      "Low-to-High Cable Flyes",
    ],
  },
  3: {
    name: "Triceps",
    desc: "Triceps brachii, a three-headed muscle on the back of the arm, making up 60% of upper arm mass. Vital for elbow extension.",
    exercises: [
      "Tricep Pushdowns",
      "Skull Crushers",
      "Close-Grip Bench Press",
      "Overhead Extensions",
    ],
  },
  4: {
    name: "Front Delts",
    desc: "Anterior deltoid, responsible for arm flexion and shoulder rotation. Highly active in all pressing movements.",
    exercises: [
      "Overhead Barbell Press",
      "Dumbbell Shoulder Press",
      "Front Raises",
    ],
  },
  5: {
    name: "Side Delts",
    desc: "Lateral deltoid, the key muscle for building shoulder width and the classic 'V-taper' silhouette.",
    exercises: [
      "Dumbbell Lateral Raises",
      "Cable Lateral Raises",
      "Upright Rows",
    ],
  },
  6: {
    name: "Biceps",
    desc: "Biceps brachii, responsible for elbow flexion and forearm supination (turning the palm upward).",
    exercises: [
      "Barbell Curls",
      "Hammer Curls",
      "Incline Dumbbell Curls",
      "Preacher Curls",
    ],
  },
  7: {
    name: "Lats",
    desc: "Latissimus dorsi, the largest muscle group in the upper body, pulling the arms down and backward.",
    exercises: [
      "Pull-Ups",
      "Lat Pulldowns",
      "Barbell Rows",
      "Single-Arm Dumbbell Rows",
    ],
  },
  8: {
    name: "Rear Delts",
    desc: "Posterior deltoid, responsible for horizontal shoulder abduction. Essential for posture and joint stability.",
    exercises: ["Face Pulls", "Rear Delt Flyes", "Reverse Cable Pec Decs"],
  },
  9: {
    name: "Forearms",
    desc: "Brachioradialis and wrist flexors/extensors, responsible for grip strength and wrist control.",
    exercises: ["Wrist Curls", "Reverse Barbell Curls", "Farmer's Walks"],
  },
  10: {
    name: "Abs",
    desc: "Rectus abdominis, the 'six-pack' muscles, flexing the spine and stabilizing the core under heavy loads.",
    exercises: [
      "Hanging Leg Raises",
      "Cable Crunches",
      "Ab Wheel Rollouts",
      "Planks",
    ],
  },
  11: {
    name: "Obliques",
    desc: "Internal and external obliques, facilitating torso rotation, lateral flexion, and core bracing.",
    exercises: ["Russian Twists", "Woodchoppers", "Side Planks"],
  },
  12: {
    name: "Hamstrings",
    desc: "Biceps femoris, semitendinosus, and semimembranosus, responsible for knee flexion and hip extension.",
    exercises: ["Romanian Deadlifts", "Lying Leg Curls", "Glute-Ham Raises"],
  },
  13: {
    name: "Quadriceps",
    desc: "Rectus femoris, vastus lateralis, vastus medialis, and vastus intermedius, extending the knee and flexing the hip.",
    exercises: [
      "Back Squats",
      "Leg Press",
      "Bulgarian Split Squats",
      "Leg Extensions",
    ],
  },
  14: {
    name: "Glutes",
    desc: "Gluteus maximus, medius, and minimus, the powerhouse of hip extension, abduction, and pelvic stability.",
    exercises: [
      "Barbell Hip Thrusts",
      "Deadlifts",
      "Sumo Squats",
      "Glute Cable Kickbacks",
    ],
  },
  15: {
    name: "Traps",
    desc: "Trapezius (upper, middle, lower), elevating, retracting, and rotating the scapulae. Important for neck and back strength.",
    exercises: ["Barbell Shrugs", "Dumbbell Shrugs", "Rack Pulls"],
  },
  16: {
    name: "Calves",
    desc: "Gastrocnemius and soleus, powering ankle extension and essential for running, jumping, and explosive movement.",
    exercises: [
      "Standing Calf Raises",
      "Seated Calf Raises",
      "Donkey Calf Raises",
    ],
  },
  17: {
    name: "Lower Back",
    desc: "Erector spinae, supporting the vertebral column, maintaining posture, and vital in heavy structural lifts.",
    exercises: ["Hyperextensions", "Deadlifts", "Good Mornings"],
  },
};

type ExerciseLog = {
  exercise: string;
  sets: number;
  reps: number;
  weight?: string;
};

const EXERCISE_LOGS: Record<string, Record<number, ExerciseLog[]>> = {
  mon: {
    1: [
      { exercise: "Flat Bench Press", sets: 4, reps: 8, weight: "185 lb" },
      { exercise: "Cable Crossovers", sets: 3, reps: 12, weight: "45 lb" },
    ],
    2: [
      { exercise: "Incline Bench Press", sets: 4, reps: 8, weight: "155 lb" },
      {
        exercise: "Incline Dumbbell Press",
        sets: 3,
        reps: 10,
        weight: "65 lb",
      },
    ],
    3: [{ exercise: "Tricep Pushdowns", sets: 3, reps: 12, weight: "70 lb" }],
    4: [
      {
        exercise: "Dumbbell Shoulder Press",
        sets: 3,
        reps: 10,
        weight: "55 lb",
      },
    ],
    5: [
      {
        exercise: "Dumbbell Lateral Raises",
        sets: 3,
        reps: 15,
        weight: "20 lb",
      },
    ],
    10: [{ exercise: "Planks", sets: 3, reps: 45 }],
  },
  tue: {
    6: [{ exercise: "Barbell Curls", sets: 3, reps: 10, weight: "75 lb" }],
    7: [
      { exercise: "Pull-Ups", sets: 4, reps: 8 },
      { exercise: "Lat Pulldowns", sets: 3, reps: 12, weight: "140 lb" },
    ],
    8: [{ exercise: "Face Pulls", sets: 3, reps: 15, weight: "45 lb" }],
    9: [{ exercise: "Farmer's Walks", sets: 3, reps: 40, weight: "70 lb" }],
    15: [{ exercise: "Barbell Shrugs", sets: 4, reps: 10, weight: "225 lb" }],
    17: [{ exercise: "Hyperextensions", sets: 3, reps: 12 }],
  },
  thu: {
    3: [
      { exercise: "Overhead Extensions", sets: 3, reps: 12, weight: "55 lb" },
    ],
    6: [{ exercise: "Hammer Curls", sets: 3, reps: 10, weight: "35 lb" }],
    9: [
      { exercise: "Reverse Barbell Curls", sets: 3, reps: 12, weight: "55 lb" },
    ],
    10: [
      { exercise: "Cable Crunches", sets: 3, reps: 12, weight: "80 lb" },
      { exercise: "Hanging Leg Raises", sets: 3, reps: 10 },
    ],
    11: [{ exercise: "Woodchoppers", sets: 3, reps: 12, weight: "35 lb" }],
    16: [
      { exercise: "Standing Calf Raises", sets: 4, reps: 15, weight: "180 lb" },
    ],
  },
  fri: {
    6: [{ exercise: "Preacher Curls", sets: 3, reps: 10, weight: "65 lb" }],
    7: [
      { exercise: "Barbell Rows", sets: 4, reps: 8, weight: "165 lb" },
      {
        exercise: "Single-Arm Dumbbell Rows",
        sets: 3,
        reps: 10,
        weight: "75 lb",
      },
    ],
    8: [{ exercise: "Rear Delt Flyes", sets: 3, reps: 15, weight: "20 lb" }],
    9: [{ exercise: "Wrist Curls", sets: 3, reps: 15, weight: "45 lb" }],
    10: [{ exercise: "Ab Wheel Rollouts", sets: 3, reps: 8 }],
    15: [{ exercise: "Rack Pulls", sets: 4, reps: 6, weight: "315 lb" }],
    17: [{ exercise: "Deadlifts", sets: 3, reps: 5, weight: "275 lb" }],
  },
  sat: {
    10: [{ exercise: "Russian Twists", sets: 3, reps: 20, weight: "25 lb" }],
    11: [{ exercise: "Side Planks", sets: 3, reps: 45 }],
    12: [
      { exercise: "Romanian Deadlifts", sets: 4, reps: 8, weight: "185 lb" },
    ],
    13: [{ exercise: "Back Squats", sets: 4, reps: 6, weight: "225 lb" }],
    14: [
      { exercise: "Barbell Hip Thrusts", sets: 3, reps: 10, weight: "225 lb" },
    ],
    16: [
      { exercise: "Seated Calf Raises", sets: 4, reps: 15, weight: "90 lb" },
    ],
    17: [{ exercise: "Good Mornings", sets: 3, reps: 10, weight: "95 lb" }],
  },
};

const MUSCLE_RANKS: Record<number, number> = {
  15: 1,
  4: 2,
  5: 3,
  8: 4,
  2: 5,
  1: 6,
  7: 7,
  6: 8,
  3: 9,
  11: 10,
  10: 11,
  17: 12,
  9: 13,
  14: 14,
  13: 15,
  12: 16,
  16: 17,
};

const SETTINGS_PANEL_TRANSITION = {
  duration: 0.34,
  ease: [0.32, 0.72, 0, 1] as const,
};

const SETTINGS_LAYOUT_TRANSITION = {
  layout: SETTINGS_PANEL_TRANSITION,
};
const MAP_LIFT_MIN_PERCENT = 10;
const MAP_LIFT_MAX_PERCENT = 30;
const GLUTES_MAP_LIFT_PERCENT = 29;
const CALVES_MAP_LIFT_PERCENT = 55;
const MAP_SELECTION_SCALE = 1.14;
const MAP_SELECTION_ENTER_TRANSITION = {
  duration: 0.28,
  ease: [0.77, 0, 0.175, 1] as const,
};
const MAP_SELECTION_EXIT_TRANSITION = {
  duration: 0.22,
  ease: [0.23, 1, 0.32, 1] as const,
};

const getSelectedMuscleMapLiftPercent = (muscleId: number | null) => {
  if (muscleId === null) return 0;
  if (muscleId === 14) return GLUTES_MAP_LIFT_PERCENT;
  if (muscleId === 16) return CALVES_MAP_LIFT_PERCENT;

  const rank = MUSCLE_RANKS[muscleId] ?? 9;
  const rankSpan = Math.max(...Object.values(MUSCLE_RANKS)) - 1;
  const normalized = (rank - 1) / rankSpan;

  return (
    MAP_LIFT_MIN_PERCENT +
    normalized * (MAP_LIFT_MAX_PERCENT - MAP_LIFT_MIN_PERCENT)
  );
};

const getMapSelectionTransform = (
  muscleId: number | null,
  reduceMotion: boolean,
) => {
  if (muscleId === null) return "translateY(0%) scale(1)";

  const lift = getSelectedMuscleMapLiftPercent(muscleId);
  const scale = reduceMotion ? 1 : MAP_SELECTION_SCALE;

  return `translateY(-${lift}%) scale(${scale})`;
};

// Custom Cubic-Bezier solver mapping x [0, 1] to y using Newton's method
const solveCubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Newton-Raphson iteration to solve x(t) = x
    let t = x; // initial guess
    for (let i = 0; i < 8; i++) {
      const t2 = t * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const currentX = 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t2 * t;
      const dx = 3 * mt2 * x1 + 6 * mt * t * (x2 - x1) + 3 * t2 * (1 - x2);

      if (Math.abs(dx) < 1e-6) break;
      t = t - (currentX - x) / dx;
    }

    // Evaluate y(t)
    const mt = 1 - t;
    return 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t;
  };
};

const EASING_FUNCTIONS = {
  easeOutStrong: {
    label: "Strong Out (Emil)",
    fn: solveCubicBezier(0.23, 1, 0.32, 1),
  },
  easeInOutStrong: {
    label: "Strong In-Out (Emil)",
    fn: solveCubicBezier(0.77, 0, 0.175, 1),
  },
  easeIOSDrawer: {
    label: "iOS Drawer (Emil)",
    fn: solveCubicBezier(0.32, 0.72, 0, 1),
  },
  easeInOutCubic: {
    label: "Smooth In-Out",
    fn: (p: number) =>
      p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  },
  easeOutElastic: {
    label: "Elastic Spring",
    fn: (p: number) =>
      p === 0
        ? 0
        : p === 1
          ? 1
          : Math.pow(2, -10 * p) *
              Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) +
            1,
  },
  easeOutBounce: {
    label: "Bounce Drop",
    fn: (p: number) => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (p < 1 / d1) {
        return n1 * p * p;
      } else if (p < 2 / d1) {
        return n1 * (p - 1.5 / d1) * (p - 1.5 / d1) + 0.75;
      } else if (p < 2.5 / d1) {
        return n1 * (p - 2.25 / d1) * (p - 2.25 / d1) + 0.9375;
      } else {
        return n1 * (p - 2.625 / d1) * (p - 2.625 / d1) + 0.984375;
      }
    },
  },
  linear: {
    label: "Linear",
    fn: (p: number) => p,
  },
  custom: {
    label: "Custom Bezier",
    fn: (p: number) => p,
  },
};

const smoothstep01 = (t: number) => {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
};

type WaveRippleRole = "appearing" | "disappearing";

function getWaveRippleProps(waveDelta: number, role: WaveRippleRole) {
  const isAppearing = role === "appearing";

  if (isAppearing) {
    if (waveDelta <= -15) {
      return { pathScale: 0.01, pathOpacity: 0.0 };
    }
    if (waveDelta <= -8) {
      const t = smoothstep01((waveDelta + 15) / 7);
      return {
        pathScale: 0.01 + 0.19 * t,
        pathOpacity: 0.2 * t,
      };
    }
    if (waveDelta <= 3.5) {
      return { pathScale: 0.2, pathOpacity: 0.2 };
    }
    if (waveDelta <= 8) {
      const t = smoothstep01((waveDelta - 3.5) / 4.5);
      return {
        pathScale: 0.2 + 0.3 * t,
        pathOpacity: 0.2 + 0.3 * t,
      };
    }
    if (waveDelta <= 15) {
      const t = smoothstep01((waveDelta - 8) / 7);
      return {
        pathScale: 0.5 + 0.5 * t,
        pathOpacity: 0.5 + 0.5 * t,
      };
    }
    return { pathScale: 1.0, pathOpacity: 1.0 };
  }

  if (waveDelta <= -15) {
    return { pathScale: 1.0, pathOpacity: 1.0 };
  }
  if (waveDelta <= -8) {
    const t = smoothstep01((waveDelta + 15) / 7);
    return {
      pathScale: 1.0 - 0.5 * t,
      pathOpacity: 1.0 - 0.5 * t,
    };
  }
  if (waveDelta <= 3.5) {
    return { pathScale: 0.2, pathOpacity: 0.2 };
  }
  if (waveDelta <= 8) {
    return { pathScale: 0.2, pathOpacity: 0.2 };
  }
  if (waveDelta <= 15) {
    const t = smoothstep01((waveDelta - 8) / 7);
    return {
      pathScale: 0.2 * (1 - t),
      pathOpacity: 0.2 * (1 - t),
    };
  }
  return { pathScale: 0.01, pathOpacity: 0.0 };
}

const ACTIVE_COLOR = "#111111";
const ACTIVE_RGB = "17, 17, 17";
type MuscleWorkLevel = 0 | 1 | 2 | 3 | 4;

const MUSCLE_WORK_COLORS = {
  none: "#d8ddda",
  noneSelected: "#6f7571",
  low: "#f3d85f",
  moderate: "#b9e66e",
  high: "#54c45f",
  max: "#15803d",
} as const;

const MUSCLE_WORK_LABELS = {
  0: "Not worked",
  1: "Light",
  2: "Moderate",
  3: "Strong",
  4: "Max",
} as const;

const MUSCLE_WORK_LEGEND = [
  { label: MUSCLE_WORK_LABELS[0], color: MUSCLE_WORK_COLORS.none },
  { label: MUSCLE_WORK_LABELS[1], color: MUSCLE_WORK_COLORS.low },
  { label: MUSCLE_WORK_LABELS[2], color: MUSCLE_WORK_COLORS.moderate },
  { label: MUSCLE_WORK_LABELS[3], color: MUSCLE_WORK_COLORS.high },
  { label: MUSCLE_WORK_LABELS[4], color: MUSCLE_WORK_COLORS.max },
] as const;

const WEEK_WORKOUT_DAYS = [
  {
    weekday: "sun",
    date: 22,
    workLevels: {} satisfies Record<number, MuscleWorkLevel>,
  },
  {
    weekday: "mon",
    date: 23,
    workLevels: {
      1: 4,
      2: 4,
      3: 3,
      4: 3,
      5: 3,
      10: 1,
    } satisfies Record<number, MuscleWorkLevel>,
  },
  {
    weekday: "tue",
    date: 24,
    workLevels: {
      6: 3,
      7: 4,
      8: 3,
      9: 2,
      15: 3,
      17: 2,
    } satisfies Record<number, MuscleWorkLevel>,
  },
  {
    weekday: "wed",
    date: 25,
    workLevels: {} satisfies Record<number, MuscleWorkLevel>,
  },
  {
    weekday: "thu",
    date: 26,
    today: true,
    workLevels: {
      3: 3,
      6: 3,
      9: 2,
      10: 4,
      11: 3,
      16: 2,
    } satisfies Record<number, MuscleWorkLevel>,
  },
  {
    weekday: "fri",
    date: 27,
    workLevels: {
      6: 3,
      7: 4,
      8: 3,
      9: 3,
      10: 1,
      15: 4,
      17: 3,
    } satisfies Record<number, MuscleWorkLevel>,
  },
  {
    weekday: "sat",
    date: 28,
    workLevels: {
      10: 2,
      11: 2,
      12: 4,
      13: 3,
      14: 2,
      16: 4,
      17: 2,
    } satisfies Record<number, MuscleWorkLevel>,
  },
] as const;

const getAggregatedWeekWorkLevels = (): Record<number, MuscleWorkLevel> => {
  const aggregated: Record<number, MuscleWorkLevel> = {};
  for (const day of WEEK_WORKOUT_DAYS) {
    for (const [muscleId, level] of Object.entries(day.workLevels)) {
      const id = Number(muscleId);
      aggregated[id] = Math.max(aggregated[id] ?? 0, level) as MuscleWorkLevel;
    }
  }
  return aggregated;
};

const WEEK_AGGREGATE_WORK_LEVELS = getAggregatedWeekWorkLevels();

const getWorkLevelColor = (level: MuscleWorkLevel) =>
  level === 0
    ? MUSCLE_WORK_COLORS.none
    : level === 1
      ? MUSCLE_WORK_COLORS.low
      : level === 2
        ? MUSCLE_WORK_COLORS.moderate
        : level === 3
          ? MUSCLE_WORK_COLORS.high
          : MUSCLE_WORK_COLORS.max;

const BODY_HOVER_MAX_DISTANCE = 20;
const BODY_HOVER_SAMPLE_COUNT = 24;

function WeekCalendar({
  selectedIndex,
  onSelect,
  weekView,
  onWeekViewToggle,
}: {
  selectedIndex: number;
  onSelect: (index: number) => void;
  weekView: boolean;
  onWeekViewToggle: () => void;
}) {
  const calendarBg = "#ecedeb";
  const green = "#00c300";
  const greenDark = "#155300";
  const hasWorkout = (day: (typeof WEEK_WORKOUT_DAYS)[number]) =>
    Object.keys(day.workLevels).length > 0;

  return (
    <div className="w-[302.89px] max-w-full rounded-[19.03px] bg-[#ecedeb] px-[12.69px] py-[14.27px]">
      <div className="mb-[14.27px] flex items-center justify-between gap-2">
        <h3 className="font-heading text-[19.03px] font-bold leading-[23.79px] text-black">
          March, 2026
        </h3>
        <LiquidGlassButton
          onClick={onWeekViewToggle}
          size="compact"
          aria-pressed={weekView}
          className={`shrink-0 gap-1 -mt-1 ${
            weekView
              ? "bodymap-liquid-glass-week-active"
              : "bodymap-liquid-glass-week-inactive"
          }`}
          aria-label={
            weekView
              ? "Showing muscle usage for the whole week. Switch to daily view."
              : "View muscle usage for the whole week"
          }
        >
          <svg
            className="size-3 shrink-0 inline -mt-0.5 me-1"
            width="100"
            height="100"
            fill="none"
            viewBox="0 0 100 100"
          >
            <g fill="#000" opacity=".4">
              <circle cx="26" cy="49.6" r="7" />
              <circle cx="50" cy="49.6" r="7" />
              <circle cx="74" cy="49.6" r="7" />
              <circle cx="26" cy="68.6" r="7" />
              <circle cx="50" cy="68.6" r="7" />
              <circle cx="74" cy="68.6" r="7" />
            </g>
            <path
              fill="#000"
              d="M21.7 15.3a4.4 4.4 0 0 0 8.7 0v-2.5a3 3 0 0 1 3-3h33.2a3 3 0 0 1 3 3v2.5a4.4 4.4 0 0 0 8.7 0v-2.5a3 3 0 0 1 3-3H88c5.3.2 9.6 4.6 9.4 10v60.3a10 10 0 0 1-10 10h-75a10 10 0 0 1-10-10V19.8a10 10 0 0 1 9.6-10h6.8a3 3 0 0 1 3 3zM14.2 34a5 5 0 0 0-5 5v41.2c0 1.8 1.5 3.3 3.3 3.3h75c1.8 0 3.3-1.4 3.3-3.2l.1-.1V38.9a5 5 0 0 0-5-5z"
            />
          </svg>
          Week
        </LiquidGlassButton>
      </div>
      <div className="flex w-full justify-between">
        {WEEK_WORKOUT_DAYS.map((day, index) => {
          const isSelected = !weekView && selectedIndex === index;
          const isToday = day.today === true;
          const isWorkoutDay = hasWorkout(day);
          const isActiveWorkoutDay = isWorkoutDay && isSelected;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(index)}
              className="group/day flex w-[32.71px] cursor-pointer flex-col items-center gap-[5.55px] text-center"
              aria-pressed={isSelected}
              aria-label={`${day.weekday}, March ${day.date}`}
            >
              <span
                className={`text-[9.51px] font-semibold leading-[11px] uppercase ${
                  isToday
                    ? "text-[#ff0000]"
                    : "text-black opacity-40 transition-opacity duration-200 group-hover/day:opacity-70"
                }`}
              >
                {day.weekday}
              </span>
              <motion.span
                className={`relative flex items-center justify-center rounded-full leading-none ${
                  isWorkoutDay
                    ? `h-[29px] w-[28.5px] text-[11.5px] font-medium border-solid border-[#00c300] ${
                        isActiveWorkoutDay
                          ? "border-2"
                          : isSelected
                            ? "border-[2.5px]"
                            : "border-2"
                      }`
                    : "h-[33.3px] w-[32.71px] text-[13.48px] font-semibold"
                }`}
                animate={{
                  scale: isSelected ? 1.05 : 1,
                  y: isSelected ? -1 : 0,
                  backgroundColor: isActiveWorkoutDay
                    ? green
                    : isToday && !isWorkoutDay
                      ? "rgba(226, 226, 226, 0.65)"
                      : "rgba(0, 0, 0, 0)",
                  color: isWorkoutDay ? greenDark : "#000000",
                }}
                style={{
                  boxShadow: isWorkoutDay
                    ? isActiveWorkoutDay
                      ? "0 0 14px rgba(0, 195, 0, 0.28)"
                      : isSelected
                        ? "0 0 14px rgba(0, 195, 0, 0.22)"
                        : "none"
                    : `inset 0 0 0 0.79px ${
                        isSelected
                          ? "rgba(255, 255, 255, 1)"
                          : index === 1 || index >= 5
                            ? "rgba(216, 216, 216, 0.65)"
                            : "rgba(255, 255, 255, 0.65)"
                      }`,
                }}
                transition={{ type: "spring", stiffness: 520, damping: 31 }}
              >
                {isSelected && !isToday && !isWorkoutDay ? (
                  <motion.span
                    layoutId="week-calendar-selected-day"
                    className="absolute inset-0 rounded-[16.35px] bg-white/45 shadow-[0px_6.343px_31.716px_rgba(0,0,0,0.12)]"
                    transition={{
                      type: "spring",
                      stiffness: 540,
                      damping: 34,
                      mass: 0.72,
                    }}
                  />
                ) : null}
                {isWorkoutDay ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="8"
                      height="14"
                      fill="none"
                      viewBox="0 0 10 17"
                      className="absolute top-[5px] left-1/2 -translate-x-1/2"
                      aria-hidden="true"
                    >
                      <path
                        fill={isActiveWorkoutDay ? "#ffffff" : green}
                        d="M0 8.9q0-.2.2-.5L6.5.6c.4-.6 1.2-.2.9.5l-2 5.6h3.9q.3 0 .4.5l-.1.4-6.3 7.9c-.5.6-1.2.2-1-.5l2.1-5.6H.5q-.5 0-.5-.5"
                      />
                    </svg>
                    <span
                      className={`absolute -bottom-[6px] left-1/2 z-[1] -translate-x-1/2 font-medium leading-none ${
                        isActiveWorkoutDay ? "text-white" : "text-[#239a2d]"
                      }`}
                      data-selected={isSelected ? "true" : "false"}
                      style={{
                        fontSize: "10.5px",
                        WebkitTextStroke: isActiveWorkoutDay
                          ? `3.5px ${green}`
                          : `3.5px ${calendarBg}`,
                        paintOrder: "stroke fill",
                      }}
                    >
                      {day.date}
                    </span>
                  </>
                ) : (
                  <span className="relative z-[1]">{day.date}</span>
                )}
              </motion.span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function InteractiveBodyMap() {
  const shouldReduceMotion = useReducedMotion();
  const [showSettings, setShowSettings] = useState(false);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [progress, setProgress] = useState(0); // 0 (100% male) to 100 (100% female)
  const [selectedDayIndex, setSelectedDayIndex] = useState(4);
  const [weekView, setWeekView] = useState(false);
  const [previousDayIndex, setPreviousDayIndex] = useState<number | null>(null);
  const [dayWaveLevels, setDayWaveLevels] = useState<{
    previous: Record<number, MuscleWorkLevel>;
    current: Record<number, MuscleWorkLevel>;
  } | null>(null);
  const [dayWaveProgress, setDayWaveProgress] = useState(100);
  const [hoveredMuscle, setHoveredMuscle] = useState<number | null>(null);
  const [isHoveringBody, setIsHoveringBody] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<number | null>(null);
  const [scaleOrigin, setScaleOrigin] = useState<
    "mixed" | "top" | "bottom" | "center"
  >(BODYMAP_DEFAULTS.scaleOrigin);
  const [scaleOriginReplayTick, setScaleOriginReplayTick] = useState(0);
  const [animDuration, setAnimDuration] = useState(
    BODYMAP_DEFAULTS.animDuration,
  );
  const [easingType, setEasingType] = useState<keyof typeof EASING_FUNCTIONS>(
    BODYMAP_DEFAULTS.easingType,
  );
  const [hoveredEasingType, setHoveredEasingType] = useState<
    keyof typeof EASING_FUNCTIONS | null
  >(null);
  const [customBezier, setCustomBezier] = useState(
    BODYMAP_DEFAULTS.customBezier,
  );
  const [maxBlur, setMaxBlur] = useState(BODYMAP_DEFAULTS.maxBlur);
  const [isMounted, setIsMounted] = useState(false);
  const [bodyRevealProgress, setBodyRevealProgress] = useState(1);
  const [transitionWaveProgress, setTransitionWaveProgress] = useState(100);
  const [transitionTargetGender, setTransitionTargetGender] = useState<
    "male" | "female" | null
  >(null);
  const animRef = React.useRef<number | null>(null);
  const bodyRevealRef = React.useRef<number | null>(null);
  const dayWaveRef = React.useRef<number | null>(null);

  const tooltipX = useMotionValue(0);
  const tooltipY = useMotionValue(0);
  const tooltipXSpring = useSpring(tooltipX, { stiffness: 520, damping: 44 });
  const tooltipYSpring = useSpring(tooltipY, { stiffness: 520, damping: 44 });

  const bodyHoverRootRef = React.useRef<HTMLDivElement | null>(null);
  const lastBodyPointerRef = React.useRef<{ x: number; y: number } | null>(null);
  const [mapFocusOrigin, setMapFocusOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [activeHandle, setActiveHandle] = useState<null | 1 | 2>(null);
  const [bezierInputText, setBezierInputText] = useState(
    BODYMAP_DEFAULTS.bezierInputText,
  );
  const [editorEngine, setEditorEngine] = useState<"craft" | "package">(
    "craft",
  );

  // Get active bezier coordinates based on current easing type (even if preset)
  const getBezierCoordsForEasing = (
    targetEasingType: keyof typeof EASING_FUNCTIONS,
  ): BezierCoords => {
    if (targetEasingType === "easeOutStrong")
      return { x1: 0.23, y1: 1, x2: 0.32, y2: 1 };
    if (targetEasingType === "easeInOutStrong")
      return { x1: 0.77, y1: 0, x2: 0.175, y2: 1 };
    if (targetEasingType === "easeIOSDrawer")
      return { x1: 0.32, y1: 0.72, x2: 0, y2: 1 };
    if (targetEasingType === "easeInOutCubic")
      return { x1: 0.65, y1: 0, x2: 0.35, y2: 1 };
    if (targetEasingType === "linear") return { x1: 0, y1: 0, x2: 1, y2: 1 };
    return customBezier;
  };
  const previewedEasingType = hoveredEasingType ?? easingType;

  // Get active bezier coordinates based on current easing type (even if preset)
  const getActiveBezierCoords = (): BezierCoords =>
    getBezierCoordsForEasing(previewedEasingType);
  const [displayBezier, setDisplayBezier] = useState<BezierCoords>(
    getActiveBezierCoords,
  );
  const displayBezierRef = React.useRef<BezierCoords>(displayBezier);
  const bezierAnimRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const from = displayBezierRef.current;
    const to = getActiveBezierCoords();
    const duration = 220;
    const startedAt = performance.now();

    if (bezierAnimRef.current !== null) {
      cancelAnimationFrame(bezierAnimRef.current);
    }

    const step = (now: number) => {
      const rawProgress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = EASING_FUNCTIONS.easeOutStrong.fn(rawProgress);
      const next = {
        x1: from.x1 + (to.x1 - from.x1) * easedProgress,
        y1: from.y1 + (to.y1 - from.y1) * easedProgress,
        x2: from.x2 + (to.x2 - from.x2) * easedProgress,
        y2: from.y2 + (to.y2 - from.y2) * easedProgress,
      };

      displayBezierRef.current = next;
      setDisplayBezier(next);

      if (rawProgress < 1) {
        bezierAnimRef.current = requestAnimationFrame(step);
        return;
      }

      displayBezierRef.current = to;
      setDisplayBezier(to);
      bezierAnimRef.current = null;
    };

    bezierAnimRef.current = requestAnimationFrame(step);

    return () => {
      if (bezierAnimRef.current !== null) {
        cancelAnimationFrame(bezierAnimRef.current);
        bezierAnimRef.current = null;
      }
    };
  }, [previewedEasingType, customBezier]);

  // Allow dismissing the muscle details modal with `Escape`.
  React.useEffect(() => {
    if (selectedMuscle === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setHoveredMuscle(null);
      setIsHoveringBody(false);
      setSelectedMuscle(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedMuscle]);

  const updateSingleCoord = (key: "x1" | "y1" | "x2" | "y2", val: number) => {
    setCustomBezier((prev) => {
      const base = easingType === "custom" ? prev : getActiveBezierCoords();
      return { ...base, [key]: val };
    });
    if (easingType !== "custom") setEasingType("custom");
  };

  // Sync text input when current active bezier coordinates change
  React.useEffect(() => {
    const coords = getActiveBezierCoords();
    const currentFormatted = `${coords.x1.toFixed(2)}, ${coords.y1.toFixed(2)}, ${coords.x2.toFixed(2)}, ${coords.y2.toFixed(2)}`;
    const match = bezierInputText.match(
      /([0-9.-]+)\s*,\s*([0-9.-]+)\s*,\s*([0-9.-]+)\s*,\s*([0-9.-]+)/,
    );
    let needsSync = true;
    if (match) {
      const x1 = parseFloat(match[1]);
      const y1 = parseFloat(match[2]);
      const x2 = parseFloat(match[3]);
      const y2 = parseFloat(match[4]);
      if (
        Math.abs(x1 - coords.x1) < 0.01 &&
        Math.abs(y1 - coords.y1) < 0.01 &&
        Math.abs(x2 - coords.x2) < 0.01 &&
        Math.abs(y2 - coords.y2) < 0.01
      ) {
        needsSync = false;
      }
    }
    if (needsSync) {
      setBezierInputText(currentFormatted);
    }
  }, [easingType, customBezier]);

  const handlePointerDown = (
    e: React.PointerEvent<SVGCircleElement>,
    handleNum: 1 | 2,
  ) => {
    e.preventDefault();
    if (easingType !== "custom") {
      const coords = getActiveBezierCoords();
      setCustomBezier(coords);
      setEasingType("custom");
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveHandle(handleNum);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    if (activeHandle === null) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();

    // Convert to relative coordinates inside our 160x160 viewBox
    const localX = ((e.clientX - rect.left) / rect.width) * 160;
    const localY = ((e.clientY - rect.top) / rect.height) * 160;

    // Inverse mapping to bezier values
    const bx = Math.min(1, Math.max(0, (localX - 20) / 120));
    const by = Math.min(1.5, Math.max(-0.5, 1.5 - (localY - 20) / 60));

    setCustomBezier((prev) => {
      const base = easingType === "custom" ? prev : getActiveBezierCoords();
      const next =
        activeHandle === 1
          ? { ...base, x1: bx, y1: by }
          : { ...base, x2: bx, y2: by };
      return next;
    });
    if (easingType !== "custom") {
      setEasingType("custom");
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGCircleElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setActiveHandle(null);
  };

  // Load from local storage on mount
  React.useEffect(() => {
    try {
      setScaleOrigin(BODYMAP_DEFAULTS.scaleOrigin);
      setAnimDuration(BODYMAP_DEFAULTS.animDuration);
      setEasingType(BODYMAP_DEFAULTS.easingType);
      setCustomBezier(BODYMAP_DEFAULTS.customBezier);
      setMaxBlur(BODYMAP_DEFAULTS.maxBlur);
      setBezierInputText(BODYMAP_DEFAULTS.bezierInputText);
      localStorage.setItem("bodymap_settingsVersion", BODYMAP_SETTINGS_VERSION);
      localStorage.setItem("bodymap_scaleOrigin", BODYMAP_DEFAULTS.scaleOrigin);
      localStorage.setItem(
        "bodymap_animDuration",
        BODYMAP_DEFAULTS.animDuration.toString(),
      );
      localStorage.setItem("bodymap_easingType", BODYMAP_DEFAULTS.easingType);
      localStorage.setItem(
        "bodymap_customBezier",
        JSON.stringify(BODYMAP_DEFAULTS.customBezier),
      );
      localStorage.setItem(
        "bodymap_maxBlur",
        BODYMAP_DEFAULTS.maxBlur.toString(),
      );
    } catch (e) {
      console.error("Failed to initialize settings defaults", e);
    }
    setIsMounted(true);
  }, []);

  // Save to local storage on changes (only after mounting)
  React.useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem("bodymap_settingsVersion", BODYMAP_SETTINGS_VERSION);
      localStorage.setItem("bodymap_scaleOrigin", scaleOrigin);
      localStorage.setItem("bodymap_animDuration", animDuration.toString());
      localStorage.setItem("bodymap_easingType", easingType);
      localStorage.setItem(
        "bodymap_customBezier",
        JSON.stringify(customBezier),
      );
      localStorage.setItem("bodymap_maxBlur", maxBlur.toString());
    } catch (e) {
      console.error("Failed to save settings to localStorage", e);
    }
  }, [scaleOrigin, animDuration, easingType, customBezier, maxBlur, isMounted]);

  const handleReset = () => {
    setScaleOrigin(BODYMAP_DEFAULTS.scaleOrigin);
    setAnimDuration(BODYMAP_DEFAULTS.animDuration);
    setEasingType(BODYMAP_DEFAULTS.easingType);
    setCustomBezier(BODYMAP_DEFAULTS.customBezier);
    setMaxBlur(BODYMAP_DEFAULTS.maxBlur);
    setBezierInputText(BODYMAP_DEFAULTS.bezierInputText);
  };

  // Stop any running requestAnimationFrame loop
  const stopAnimation = () => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setTransitionTargetGender(null);
    setTransitionWaveProgress(100);
  };

  const stopBodyReveal = () => {
    if (bodyRevealRef.current !== null) {
      cancelAnimationFrame(bodyRevealRef.current);
      bodyRevealRef.current = null;
    }
  };

  const stopDayWave = () => {
    if (dayWaveRef.current !== null) {
      cancelAnimationFrame(dayWaveRef.current);
      dayWaveRef.current = null;
    }
    setDayWaveProgress(100);
    setPreviousDayIndex(null);
    setDayWaveLevels(null);
  };

  const runDayWaveAnimation = (onStart: () => void) => {
    stopAnimation();
    stopDayWave();
    onStart();
    setSelectedMuscle(null);
    setDayWaveProgress(0);

    const startTime = performance.now();
    const duration = animDuration;
    const easeFn = getActiveEasingFn();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      setDayWaveProgress(easeFn(p) * 100);

      if (p < 1) {
        dayWaveRef.current = requestAnimationFrame(step);
      } else {
        dayWaveRef.current = null;
        setDayWaveProgress(100);
        setPreviousDayIndex(null);
        setDayWaveLevels(null);
      }
    };

    dayWaveRef.current = requestAnimationFrame(step);
  };

  const toggleWeekView = () => {
    const enablingWeekView = !weekView;
    const selectedDay =
      WEEK_WORKOUT_DAYS[selectedDayIndex] ?? WEEK_WORKOUT_DAYS[4];
    const fromLevels = weekView
      ? WEEK_AGGREGATE_WORK_LEVELS
      : selectedDay.workLevels;
    const toLevels = enablingWeekView
      ? WEEK_AGGREGATE_WORK_LEVELS
      : selectedDay.workLevels;

    runDayWaveAnimation(() => {
      setDayWaveLevels({
        previous: { ...fromLevels },
        current: { ...toLevels },
      });
      setPreviousDayIndex(selectedDayIndex);
      setWeekView(enablingWeekView);
    });
  };

  const animateDayChange = (nextIndex: number) => {
    if (!weekView && nextIndex === selectedDayIndex) return;

    runDayWaveAnimation(() => {
      if (weekView) {
        setWeekView(false);
        setDayWaveLevels({
          previous: { ...WEEK_AGGREGATE_WORK_LEVELS },
          current: { ...WEEK_WORKOUT_DAYS[nextIndex].workLevels },
        });
        setPreviousDayIndex(selectedDayIndex);
        setSelectedDayIndex(nextIndex);
        return;
      }

      setDayWaveLevels(null);
      const previousIndex = selectedDayIndex;
      setPreviousDayIndex(previousIndex);
      setSelectedDayIndex(nextIndex);
    });
  };

  // Get active easing function, dynamically compiling custom bezier if selected
  const getActiveEasingFn = () => {
    if (easingType === "custom") {
      return solveCubicBezier(
        customBezier.x1,
        customBezier.y1,
        customBezier.x2,
        customBezier.y2,
      );
    }
    return EASING_FUNCTIONS[easingType].fn;
  };

  // Programmatically animate progress state using user-selected duration and easing
  const animateTo = (target: number, targetGender: "male" | "female") => {
    stopAnimation();
    stopDayWave();
    const duration = animDuration;
    let startVal = progress;
    setProgress((curr) => {
      startVal = curr;
      return curr;
    });
    setTransitionTargetGender(targetGender);
    setTransitionWaveProgress(0);
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      const easeFn = getActiveEasingFn();
      const ease = easeFn(p);
      const newVal = startVal + (target - startVal) * ease;
      setProgress(newVal);
      setTransitionWaveProgress(ease * 100);

      if (p < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        animRef.current = null;
        setTransitionTargetGender(null);
        setTransitionWaveProgress(100);
      }
    };
    animRef.current = requestAnimationFrame(step);
  };

  const selectMale = () => {
    setGender("male");
    animateTo(0, "male");
  };

  const selectFemale = () => {
    setGender("female");
    animateTo(100, "female");
  };

  const replayBodyLoadWithEasing = (
    previewEasingType: keyof typeof EASING_FUNCTIONS = easingType,
  ) => {
    stopAnimation();
    stopBodyReveal();

    const target = gender === "female" ? 100 : 0;
    setBodyRevealProgress(0);
    setProgress(target);

    const startTime = performance.now();
    const duration = animDuration;
    const easeFn =
      previewEasingType === "custom"
        ? solveCubicBezier(
            customBezier.x1,
            customBezier.y1,
            customBezier.x2,
            customBezier.y2,
          )
        : EASING_FUNCTIONS[previewEasingType].fn;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      setBodyRevealProgress(easeFn(p));

      if (p < 1) {
        bodyRevealRef.current = requestAnimationFrame(step);
      } else {
        bodyRevealRef.current = null;
        setBodyRevealProgress(1);
      }
    };

    bodyRevealRef.current = requestAnimationFrame(step);
  };

  const replayBodyLoad = () => replayBodyLoadWithEasing();

  const previewEasingOption = (key: keyof typeof EASING_FUNCTIONS) => {
    setHoveredEasingType(key);
    replayBodyLoadWithEasing(key);
  };

  React.useEffect(() => {
    if (!isMounted) return;
    replayBodyLoad();
  }, [isMounted]);

  // Cleanup animations on unmount
  React.useEffect(() => {
    return () => {
      stopAnimation();
      stopBodyReveal();
      stopDayWave();
    };
  }, []);

  // Per-render per-group call counters — give each path within a muscle group
  // a small sequential sub-rank so paths stagger within the group.
  // Reset every render (plain object, not a ref) — React renders synchronously
  // so call order within a render is always stable.
  const _groupCount: Record<string, number> = {};

  // Threshold range: 15→80.
  // The morph scale band is 15 units wide on either side of each threshold, so
  // the first paths start transforming at 0% and the last staggered paths keep
  // transforming through the final 10% of the scrub.
  const RANK_SLOTS = 18; // slots 0 (head) through 17 (calves)
  const THRESHOLD_MIN = 15;
  const THRESHOLD_MAX = 80;
  const RANK_STEP = (THRESHOLD_MAX - THRESHOLD_MIN) / (RANK_SLOTS - 1);

  // Styling helper for SVG paths
  const getMuscleProps = (
    muscleId: number,
    modelGender: "male" | "female",
  ) => {
    const isHead = muscleId === 0;
    const isHovered = hoveredMuscle === muscleId;
    const isSelected = selectedMuscle === muscleId;

    // ── Anatomical top-to-bottom ordering ───────────────────────────────────
    // Slot 0 = head (topmost), slots 1-17 = MUSCLE_RANKS order (traps → calves).
    // Threshold 15→80 keeps the anatomical cascade active through both ends.
    const slot = isHead ? 0 : (MUSCLE_RANKS[muscleId] ?? 9);
    const baseThreshold = THRESHOLD_MIN + slot * RANK_STEP;

    // Small per-path stagger within each muscle group (0.3 units per path).
    // Gives path-by-path ripple without changing the group's anatomical order.
    const groupKey = `${modelGender}-base-${muscleId}`;
    const subIdx = _groupCount[groupKey] ?? 0;
    _groupCount[groupKey] = subIdx + 1;
    const isBodyRevealActive = bodyRevealProgress < 1;
    const isGenderTransitionActive =
      !isBodyRevealActive && transitionTargetGender !== null;
    const isDayWaveActive =
      !isBodyRevealActive &&
      !isGenderTransitionActive &&
      dayWaveProgress < 100 &&
      (previousDayIndex !== null || dayWaveLevels !== null);
    const threshold = isBodyRevealActive
      ? slot * (68 / (RANK_SLOTS - 1)) + subIdx * 0.24 + 10
      : baseThreshold + subIdx * 0.3;
    const dayWaveDelta = dayWaveProgress - threshold;
    const resolveWorkLevels = (
      layer: "previous" | "current" | null,
    ): Record<number, MuscleWorkLevel> => {
      if (dayWaveLevels) {
        if (layer === "previous") return dayWaveLevels.previous;
        if (layer === "current") return dayWaveLevels.current;
        return dayWaveLevels.current;
      }
      if (layer === "previous" && previousWorkoutDay) {
        return previousWorkoutDay.workLevels;
      }
      if (weekView) return WEEK_AGGREGATE_WORK_LEVELS;
      return selectedWorkoutDay.workLevels;
    };
    const previousWorkLevel = resolveWorkLevels("previous")[muscleId] ?? 0;
    const currentWorkLevel = resolveWorkLevels("current")[muscleId] ?? 0;
    const displayWorkLevel = isDayWaveActive
      ? dayWaveDelta >= 0
        ? currentWorkLevel
        : previousWorkLevel
      : currentWorkLevel;
    const muscleFill =
      isSelected && displayWorkLevel === 0
        ? MUSCLE_WORK_COLORS.noneSelected
        : getWorkLevelColor(displayWorkLevel);
    const renderProgress = isBodyRevealActive
      ? bodyRevealProgress * 100
      : progress;

    // delta: negative = this path is in female territory, positive = male territory
    const delta = threshold - renderProgress;
    const absDelta = Math.abs(delta);

    // ─── Three-zone Ripple Wave ──────────────────────────────────────────────────
    // Zone A |d| ≤ 3.5      → center pinch:   20% scale, 20% opacity (both ghosts)
    // Zone B 3.5 < |d| ≤ 8  → mid band:       20%–50% scale, symmetric dual-fade
    // Zone C 8 < |d| ≤ 15   → outer band:     50%–100% scale, dominant takes over
    // Zone D |d| > 15        → fully resolved: 100% scale, one gender only

    let pathScale: number;
    let pathOpacity: number;

    const isDominant =
      (delta < 0 && modelGender === "female") ||
      (delta > 0 && modelGender === "male");
    const isTransitioning =
      isBodyRevealActive ||
      isGenderTransitionActive ||
      isDayWaveActive ||
      (renderProgress > 0 && renderProgress < 100);

    if (isDayWaveActive && modelGender !== gender) {
      pathScale = 0.01;
      pathOpacity = 0.0;
    } else if (isBodyRevealActive && modelGender !== gender) {
      pathScale = 0.01;
      pathOpacity = 0.0;
    } else if (isBodyRevealActive) {
      const revealDelta = renderProgress - threshold;

      if (revealDelta <= -15) {
        pathScale = 0.01;
        pathOpacity = 0.0;
      } else if (revealDelta <= -8) {
        const t = smoothstep01((revealDelta + 15) / 7);
        pathScale = 0.01 + 0.19 * t;
        pathOpacity = 0.2 * t;
      } else if (revealDelta <= 3.5) {
        pathScale = 0.2;
        pathOpacity = 0.2;
      } else if (revealDelta <= 8) {
        const t = smoothstep01((revealDelta - 3.5) / 4.5);
        pathScale = 0.2 + 0.3 * t;
        pathOpacity = 0.2 + 0.3 * t;
      } else if (revealDelta <= 15) {
        const t = smoothstep01((revealDelta - 8) / 7);
        pathScale = 0.5 + 0.5 * t;
        pathOpacity = 0.5 + 0.5 * t;
      } else {
        pathScale = 1.0;
        pathOpacity = 1.0;
      }
    } else if (isDayWaveActive) {
      if (dayWaveDelta <= -15) {
        pathScale = 1.0;
        pathOpacity = 1.0;
      } else if (dayWaveDelta < 0) {
        ({ pathScale, pathOpacity } = getWaveRippleProps(
          dayWaveDelta,
          "disappearing",
        ));
      } else {
        ({ pathScale, pathOpacity } = getWaveRippleProps(
          dayWaveDelta,
          "appearing",
        ));
      }
    } else if (isGenderTransitionActive) {
      const waveDelta = transitionWaveProgress - threshold;
      const waveRole: WaveRippleRole =
        modelGender === transitionTargetGender ? "appearing" : "disappearing";
      ({ pathScale, pathOpacity } = getWaveRippleProps(waveDelta, waveRole));
    } else if (!isTransitioning) {
      // At exact 0% and 100% extremes, models must be fully solid with no fading/halo effects
      pathScale = 1.0;
      pathOpacity = isDominant ? 1.0 : 0.0;
    } else if (isDominant) {
      // ── Dominant / Appearing Model: Scales UP from 0.20 to 1.0 ────────────────
      if (absDelta <= 3.5) {
        pathScale = 0.2;
        pathOpacity = 0.2;
      } else if (absDelta <= 8) {
        const t = smoothstep01((absDelta - 3.5) / 4.5);
        pathScale = 0.2 + 0.3 * t; // 0.20 → 0.50
        pathOpacity = 0.2 + 0.3 * t; // 0.20 → 0.50
      } else if (absDelta <= 15) {
        const t = smoothstep01((absDelta - 8) / 7);
        pathScale = 0.5 + 0.5 * t; // 0.50 → 1.0
        pathOpacity = 0.5 + 0.5 * t; // 0.50 → 1.0
      } else {
        pathScale = 1.0;
        if (absDelta <= 24) {
          const t = smoothstep01((24 - absDelta) / 9);
          pathOpacity = 1.0 - 0.22 * t; // 1.0 → 0.78 halo soft opacity
        } else {
          pathOpacity = 1.0;
        }
      }
    } else {
      // ── Non-dominant / Dismissed Model: Collapses and Fades out (No expansion) ──
      if (absDelta <= 3.5) {
        pathScale = 0.2;
        pathOpacity = 0.2;
      } else if (absDelta <= 8) {
        // Keep shrunk at 20% to prevent scaling up
        pathScale = 0.2;
        pathOpacity = 0.2;
      } else if (absDelta <= 15) {
        const t = smoothstep01((absDelta - 8) / 7);
        pathScale = 0.2 * (1 - t); // 0.20 → 0.0
        pathOpacity = 0.2 * (1 - t); // 0.20 → 0.0
      } else {
        pathScale = 0.01;
        pathOpacity = 0.0;
      }
    }

    const isDimmedBySelection =
      selectedMuscle !== null && selectedMuscle !== muscleId;

    // Show traveling shimmer only for the active selected+hovered muscle.
    const shouldShimmer = isSelected && isHovered && !isTransitioning;

    // Keep hidden paths hidden; dim non-selected muscles while a sheet is open.
    pathOpacity =
      pathOpacity <= 0
        ? 0
        : isDimmedBySelection
          ? 0.22
          : isSelected
            ? 1
            : isHovered
              ? 0.84
              : 1;
    pathScale = Math.min(1, Math.max(0.01, pathScale));

    return {
      fill: shouldShimmer ? "url(#bodymap-muscle-shimmer-gradient)" : muscleFill,
      stroke: "transparent",
      strokeWidth: 0,
      className: isHead
        ? ""
        : `${isTransitioning ? "" : "transition-[opacity,fill] duration-300 ease-out"} cursor-pointer`,
      "data-muscle-id": muscleId,
      style: {
        opacity: pathOpacity,
        ...(pathScale < 0.999 && {
          transform: `scale(${pathScale})`,
          transformOrigin:
            scaleOrigin === "top"
              ? "50% 0%"
              : scaleOrigin === "bottom"
                ? "50% 100%"
                : scaleOrigin === "center"
                  ? "50% 50%"
                  : modelGender === "female"
                    ? "50% 0%"
                    : "50% 100%",
          transformBox: "fill-box" as const,
        }),
        pointerEvents: "all",
        ...(maxBlur > 0 &&
          1.0 - pathScale > 0.01 && {
            filter: `blur(${((1.0 - pathScale) * maxBlur).toFixed(2)}px)`,
          }),
      },
      ...(!isHead && {
        onClick: () => {
          setSelectedMuscle((prev) => (prev === muscleId ? null : muscleId));
        },
      }),
    };
  };

  const getClosestMuscleFromPointer = (
    root: HTMLDivElement,
    clientX: number,
    clientY: number,
  ): { muscleId: number | null; pathEl: SVGPathElement | null } => {
    const paths = Array.from(
      root.querySelectorAll<SVGPathElement>("path[data-muscle-id]"),
    );

    let closestMuscle: number | null = null;
    let closestPathEl: SVGPathElement | null = null;
    let closestDistance = BODY_HOVER_MAX_DISTANCE;

    for (const path of paths) {
      const muscleId = Number(path.dataset.muscleId);
      if (!muscleId || Number.isNaN(muscleId)) continue;

      const styles = window.getComputedStyle(path);
      if (Number(styles.opacity) <= 0) continue;

      const svg = path.ownerSVGElement;
      const matrix = svg?.getScreenCTM();
      if (!svg || !matrix) continue;

      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const svgPoint = point.matrixTransform(matrix.inverse());

      if (path.isPointInFill?.(svgPoint)) {
        return { muscleId, pathEl: path };
      }

      const length = path.getTotalLength();
      const samples = Math.max(8, Math.ceil(length / BODY_HOVER_SAMPLE_COUNT));

      for (let i = 0; i <= samples; i += 1) {
        const pathPoint = path.getPointAtLength((length * i) / samples);
        const screenPoint = pathPoint.matrixTransform(matrix);
        const distance = Math.hypot(
          screenPoint.x - clientX,
          screenPoint.y - clientY,
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestMuscle = muscleId;
          closestPathEl = path;
        }
      }
    }

    return { muscleId: closestMuscle, pathEl: closestPathEl };
  };

  const handleBodyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      bodyRevealProgress < 1 ||
      ((previousDayIndex !== null || dayWaveLevels !== null) &&
        dayWaveProgress < 100)
    ) {
      return;
    }
    const root = e.currentTarget;
    const rootRect = root.getBoundingClientRect();
    lastBodyPointerRef.current = { x: e.clientX, y: e.clientY };
    const { muscleId: nextMuscle, pathEl } = getClosestMuscleFromPointer(
      root,
      e.clientX,
      e.clientY,
    );

    if (pathEl) {
      const pathRect = pathEl.getBoundingClientRect();
      const centerX = pathRect.left + pathRect.width / 2;
      const topY = pathRect.top;

      const padding = 8;
      const localX = centerX - rootRect.left;
      const localY = topY - rootRect.top;
      const clampedX = Math.min(
        rootRect.width - padding,
        Math.max(padding, localX),
      );
      const clampedY = Math.max(padding, localY);

      tooltipX.set(clampedX);
      tooltipY.set(clampedY);
    }

    setHoveredMuscle(nextMuscle);
  };

  React.useEffect(() => {
    if (selectedMuscle !== null) return;
    const root = bodyHoverRootRef.current;
    const last = lastBodyPointerRef.current;
    if (!root || !last) return;

    const rect = root.getBoundingClientRect();
    const within =
      last.x >= rect.left &&
      last.x <= rect.right &&
      last.y >= rect.top &&
      last.y <= rect.bottom;
    if (!within) return;

    const { muscleId } = getClosestMuscleFromPointer(root, last.x, last.y);
    setHoveredMuscle(muscleId);
    setIsHoveringBody(true);
  }, [selectedMuscle]);

  const updateMapFocusOrigin = React.useCallback(() => {
    if (selectedMuscle === null) {
      setMapFocusOrigin(null);
      return;
    }

    const root = bodyHoverRootRef.current;
    if (!root) return;

    const paths = Array.from(
      root.querySelectorAll<SVGPathElement>(
        `path[data-muscle-id="${selectedMuscle}"]`,
      ),
    );

    let bestPath: SVGPathElement | null = null;
    let bestOpacity = 0;
    for (const path of paths) {
      const opacity = Number(window.getComputedStyle(path).opacity);
      if (opacity > bestOpacity) {
        bestOpacity = opacity;
        bestPath = path;
      }
    }

    if (!bestPath || bestOpacity <= 0) return;

    const pathRect = bestPath.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    setMapFocusOrigin({
      x: pathRect.left + pathRect.width / 2 - rootRect.left,
      y: pathRect.top + pathRect.height / 2 - rootRect.top,
    });
  }, [selectedMuscle]);

  React.useLayoutEffect(() => {
    updateMapFocusOrigin();
    if (selectedMuscle === null) return;

    const root = bodyHoverRootRef.current;
    if (!root) return;

    const frame = requestAnimationFrame(updateMapFocusOrigin);
    window.addEventListener("resize", updateMapFocusOrigin);
    const observer = new ResizeObserver(updateMapFocusOrigin);
    observer.observe(root);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateMapFocusOrigin);
      observer.disconnect();
    };
  }, [selectedMuscle, updateMapFocusOrigin, gender, progress]);

  const selectedWorkoutDay =
    WEEK_WORKOUT_DAYS[selectedDayIndex] ?? WEEK_WORKOUT_DAYS[4];
  const previousWorkoutDay =
    previousDayIndex === null ? null : WEEK_WORKOUT_DAYS[previousDayIndex];
  const selectedDetails = selectedMuscle
    ? MUSCLE_DETAILS[selectedMuscle]
    : null;
  const selectedWorkLevel = selectedMuscle
    ? weekView
      ? (WEEK_AGGREGATE_WORK_LEVELS[selectedMuscle] ?? 0)
      : (selectedWorkoutDay.workLevels[selectedMuscle] ?? 0)
    : 0;

  const todayWeekDay = WEEK_WORKOUT_DAYS.find((day) => day.today === true);
  const todayDate = todayWeekDay?.date ?? null;

  type CompletedExerciseLog = ExerciseLog & { daysAgo?: number };
  const completedExercises: CompletedExerciseLog[] =
    selectedMuscle && selectedWorkLevel > 0
      ? weekView
        ? WEEK_WORKOUT_DAYS.flatMap((day) => {
            const logsForDay =
              EXERCISE_LOGS[day.weekday]?.[selectedMuscle] ?? [];

            // Only show logs for days where we consider the muscle "worked".
            const levelForDay = day.workLevels[selectedMuscle] ?? 0;
            if (levelForDay <= 0 || logsForDay.length === 0) return [];

            const rawDaysAgo = todayDate === null ? null : todayDate - day.date;
            const daysAgo =
              rawDaysAgo === null ? undefined : Math.max(0, rawDaysAgo);

            return logsForDay.map((log) => ({ ...log, daysAgo }));
          })
        : (
            EXERCISE_LOGS[selectedWorkoutDay.weekday]?.[selectedMuscle] ?? []
          ).map((log) => ({ ...log }))
      : [];
  const completedExerciseNames = new Set(
    completedExercises.map(({ exercise }) => exercise),
  );
  const potentialExercises =
    selectedDetails?.exercises.filter(
      (exercise) => !completedExerciseNames.has(exercise),
    ) ?? [];
  const isDayWaveTransitionActive =
    bodyRevealProgress >= 1 &&
    transitionTargetGender === null &&
    dayWaveProgress < 100 &&
    (previousDayIndex !== null || dayWaveLevels !== null);
  const hideMaleModel =
    progress >= 100 &&
    transitionTargetGender === null &&
    !isDayWaveTransitionActive;
  const hideFemaleModel =
    progress <= 0 &&
    transitionTargetGender === null &&
    !isDayWaveTransitionActive;
  const scaleOriginIndex = SCALE_ORIGIN_OPTIONS.findIndex(
    (option) => option.key === scaleOrigin,
  );
  const easingIndex = EASING_OPTIONS.findIndex(
    (option) => option.key === previewedEasingType,
  );
  const hoveredDetails = hoveredMuscle
    ? (MUSCLE_DETAILS[hoveredMuscle] ?? null)
    : null;

  return (
    <div className="flex w-full justify-center">
      <motion.div
        layout
        transition={SETTINGS_LAYOUT_TRANSITION}
        className={`mx-auto flex min-h-0 w-full flex-col gap-9 rounded-[24px] bg-[#ecedeb] sm:p-0 lg:p-9 ${
          showSettings
            ? "max-w-[69rem] flex-1 max-[676px]:min-h-0 lg:min-h-[48.0625rem]"
            : "max-w-[36rem]"
        }`}
      >
        <style>{ANIMATION_CONTROL_STYLES}</style>
        <LayoutGroup id="bodymap-settings-layout">
          <motion.div
            layout
            transition={SETTINGS_LAYOUT_TRANSITION}
            className={`font-sans w-full ${
              showSettings
                ? "grid min-h-0 w-full flex-1 grid-cols-1 content-start items-start gap-6 max-[676px]:justify-items-center min-[677px]:grid-cols-[349px_minmax(303px,1fr)] lg:gap-9"
                : "flex flex-col items-center"
            }`}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {showSettings ? (
                <motion.div
                  key="bodymap-settings"
                  layout="position"
                  initial={{
                    opacity: 0,
                    x: -20,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -12,
                  }}
                  transition={SETTINGS_PANEL_TRANSITION}
                  className="mx-auto flex w-[349px] shrink-0 grow-0 basis-[349px] flex-col max-[676px]:mx-auto"
                >
                  <AnimationControlPanel
                    onClose={() => setShowSettings(false)}
                    onReplay={replayBodyLoad}
                    onReset={handleReset}
                    progress={progress}
                    onGenderProgressChange={(val) => {
                      stopAnimation();
                      setProgress(val);
                      if (val < 50) {
                        setGender("male");
                      } else {
                        setGender("female");
                      }
                    }}
                    scaleOrigin={scaleOrigin}
                    scaleOriginIndex={scaleOriginIndex}
                    scaleOriginReplayTick={scaleOriginReplayTick}
                    onScaleOriginChange={(key) => {
                      setScaleOrigin(key);
                      setScaleOriginReplayTick((tick) => tick + 1);
                    }}
                    animDuration={animDuration}
                    onAnimDurationChange={setAnimDuration}
                    maxBlur={maxBlur}
                    onMaxBlurChange={setMaxBlur}
                    displayBezier={displayBezier}
                    previewedEasingType={previewedEasingType}
                    easingIndex={easingIndex}
                    onEasingSelect={(key) => {
                      setEasingType(key);
                      setHoveredEasingType(null);
                    }}
                    onEasingPreview={previewEasingOption}
                    onEasingPreviewEnd={() => setHoveredEasingType(null)}
                    advancedEditor={
                      <>
                      {/* Easing Curve Graph */}
                      <div className="hidden">
                        <div className="flex justify-between items-center text-[0.6rem] font-bold uppercase tracking-wider text-muted/80">
                          <span>Curve Visualizer</span>
                          <span
                            className="font-mono text-[0.55rem]"
                            style={{ color: ACTIVE_COLOR }}
                          >
                            y = f(x)
                          </span>
                        </div>
                        <div className="relative h-14 w-full rounded-xl border border-[#111111]/5 bg-[#111111]/[0.02] overflow-hidden flex items-center justify-center">
                          {/* Subtle Grid Lines */}
                          <div className="absolute inset-0 grid grid-cols-4 grid-rows-2 pointer-events-none opacity-40">
                            <div className="border-r border-b border-[#111111]/5" />
                            <div className="border-r border-b border-[#111111]/5" />
                            <div className="border-r border-b border-[#111111]/5" />
                            <div className="border-b border-[#111111]/5" />
                            <div className="border-r border-[#111111]/5" />
                            <div className="border-r border-[#111111]/5" />
                            <div className="border-r border-[#111111]/5" />
                            <div className="" />
                          </div>

                          <svg
                            className="w-full h-full"
                            viewBox="0 0 200 64"
                            preserveAspectRatio="none"
                          >
                            <defs>
                              <linearGradient
                                id="curveGrad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={ACTIVE_COLOR}
                                  stopOpacity="0.25"
                                />
                                <stop
                                  offset="100%"
                                  stopColor={ACTIVE_COLOR}
                                  stopOpacity="0.0"
                                />
                              </linearGradient>
                            </defs>

                            {/* Gradient Area under curve */}
                            <path
                              d={(() => {
                                const points = [];
                                const easeFn = getActiveEasingFn();
                                // Sample points
                                for (let i = 0; i <= 30; i++) {
                                  const x = i / 30;
                                  const y = easeFn(x);
                                  // Map coordinates
                                  const svgX = 10 + x * 180;
                                  const svgY = 56 - y * 48;
                                  points.push(
                                    `${i === 0 ? "M" : "L"} ${svgX.toFixed(1)} ${svgY.toFixed(1)}`,
                                  );
                                }
                                // Close the path for gradient fill
                                points.push(`L 190 56`);
                                points.push(`L 10 56`);
                                points.push(`Z`);
                                return points.join(" ");
                              })()}
                              fill="url(#curveGrad)"
                            />

                            {/* Easing Curve Line */}
                            <path
                              d={(() => {
                                const points = [];
                                const easeFn = getActiveEasingFn();
                                for (let i = 0; i <= 30; i++) {
                                  const x = i / 30;
                                  const y = easeFn(x);
                                  const svgX = 10 + x * 180;
                                  const svgY = 56 - y * 48;
                                  points.push(
                                    `${i === 0 ? "M" : "L"} ${svgX.toFixed(1)} ${svgY.toFixed(1)}`,
                                  );
                                }
                                return points.join(" ");
                              })()}
                              fill="none"
                              stroke={ACTIVE_COLOR}
                              strokeWidth="0"
                              strokeLinecap="round"
                            />

                            {/* Animated Tracking Dot */}
                            {(() => {
                              const easeFn = getActiveEasingFn();
                              const x = progress / 100;
                              const y = easeFn(x);
                              const svgX = 10 + x * 180;
                              const svgY = 56 - y * 48;
                              return (
                                <circle
                                  cx={svgX}
                                  cy={svgY}
                                  r="4.5"
                                  fill={ACTIVE_COLOR}
                                  className="transition-all duration-75"
                                  style={{
                                    filter: `drop-shadow(0 0 3px rgba(${ACTIVE_RGB}, 0.8))`,
                                  }}
                                />
                              );
                            })()}
                          </svg>
                        </div>
                      </div>

                      {/* Custom Bezier Customizer */}
                      {(() => {
                        const currentCoords = getActiveBezierCoords();
                        const isNonBezier =
                          easingType === "easeOutElastic" ||
                          easingType === "easeOutBounce";
                        return (
                          <div className="relative hidden flex-col gap-2 rounded-xl border border-[#111111]/5 bg-[#111111]/[0.02] p-3 animate-[fadeIn_0.2s_ease-out]">
                            {/* Glassmorphic overlay for physics-based curves */}
                            {isNonBezier && (
                              <div
                                onClick={() => setEasingType("custom")}
                                className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center cursor-pointer rounded-xl bg-white/70 backdrop-blur-[2px] transition-all duration-200 hover:bg-white/60"
                              >
                                <svg
                                  className="w-6 h-6 mb-1 transition-transform duration-200 hover:scale-110"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  viewBox="0 0 24 24"
                                  style={{ color: ACTIVE_COLOR }}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                  />
                                </svg>
                                <span className="text-[0.6rem] font-black uppercase tracking-wider text-fg mb-0.5">
                                  Physics Easing Active
                                </span>
                                <span className="text-[0.52rem] font-bold text-muted max-w-[170px] leading-tight">
                                  Adjusting handles or clicking here will switch
                                  to{" "}
                                  <strong style={{ color: ACTIVE_COLOR }}>
                                    Custom Bezier
                                  </strong>
                                  .
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[0.65rem] font-bold text-fg/80 border-b border-[#111111]/5 pb-1.5 mb-1.5">
                              <span>Cubic Bezier Customizer</span>
                              <div className="flex gap-0.5 bg-[#111111]/5 p-0.5 rounded-md select-none">
                                <button
                                  onClick={() => setEditorEngine("craft")}
                                  title="Craft Pointer API Editor (Supports Mobile Drag)"
                                  className={`px-1.5 py-0.5 rounded-[3px] text-[0.52rem] font-black uppercase tracking-tight transition-all duration-150 ${
                                    editorEngine === "craft"
                                      ? "bg-white text-fg shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                                      : "text-muted hover:text-fg"
                                  }`}
                                >
                                  Craft
                                </button>
                                <button
                                  onClick={() => setEditorEngine("package")}
                                  title="bezier-easing-editor Package from NPM"
                                  className={`px-1.5 py-0.5 rounded-[3px] text-[0.52rem] font-black uppercase tracking-tight transition-all duration-150 ${
                                    editorEngine === "package"
                                      ? "bg-white text-fg shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                                      : "text-muted hover:text-fg"
                                  }`}
                                >
                                  NPM Package
                                </button>
                              </div>
                            </div>

                            <div className="flex gap-4 items-center">
                              {/* Visual Drag Graph / npm BezierEditor */}
                              <div className="flex flex-col items-center gap-1">
                                <div className="relative w-28 h-28 border border-[#111111]/8 bg-white rounded-xl shadow-sm overflow-hidden select-none">
                                  {editorEngine === "craft" ? (
                                    <svg
                                      className="w-full h-full select-none touch-none"
                                      viewBox="0 0 160 160"
                                      style={{ touchAction: "none" }}
                                    >
                                      {/* Grid lines */}
                                      <line
                                        x1="20"
                                        y1="110"
                                        x2="140"
                                        y2="110"
                                        stroke="#111111"
                                        strokeOpacity="0.06"
                                        strokeWidth="1"
                                        strokeDasharray="2 2"
                                      />
                                      <line
                                        x1="20"
                                        y1="50"
                                        x2="140"
                                        y2="50"
                                        stroke="#111111"
                                        strokeOpacity="0.06"
                                        strokeWidth="1"
                                        strokeDasharray="2 2"
                                      />
                                      <line
                                        x1="20"
                                        y1="20"
                                        x2="20"
                                        y2="140"
                                        stroke="#111111"
                                        strokeOpacity="0.06"
                                        strokeWidth="1"
                                        strokeDasharray="2 2"
                                      />
                                      <line
                                        x1="140"
                                        y1="20"
                                        x2="140"
                                        y2="140"
                                        stroke="#111111"
                                        strokeOpacity="0.06"
                                        strokeWidth="1"
                                        strokeDasharray="2 2"
                                      />

                                      {/* Linear diagonal reference */}
                                      <line
                                        x1="20"
                                        y1="110"
                                        x2="140"
                                        y2="50"
                                        stroke="#111111"
                                        strokeOpacity="0.05"
                                        strokeWidth="1"
                                      />

                                      {/* Control point 1 line */}
                                      <line
                                        x1="20"
                                        y1="110"
                                        x2={20 + currentCoords.x1 * 120}
                                        y2={20 + (1.5 - currentCoords.y1) * 60}
                                        stroke={ACTIVE_COLOR}
                                        strokeOpacity="0.3"
                                        strokeWidth="1"
                                        strokeDasharray="2 2"
                                      />

                                      {/* Control point 2 line */}
                                      <line
                                        x1="140"
                                        y1="50"
                                        x2={20 + currentCoords.x2 * 120}
                                        y2={20 + (1.5 - currentCoords.y2) * 60}
                                        stroke={ACTIVE_COLOR}
                                        strokeOpacity="0.3"
                                        strokeWidth="1"
                                        strokeDasharray="2 2"
                                      />

                                      {/* Cubic Bezier curve path */}
                                      <path
                                        d={`M 20 110 C ${20 + currentCoords.x1 * 120} ${20 + (1.5 - currentCoords.y1) * 60} ${20 + currentCoords.x2 * 120} ${20 + (1.5 - currentCoords.y2) * 60} 140 50`}
                                        fill="none"
                                        stroke={ACTIVE_COLOR}
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                      />

                                      {/* Control handle 1 (Drag source) */}
                                      <circle
                                        cx={20 + currentCoords.x1 * 120}
                                        cy={20 + (1.5 - currentCoords.y1) * 60}
                                        r="6.5"
                                        fill="white"
                                        stroke={ACTIVE_COLOR}
                                        strokeWidth="2.5"
                                        className="cursor-grab active:cursor-grabbing hover:scale-110 transition-transform duration-100 touch-none"
                                        style={{
                                          filter:
                                            "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
                                          touchAction: "none",
                                        }}
                                        onPointerDown={(e) =>
                                          handlePointerDown(e, 1)
                                        }
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                        onPointerCancel={handlePointerUp}
                                      />

                                      {/* Control handle 2 (Drag source) */}
                                      <circle
                                        cx={20 + currentCoords.x2 * 120}
                                        cy={20 + (1.5 - currentCoords.y2) * 60}
                                        r="6.5"
                                        fill="white"
                                        stroke={ACTIVE_COLOR}
                                        strokeWidth="2.5"
                                        className="cursor-grab active:cursor-grabbing hover:scale-110 transition-transform duration-100 touch-none"
                                        style={{
                                          filter:
                                            "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
                                          touchAction: "none",
                                        }}
                                        onPointerDown={(e) =>
                                          handlePointerDown(e, 2)
                                        }
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                        onPointerCancel={handlePointerUp}
                                      />
                                    </svg>
                                  ) : (
                                    isMounted && (
                                      <div className="w-full h-full p-1 select-none">
                                        {/* @ts-ignore */}
                                        <BezierEditor
                                          value={[
                                            currentCoords.x1,
                                            currentCoords.y1,
                                            currentCoords.x2,
                                            currentCoords.y2,
                                          ]}
                                          onChange={(val: number[]) => {
                                            if (
                                              Array.isArray(val) &&
                                              val.length === 4
                                            ) {
                                              const x1 = Math.min(
                                                1,
                                                Math.max(0, val[0]),
                                              );
                                              const y1 = Math.min(
                                                1.5,
                                                Math.max(-0.5, val[1]),
                                              );
                                              const x2 = Math.min(
                                                1,
                                                Math.max(0, val[2]),
                                              );
                                              const y2 = Math.min(
                                                1.5,
                                                Math.max(-0.5, val[3]),
                                              );
                                              setCustomBezier({
                                                x1,
                                                y1,
                                                x2,
                                                y2,
                                              });
                                              if (easingType !== "custom")
                                                setEasingType("custom");
                                            }
                                          }}
                                          width={102}
                                          height={102}
                                          padding={[14, 5, 14, 12]}
                                          handleRadius={3.8}
                                          handleStroke={1.8}
                                          background="transparent"
                                          gridColor="rgba(17, 17, 17, 0.05)"
                                          curveColor={ACTIVE_COLOR}
                                          curveWidth={2}
                                          handleColor={ACTIVE_COLOR}
                                          progress={progress / 100}
                                          progressColor={`rgba(${ACTIVE_RGB}, 0.12)`}
                                          textStyle={{ display: "none" }} // hide text inside the small SVG
                                          className="w-full h-full"
                                        />
                                      </div>
                                    )
                                  )}
                                </div>
                                <span className="text-[0.52rem] font-bold text-muted uppercase tracking-wider">
                                  {editorEngine === "craft"
                                    ? "Drag Handles"
                                    : "NPM Package"}
                                </span>
                              </div>

                              {/* Right Column: Copy/Paste Box + Numeric Inputs */}
                              <div className="flex-1 flex flex-col gap-2">
                                {/* Interactive Text Input */}
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted">
                                    Paste / Copy Curve
                                  </span>
                                  <input
                                    type="text"
                                    value={bezierInputText}
                                    onChange={(e) => {
                                      setBezierInputText(e.target.value);
                                      // Parse draft text
                                      const match = e.target.value.match(
                                        /([0-9.-]+)\s*,\s*([0-9.-]+)\s*,\s*([0-9.-]+)\s*,\s*([0-9.-]+)/,
                                      );
                                      if (match) {
                                        const x1 = Math.min(
                                          1,
                                          Math.max(0, parseFloat(match[1])),
                                        );
                                        const y1 = Math.min(
                                          1.5,
                                          Math.max(-0.5, parseFloat(match[2])),
                                        );
                                        const x2 = Math.min(
                                          1,
                                          Math.max(0, parseFloat(match[3])),
                                        );
                                        const y2 = Math.min(
                                          1.5,
                                          Math.max(-0.5, parseFloat(match[4])),
                                        );
                                        if (
                                          !isNaN(x1) &&
                                          !isNaN(y1) &&
                                          !isNaN(x2) &&
                                          !isNaN(y2)
                                        ) {
                                          setCustomBezier({ x1, y1, x2, y2 });
                                          if (easingType !== "custom")
                                            setEasingType("custom");
                                        }
                                      }
                                    }}
                                    placeholder="0.25, 0.10, 0.25, 1.00"
                                    className="w-full rounded-lg border border-[#111111]/10 bg-white px-2 py-1 font-mono text-[0.6rem] text-fg focus:outline-none transition-all duration-200"
                                    style={{ borderBottomColor: ACTIVE_COLOR }}
                                  />
                                </div>

                                {/* Compact slider coordinates */}
                                <div className="flex flex-col gap-1">
                                  {/* Handle 1 Sliders */}
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex justify-between text-[0.5rem] font-bold text-muted uppercase">
                                        <span>x1</span>
                                        <span className="font-mono text-fg">
                                          {currentCoords.x1.toFixed(2)}
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={currentCoords.x1}
                                        onChange={(e) =>
                                          updateSingleCoord(
                                            "x1",
                                            parseFloat(e.target.value),
                                          )
                                        }
                                        className="w-full h-0.5 rounded bg-[#111111]/10 cursor-pointer outline-none"
                                        style={{ accentColor: ACTIVE_COLOR }}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex justify-between text-[0.5rem] font-bold text-muted uppercase">
                                        <span>y1</span>
                                        <span className="font-mono text-fg">
                                          {currentCoords.y1.toFixed(2)}
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min="-0.5"
                                        max="1.5"
                                        step="0.01"
                                        value={currentCoords.y1}
                                        onChange={(e) =>
                                          updateSingleCoord(
                                            "y1",
                                            parseFloat(e.target.value),
                                          )
                                        }
                                        className="w-full h-0.5 rounded bg-[#111111]/10 cursor-pointer outline-none"
                                        style={{ accentColor: ACTIVE_COLOR }}
                                      />
                                    </div>
                                  </div>

                                  {/* Handle 2 Sliders */}
                                  <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex justify-between text-[0.5rem] font-bold text-muted uppercase">
                                        <span>x2</span>
                                        <span className="font-mono text-fg">
                                          {currentCoords.x2.toFixed(2)}
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={currentCoords.x2}
                                        onChange={(e) =>
                                          updateSingleCoord(
                                            "x2",
                                            parseFloat(e.target.value),
                                          )
                                        }
                                        className="w-full h-0.5 rounded bg-[#111111]/10 cursor-pointer outline-none"
                                        style={{ accentColor: ACTIVE_COLOR }}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex justify-between text-[0.5rem] font-bold text-muted uppercase">
                                        <span>y2</span>
                                        <span className="font-mono text-fg">
                                          {currentCoords.y2.toFixed(2)}
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min="-0.5"
                                        max="1.5"
                                        step="0.01"
                                        value={currentCoords.y2}
                                        onChange={(e) =>
                                          updateSingleCoord(
                                            "y2",
                                            parseFloat(e.target.value),
                                          )
                                        }
                                        className="w-full h-0.5 rounded bg-[#111111]/10 cursor-pointer outline-none"
                                        style={{ accentColor: ACTIVE_COLOR }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}


                      </>
                    }
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Right Column: Body Map */}
            <motion.div
              layout="position"
              transition={SETTINGS_LAYOUT_TRANSITION}
              className={`flex min-h-0 min-w-0 flex-col ${
                showSettings
                  ? "min-h-0 w-full max-[676px]:mx-auto max-[676px]:max-w-[36rem] min-[677px]:min-w-[303px] min-[677px]:h-full"
                  : "w-full gap-2 sm:gap-3"
              }`}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {!showSettings ? (
                  <motion.div
                    key="bodymap-normal-header"
                    layout="position"
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                    transition={SETTINGS_PANEL_TRANSITION}
                    className="flex w-full flex-col items-center gap-3 px-1"
                  >
                    <div className="w-full text-center">
                      <h2 className="font-heading text-[32px] font-black leading-none tracking-[-0.025em] text-[#111]">
                        Muscle Map
                      </h2>
                      <p className="mt-2 text-[13.333px] font-medium leading-[18px] text-black/50">
                        Press on days to see body activations for days
                        separately.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <LiquidGlassButton
                        onClick={() => setShowSettings(true)}
                        size="compact"
                        aria-label="Play with settings"
                      >
                        Play with settings
                      </LiquidGlassButton>
                      <LiquidGlassButton
                        onClick={replayBodyLoad}
                        size="compact"
                        className="gap-1.5"
                        aria-label="Replay body load animation"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 10 10"
                          className="size-3.5 shrink-0 inline -mt-0.5 me-1"
                          aria-hidden="true"
                        >
                          <path
                            fill="currentColor"
                            d="M3.3 6.9V3q0-.5.5-.5h.4l3 1.8q.4.3.4.6t-.4.6l-3 1.7-.4.1q-.5 0-.5-.5"
                          />
                        </svg>
                        Replay
                      </LiquidGlassButton>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <motion.div
                layout="position"
                transition={SETTINGS_LAYOUT_TRANSITION}
                className={`relative flex w-full flex-col items-center gap-1 overflow-hidden rounded-[3rem] border-0 bg-white px-6 py-6 sm:px-8 ${
                  showSettings
                    ? "h-auto justify-center min-[677px]:h-full min-[677px]:min-h-0"
                    : "min-h-[22rem] flex-1 justify-start lg:min-h-[36rem]"
                }`}
              >
                <div
                  className="absolute -z-10 h-64 w-64 rounded-full blur-3xl transition-all duration-500"
                  style={{
                    background: `radial-gradient(circle at center, rgba(${ACTIVE_RGB}, 0.12), transparent 70%)`,
                  }}
                />

                <div className="relative z-10">
                  <WeekCalendar
                    selectedIndex={selectedDayIndex}
                    onSelect={animateDayChange}
                    weekView={weekView}
                    onWeekViewToggle={toggleWeekView}
                  />
                </div>

                <div className="relative z-0 flex w-full flex-col items-center gap-1">
                  <motion.div
                    className="relative mt-2 flex h-11 w-[150px] rounded-full bg-[#E4E4E4] p-0.5 select-none"
                    animate={{
                      opacity: selectedMuscle !== null ? 0 : 1,
                      filter:
                        selectedMuscle !== null ? "blur(10px)" : "blur(0px)",
                    }}
                    transition={
                      selectedMuscle !== null
                        ? MAP_SELECTION_ENTER_TRANSITION
                        : MAP_SELECTION_EXIT_TRANSITION
                    }
                    style={{
                      pointerEvents: selectedMuscle !== null ? "none" : "auto",
                    }}
                  >
                    <button
                      onClick={selectMale}
                      className={`font-sans relative z-10 flex flex-1 items-center justify-center rounded-[20px] text-sm transition-[background-color,color,transform] duration-150 ease-out hover:bg-white/35 hover:scale-[1.02] active:scale-[0.97] ${
                        gender === "male"
                          ? "font-semibold text-fg"
                          : "font-medium text-muted"
                      }`}
                    >
                      Male
                    </button>
                    <button
                      onClick={selectFemale}
                      className={`font-sans relative z-10 flex flex-1 items-center justify-center rounded-[20px] text-sm transition-[background-color,color,transform] duration-150 ease-out hover:bg-white/35 hover:scale-[1.02] active:scale-[0.97] ${
                        gender === "female"
                          ? "font-semibold text-fg"
                          : "font-medium text-muted"
                      }`}
                    >
                      Female
                    </button>

                    {/* Sliding backdrop */}
                    <div
                      className="absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-[20px] bg-white shadow-sm transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
                      style={{
                        transform:
                          gender === "female"
                            ? "translateX(100%)"
                            : "translateX(0)",
                      }}
                    />
                  </motion.div>

                  {/* Overlay container: fixed height so both absolute SVGs stay within bounds */}
                  <motion.div
                    className="relative w-full overflow-hidden"
                    style={{
                      height: "360px",
                      transformOrigin: mapFocusOrigin
                        ? `50% ${mapFocusOrigin.y}px`
                        : "50% 50%",
                      transition: `transform-origin ${MAP_SELECTION_ENTER_TRANSITION.duration}s cubic-bezier(${MAP_SELECTION_ENTER_TRANSITION.ease.join(", ")})`,
                    }}
                    ref={bodyHoverRootRef}
                    animate={{
                      transform: getMapSelectionTransform(
                        selectedMuscle,
                        shouldReduceMotion ?? false,
                      ),
                    }}
                    transition={
                      selectedMuscle !== null
                        ? MAP_SELECTION_ENTER_TRANSITION
                        : MAP_SELECTION_EXIT_TRANSITION
                    }
                    onPointerMove={handleBodyPointerMove}
                    onPointerLeave={() => {
                      setHoveredMuscle(null);
                      setIsHoveringBody(false);
                      lastBodyPointerRef.current = null;
                    }}
                    onPointerEnter={() => setIsHoveringBody(true)}
                  >
                    {/* Simple tooltip for muscle name (no transitions) */}
                    {hoveredDetails && isHoveringBody && (
                      <motion.div
                        className="pointer-events-none absolute z-10 inline-flex items-center rounded-lg bg-[#111111]/90 px-1.5 py-1 text-[0.6rem] font-semibold leading-none tracking-tight text-white shadow-[0_6px_18px_rgba(0,0,0,0.2)] max-sm:hidden"
                        style={
                          shouldReduceMotion
                            ? {
                                left: "50%",
                                top: "8px",
                                transform: "translateX(-50%)",
                              }
                            : {
                                left: tooltipXSpring,
                                top: tooltipYSpring,
                                transform: "translate(-50%, calc(-100% - 8px))",
                              }
                        }
                      >
                        <span>{hoveredDetails.name}</span>
                      </motion.div>
                    )}

                    {/* Male — pointer-events active when male side is dominant */}
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        visibility: hideMaleModel ? "hidden" : "visible",
                        pointerEvents:
                          progress <= 50 &&
                          bodyRevealProgress === 1 &&
                          !isDayWaveTransitionActive
                            ? "auto"
                            : "none",
                      }}
                      aria-hidden={hideMaleModel}
                    >
                      <MuscleMapMaleBodySvg
                        progress={progress}
                        width={380}
                        height={380}
                        defaultColor={ACTIVE_COLOR}
                        getMuscleProps={(muscleId) =>
                          getMuscleProps(muscleId, "male")
                        }
                      />
                    </div>

                    {/* Female — pointer-events active when female side is dominant */}
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        visibility: hideFemaleModel ? "hidden" : "visible",
                        pointerEvents:
                          progress > 50 &&
                          bodyRevealProgress === 1 &&
                          !isDayWaveTransitionActive
                            ? "auto"
                            : "none",
                      }}
                      aria-hidden={hideFemaleModel}
                    >
                      <FemaleBodySvg
                        progress={progress}
                        width={380}
                        height={380}
                        defaultColor={ACTIVE_COLOR}
                        getMuscleProps={(muscleId) =>
                          getMuscleProps(muscleId, "female")
                        }
                      />
                    </div>
                  </motion.div>
                </div>

                <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2">
                  {MUSCLE_WORK_LEGEND.map(({ label, color }) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-[rgba(60,60,67,0.68)]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black/5"
                        style={{ backgroundColor: color }}
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                <AnimatePresence>
                  {selectedDetails ? (
                    <React.Fragment key={selectedMuscle}>
                      <button
                        type="button"
                        aria-label="Close muscle details"
                        onClick={() => setSelectedMuscle(null)}
                        className="absolute inset-0 z-20 cursor-default border-0 bg-transparent p-0"
                      />
                      <motion.div
                        initial={{
                          transform: "translateY(105%) scale(0.98)",
                          opacity: 0,
                          filter: "blur(2px)",
                        }}
                        animate={{
                          transform: "translateY(0%) scale(1)",
                          opacity: 1,
                          filter: "blur(0px)",
                        }}
                        exit={{
                          transform: "translateY(105%) scale(0.99)",
                          opacity: 0,
                          filter: "blur(1px)",
                        }}
                        transition={{
                          duration: 0.26,
                          ease: [0.32, 0.72, 0, 1],
                        }}
                        className="absolute inset-x-3 bottom-3 z-30 max-h-[72%] overflow-hidden rounded-[1.65rem] border border-white/30 bg-white/8 shadow-[0_18px_52px_rgba(17,17,17,0.18)] backdrop-blur-[16px] backdrop-saturate-175 sm:inset-x-5 sm:bottom-5"
                      >
                        <div className="flex max-h-[inherit] flex-col">
                          <div className="flex items-start justify-between gap-4 border-b border-[#111111]/8 px-5 pb-3 pt-4">
                            <div>
                              <h3 className="mt-1 font-heading text-[19.03px] font-bold leading-[23.79px] text-black">
                                {selectedDetails.name}
                              </h3>
                            </div>
                            <button
                              type="button"
                              aria-label="Close muscle details"
                              onClick={() => setSelectedMuscle(null)}
                              className="media-lightbox-control-btn  flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[#111111]/5 p-0 text-fg backdrop-blur-sm transition-[background-color,transform] duration-220 ease-out hover:bg-[#111111]/10 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg active:scale-97"
                            >
                              <svg
                                aria-hidden="true"
                                className="size-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                              >
                                <path d="M6 6l12 12M18 6L6 18" />
                              </svg>
                            </button>
                          </div>

                          <div className="overflow-y-auto px-5 py-4">
                            <section>
                              {completedExercises.length > 0 ? (
                                <>
                                  <h4 className="text-[13.333px] font-medium leading-[18px] text-black/50">
                                    Exercises Done
                                  </h4>
                                  <div className="mt-1.5 grid gap-2">
                                    {completedExercises.map((log, idx) => (
                                      <div
                                        key={`${log.exercise}-${log.daysAgo ?? "na"}-${log.sets}-${log.reps}-${log.weight ?? ""}-${idx}`}
                                        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-[#111111]/8 bg-white/60 px-3 py-2 text-[0.8125rem] font-semibold text-fg"
                                      >
                                        <span>{log.exercise}</span>
                                        <span className="text-[0.75rem] font-medium tracking-normal text-black/50">
                                          {log.sets} sets of {log.weight} ×
                                          {log.reps ? ` ${log.reps}` : ""}
                                          {typeof log.daysAgo === "number" &&
                                            ` • ${
                                              log.daysAgo === 0
                                                ? "today"
                                                : `${log.daysAgo} day${
                                                    log.daysAgo === 1 ? "" : "s"
                                                  } ago`
                                            }`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <p className="mt-2 text-pretty rounded-lg bg-[#111111]/5 px-3 py-2 text-[0.8125rem] font-medium text-stone-700">
                                  <svg
                                    className="inline pe-2 size-7 text-stone-400"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 27 18"
                                  >
                                    <path
                                      fill="currentColor"
                                      fillOpacity=".8"
                                      fillRule="evenodd"
                                      d="M20.6 6.5V4.7q0-1.5-1.6-1.5h-3.6q-1.5 0-1.5 1.5v1.8zm-8.7 0V4.7q0-1.5-1.5-1.5H6.8q-1.5 0-1.6 1.5v1.8zm11.4-3.6v3.6q2.4.3 2.5 3.1v7.1q0 .9-.9.9h-.6q-1 0-1-.9v-1.3H2.5v1.3q0 .9-1 .9H1q-.8 0-.9-.9v-7q0-2.9 2.5-3.2V3q0-2.9 3-2.9h14.8q3 0 3 3M2.6 13.4q-.3 0-.3-.5V9.6q0-1 1.1-1h19q1 0 1.1 1V13q0 .5-.3.5z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {weekView
                                    ? "No exercises logged for this muscle in the week."
                                    : "No exercises logged for this muscle on this day."}
                                </p>
                              )}
                            </section>

                            <section className="mt-5">
                              <h4 className="text-[13.333px] font-medium leading-[18px] text-black/50">
                                Other Exercises for {selectedDetails?.name}
                              </h4>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {potentialExercises.map((exercise) => (
                                  <span
                                    key={exercise}
                                    className="rounded-xl border border-[#111111]/8 bg-white px-3 py-2 text-xs font-medium text-fg"
                                  >
                                    {exercise}
                                  </span>
                                ))}
                              </div>
                            </section>
                          </div>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </motion.div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
}
