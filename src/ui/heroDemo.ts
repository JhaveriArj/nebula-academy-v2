import type { WatchSpec } from '../sim/watch';
import type { TestSpec } from '../runtime/testRunner';
import { FRAME_MS } from './frames';

/* The home page demo: eight lines of Java from the Tier 0 checkpoint's idea (one side and
   one corner, four times, makes a square) and the scripted run that the hero plays while it
   highlights the line that is running.

   The hero plays a script rather than the interpreter so the home page does not download
   the 490 KB lesson chunk. tests/hero-demo.test.ts keeps the two honest: it runs HERO_JAVA
   through the real interpreter and checks that it ends where the script ends and passes the
   checks the hero shows as passed. No DOM in here, so that test can import it. */

export const DRIVE_POWER = 0.8;
export const DRIVE_MS = 1500;
export const TURN_POWER = 0.5;
export const TURN_MS = 785;
export const SIDES = 4;
const SIDE_MS = DRIVE_MS + TURN_MS;
export const RUN_MS = SIDES * SIDE_MS;

const START = { x: 240, y: 70, headingDeg: 0 };

/** The lines the hero shows, and the line number the first one has in the file. */
export const FIRST_LINE = 16;
export const HERO_LINES: readonly string[] = [
  `for (int side = 1; side <= ${SIDES}; side++) {`,
  `    leftDrive.setPower(${DRIVE_POWER});`,
  `    rightDrive.setPower(${DRIVE_POWER});`,
  `    sleep(${DRIVE_MS});`,
  `    leftDrive.setPower(-${TURN_POWER});`,
  `    rightDrive.setPower(${TURN_POWER});`,
  `    sleep(${TURN_MS});`,
  '}',
];

/** The whole file those lines come from, so the test can run it. Line 16 is the `for`. */
export const HERO_JAVA = `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Square")
public class Square extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();
${HERO_LINES.map((l) => `        ${l}`).join('\n')}
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}
`;

export const HERO_SPEC: WatchSpec = {
  robot: 'tank',
  start: START,
  withElements: false,
  durationMs: RUN_MS + 200,
  steps: [
    ...Array.from({ length: SIDES }, (_, i) => [
      { atMs: i * SIDE_MS, motors: { leftDrive: DRIVE_POWER, rightDrive: DRIVE_POWER } },
      { atMs: i * SIDE_MS + DRIVE_MS, motors: { leftDrive: -TURN_POWER, rightDrive: TURN_POWER } },
    ]).flat(),
    { atMs: RUN_MS, motors: { leftDrive: 0, rightDrive: 0 } },
  ],
};

/** Three of the Tier 0 checkpoint's own checks; the test confirms the labels are its labels. */
export const HERO_CHECKS: TestSpec = {
  robot: 'tank',
  start: START,
  withElements: false,
  checks: [
    { type: 'robotMovedAtLeastCm', cm: 200, label: 'The robot drives all four sides' },
    { type: 'robotHeadingWithin', degrees: 360, tolerance: 30, relative: true, label: 'It turns four corners, one full turn in total' },
    { type: 'robotWithinCmOf', x: START.x, y: START.y, tolerance: 30, label: 'It finishes back where it started' },
  ],
};

/** Lesson 1's checks as the "How a lesson works" band shows them; the test checks these too. */
export const LESSON_ONE_CHECKS: readonly string[] = [
  'The robot drives at least 80 cm',
  'The left wheel is given some power',
  'The whole run finishes in under 10 seconds',
];

export interface DemoState {
  /** 1 to SIDES while running; SIDES once done. */
  side: number;
  /** Indexes into HERO_LINES that are running now; empty once done. */
  lines: number[];
  left: number;
  right: number;
  seconds: number;
  done: boolean;
}

/** What the code panel shows at a recorded frame. setPower takes no time, so the running
    block is the two setPower calls and the sleep that holds them. */
export function demoStateAt(frame: number): DemoState {
  const ms = frame * FRAME_MS;
  if (ms >= RUN_MS) return { side: SIDES, lines: [], left: 0, right: 0, seconds: RUN_MS / 1000, done: true };
  const side = Math.floor(ms / SIDE_MS) + 1;
  const driving = ms % SIDE_MS < DRIVE_MS;
  return {
    side,
    lines: driving ? [1, 2, 3] : [4, 5, 6],
    left: driving ? DRIVE_POWER : -TURN_POWER,
    right: driving ? DRIVE_POWER : TURN_POWER,
    seconds: ms / 1000,
    done: false,
  };
}
