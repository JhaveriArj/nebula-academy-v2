# Nebula Academy — Pathway

Six tiers, 42 lessons, zero coding to a working FTC TeleOp and Autonomous in Java.

One set of lessons serves both modes. **Explorer** (ages 9–12) gets larger type, more code
pre-filled and locked, and no theory panels. **Builder** (ages 13–18) gets full editing and a
"Why this works" panel. The mode is a header toggle, saved to localStorage, switchable at any
time, and it never changes which lessons exist or which tests must pass.

A tier unlocks when the previous tier's checkpoint passes. The last lesson of every tier is its
checkpoint. Tiers 0–2 load the **tank** robot (`leftDrive`, `rightDrive`) so the first lessons
stay simple. Tiers 3–5 load the **mecanum** robot (`frontLeft`, `frontRight`, `backLeft`,
`backRight`).

Every lesson has the same six parts, in this order: **Mission** (one sentence — what the robot
will do), **Watch** (scripted sim demo), **Learn** (one idea), **Try** (starter code + Run),
**Check** (tests), **Boost** (one stretch).

---

## Tier 0 — Launchpad

Tank robot · 4 lessons · the editor, Run, `telemetry.addData`, what an error is.

A kid who has never written a line of code presses Run in the first 60 seconds and the robot
moves. Nothing is explained before it is seen.

| # | id | Lesson | Min | Concept |
|---|----|--------|-----|---------|
| 01 | `t0-hello-robot` | Hello, robot | 10 | The starter already drives. Change one number, press Run, watch the robot go further. |
| 02 | `t0-run-and-break-it` | Break it on purpose | 15 | Make three mistakes deliberately — drop a semicolon, misspell a name, delete a brace — and read what the robot says each time. |
| 03 | `t0-reading-errors` | Reading errors | 15 | Five short broken programs. Fix each one using the line number in the message. |
| 04 | `t0-checkpoint-square` | **Checkpoint: Square and signature** | 20 | Drive a square and sign it with your name on the Driver Station. |

**Checkpoint passes when:** the robot returns within 15 cm of its start point having driven at
least 240 cm total, and the Driver Station shows the kid's name.

---

## Tier 1 — Orbit

Tank robot · 8 lessons · variables, types, operators, decisions, loops.

| # | id | Lesson | Min | Concept |
|---|----|--------|-----|---------|
| 01 | `t1-first-variable` | Your first variable | 15 | `int` — a name that holds a whole number, and changing it changes what the robot does. |
| 02 | `t1-decimals` | Numbers with a point | 15 | `double` — motor power is `0.5`, not `0` or `1`. |
| 03 | `t1-true-and-false` | True or false | 15 | `boolean` — a value with only two options. |
| 04 | `t1-words` | Words the robot can say | 15 | `String` and joining text with `+`. |
| 05 | `t1-robot-math` | Robot math | 20 | `+ - * /` and `%`, and what integer division does to a distance. |
| 06 | `t1-if-else` | Making a choice | 20 | `if` / `else` asking a `boolean` question. |
| 07 | `t1-loops` | Doing it again | 20 | `while` first (repeat until), then `for` (repeat a counted number of times). |
| 08 | `t1-checkpoint-launch` | **Checkpoint: Launch sequence** | 25 | Count down from 10, abort if `fuelLevel` is under the threshold, otherwise drive. |

**Concept mapping note.** The brief lists nine concepts for eight lessons. `boolean` is taught in
03 and *used* as the question in 06, where it finally earns its keep. Nested loops are introduced
in 07's Boost (a loop inside a loop to drive a square) and are required by the 08 checkpoint, so
nesting is taught in the place where a kid has a reason to want it rather than as its own
abstract lesson.

**Checkpoint passes when:** the Driver Station counts 10 down to 1 in order, a `fuelLevel` below the
threshold shows an abort line and the robot never moves, and a sufficient `fuelLevel` drives the
robot at least 100 cm.

---

## Tier 2 — Docking

Tank robot · 7 lessons · methods and objects. The tier that makes Tier 3's `OpMode` readable.

| # | id | Lesson | Min | Concept |
|---|----|--------|-----|---------|
| 01 | `t2-first-method` | Teaching the robot a trick | 20 | Defining a method and calling it. A name for a block of steps. |
| 02 | `t2-parameters` | Telling it how much | 20 | Parameters — `driveForward(3)` instead of three copies of the same code. |
| 03 | `t2-return-values` | Handing something back | 20 | `return` and a non-`void` method. |
| 04 | `t2-class-with-fields` | A blueprint with fields | 20 | A `class` and the fields it remembers. |
| 05 | `t2-making-an-object` | Building one | 20 | `new` — a blueprint is not a robot until you build one. |
| 06 | `t2-dot-syntax` | Reading the dot | 20 | `thing.doSomething()` — why `hardwareMap.get(...)` will make sense next tier. |
| 07 | `t2-checkpoint-helper` | **Checkpoint: Robot helper class** | 30 | A `Robot` class with `driveForward(seconds)`, `turnLeft()`, `turnRight()`, driven from a main program. |

**Checkpoint passes when:** class `Robot` exists with all three methods, the main program calls
them, and the robot traces a path that ends at least 150 cm from its start with a heading change
of at least 90°.

---

## Tier 3 — First Flight

**Mecanum from here on.** 8 lessons · the real FTC SDK. First lesson a kid could paste into
Android Studio.

| # | id | Lesson | Min | Concept |
|---|----|--------|-----|---------|
| 01 | `t3-what-is-an-opmode` | What an OpMode is | 20 | The program the Driver Station runs. Your class extends it; the robot calls your code. |
| 02 | `t3-teleop-init-and-loop` | `init` and `loop` | 20 | `@TeleOp`, `init()` once, `loop()` forever. |
| 03 | `t3-hardwaremap` | Names and the hardware map | 25 | `hardwareMap.get(DcMotor.class, "frontLeft")` — the name in code must match the name in the config. |
| 04 | `t3-setting-motor-power` | Telling a motor how fast | 20 | `setPower(double)` from −1.0 to 1.0. |
| 05 | `t3-direction-and-reversing` | Which way is forward | 25 | `setDirection(REVERSE)` — why one side of a drivetrain is always backwards. |
| 06 | `t3-gamepad-sticks` | Driving by hand | 25 | `gamepad1.left_stick_y` and why it is negative when you push up. |
| 07 | `t3-telemetry` | Talking back | 20 | `telemetry.addData` / `update` on the Driver Station panel. |
| 08 | `t3-checkpoint-teleop` | **Checkpoint: Mecanum TeleOp** | 35 | Mecanum math (drive, strafe, rotate), plus `armMotor` and `clawServo`. |

**Checkpoint passes when:** the TeleOp strafes (moves sideways at least 60 cm with under 15° of
heading change), rotates in place, drives forward, moves `armMotor`, and sets `clawServo` to both
its open and closed positions — all from on-screen gamepad input scripted by the test.

---

## Tier 4 — Mission Control

Mecanum · 8 lessons · autonomous and sensors.

| # | id | Lesson | Min | Concept |
|---|----|--------|-----|---------|
| 01 | `t4-autonomous-linearopmode` | A program that runs itself | 25 | `@Autonomous`, `LinearOpMode`, `runOpMode()` top to bottom. |
| 02 | `t4-waitforstart` | Waiting for the whistle | 20 | `waitForStart()`, `opModeIsActive()`, `isStopRequested()`. |
| 03 | `t4-elapsedtime` | `sleep` or a clock | 25 | `sleep(ms)` versus a timed loop with `ElapsedTime`, and why a loop lets you keep looking. |
| 04 | `t4-encoders` | Counting the wheels | 30 | `RUN_USING_ENCODER`, `setTargetPosition`, `RUN_TO_POSITION`, `isBusy()`. |
| 05 | `t4-imu-turning` | Turning to an angle | 30 | `IMU`, `getRobotYawPitchRollAngles()`, turning until the yaw reaches a target. |
| 06 | `t4-distance-sensor` | Stopping before the wall | 25 | `DistanceSensor.getDistance(DistanceUnit.CM)` in a `while` condition. |
| 07 | `t4-color-sensor` | Reading the floor | 25 | `ColorSensor` red/green/blue, reacting to the tile underneath. |
| 08 | `t4-checkpoint-auto` | **Checkpoint: Full autonomous** | 40 | Drive to the wall, stop 20 cm away, turn 90° on the IMU, drive to the colored tile, park. |

**Checkpoint passes when:** the robot ends within 20±5 cm of the wall at the first stop, its
heading changes by 90±5°, it finishes on the colored tile, and the whole run completes under 30 s
of simulated time.

---

## Tier 5 — Deep Space

Mecanum + the real robot · 7 lessons. Two of these have no runner: they are the bridge off this
site and onto hardware.

| # | id | Lesson | Min | Concept |
|---|----|--------|-----|---------|
| 01 | `t5-servos-and-limits` | Servos and limits | 25 | `Servo.setPosition`, `CRServo`, and clamping `armMotor` so it cannot tear itself off. |
| 02 | `t5-state-machines` | One job at a time | 30 | A TeleOp state machine — an `enum` of states instead of a wall of `if`s. |
| 03 | `t5-proportional-control` | Easing in | 30 | P-only control on an IMU turn, then what the I and D of PID are for. |
| 04 | `t5-hardware-class` | One place for the hardware | 30 | A `Hardware` class both OpModes share. |
| 05 | `t5-git-and-github` | Git and GitHub | 25 | `clone`, `add`, `commit`, `push`, branches, and why your team needs them. No runner. |
| 06 | `t5-android-studio` | Android Studio and the real SDK | 30 | Installing Android Studio and the `FtcRobotController` repo, with screenshots and links to ftc-docs.firstinspires.org. No runner. |
| 07 | `t5-checkpoint-real-robot` | **Checkpoint: TeleOp + Auto pair** | 40 | A matching TeleOp and Autonomous built on one hardware class, plus a printable pre-run checklist for a real bot. |

**Checkpoint passes when:** both OpModes exist with the right annotations, both compile, both
share the hardware class, the TeleOp drives from gamepad input, the Autonomous completes a scored
path, and the printed checklist has been rendered.

---

## Unlocks

`content/pathway.json` is the single source of truth for order and unlocks. Rules:

- Lessons inside a tier are always visible and always re-playable; completing them in order is
  encouraged, not enforced.
- Tier *n+1* is locked until the checkpoint of tier *n* passes.
- Tier 0 is never locked.
- Progress is `{ lessonId: { passed, bestAt, mode } }` in localStorage, exportable and importable
  as a `.json` file, because school Chromebooks get wiped.
- No account, no backend, no analytics.

## Why this order

The pathway puts three tiers of plain Java in front of the FTC SDK on purpose. A kid who meets
`hardwareMap.get(DcMotor.class, "frontLeft")` without having read a dot or built an object is
copying, not programming. Tier 2 exists so Tier 3 line 1 is legible. The robot moves in every
one of those lessons anyway, so nothing feels like a detour.
