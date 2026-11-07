import { describe, it, expect } from 'vitest';
import { runJava } from '../src/runtime/java/interpreter';
import { Simulation } from '../src/sim/simulation';
import { FIELD_CM, ROBOT_HALF } from '../src/sim/field';

const tankSim = () => new Simulation({ robot: 'tank', start: { x: 182.88, y: 30.48, headingDeg: 0 } });
const mecSim = () => new Simulation({ robot: 'mecanum', start: { x: 182.88, y: 30.48, headingDeg: 0 } });

/** Wraps a body in the locked LinearOpMode boilerplate Tiers 0-2 use. */
const tier0 = (body: string) => `
package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Lesson")
public class Lesson extends LinearOpMode {
    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");
        waitForStart();
${body}
    }
}`;

const run = (src: string, sim = tankSim(), opts = {}) => runJava(src, { sim, ...opts });

const expectOk = (r: ReturnType<typeof runJava>) => {
  expect(
    r.diagnostics.map((d) => `${d.line}: ${d.message}`).join('\n') +
      (r.thrown ? `\nthrew ${r.thrown.exceptionClass}: ${r.thrown.message}` : ''),
  ).toBe('');
  expect(r.stopReason).toBe('finished');
  return r;
};

describe('Tier 0: the robot moves and prints', () => {
  it('drives forward for one second at half power', () => {
    const r = expectOk(run(tier0(`
        leftDrive.setPower(0.5);
        rightDrive.setPower(0.5);
        sleep(1000);
        leftDrive.setPower(0);
        rightDrive.setPower(0);`)));
    expect(r.sim.distanceTravelledCm).toBeCloseTo(50, 0);
    expect(r.sim.pose.y).toBeCloseTo(80.48, 0);
  });

  it('changing the number changes how far it goes, which is lesson 01', () => {
    const far = run(tier0(`leftDrive.setPower(0.5); rightDrive.setPower(0.5); sleep(2000);`));
    expect(far.sim.distanceTravelledCm).toBeCloseTo(100, 0);
  });

  it('prints with System.out.println', () => {
    const r = expectOk(run(tier0(`
        System.out.println("Nebula ready");
        System.out.println("Arjun");`)));
    expect(r.sim.outputText()).toBe('Nebula ready\nArjun\n');
  });

  it('drives a square and prints a name three times, the Tier 0 checkpoint', () => {
    const r = expectOk(run(tier0(`
        for (int side = 0; side < 4; side++) {
            leftDrive.setPower(0.6);
            rightDrive.setPower(0.6);
            sleep(1000);
            leftDrive.setPower(-0.5);
            rightDrive.setPower(0.5);
            sleep(785);
            leftDrive.setPower(0);
            rightDrive.setPower(0);
        }
        for (int i = 0; i < 3; i++) {
            System.out.println("Arjun");
        }`)));
    expect(r.sim.outputText().trim().split('\n')).toHaveLength(3);
    expect(r.sim.distanceTravelledCm).toBeGreaterThan(200);
    // Back near the start, which is what makes it a square.
    expect(Math.hypot(r.sim.pose.x - 182.88, r.sim.pose.y - 30.48)).toBeLessThan(40);
  });
});

describe('Tier 1: types, operators, decisions, loops', () => {
  it('truncates integer division, which lesson 05 exists to teach', () => {
    const r = expectOk(run(tier0(`
        int cm = 50;
        int chunks = cm / 3;
        double exact = 50.0 / 3;
        System.out.println(chunks);
        System.out.println(exact);
        System.out.println(50 % 3);`)));
    expect(r.sim.outputText()).toBe('16\n16.666666666666668\n2\n');
  });

  it('handles int, double, boolean and String', () => {
    const r = expectOk(run(tier0(`
        int count = 3;
        double power = 0.45;
        boolean ready = true;
        String name = "Nebula";
        System.out.println(name + " has " + count + " at " + power + " ready=" + ready);`)));
    expect(r.sim.outputText()).toBe('Nebula has 3 at 0.45 ready=true\n');
  });

  it('runs if / else if / else', () => {
    const r = expectOk(run(tier0(`
        int fuel = 40;
        if (fuel > 80) { System.out.println("full"); }
        else if (fuel > 30) { System.out.println("enough"); }
        else { System.out.println("abort"); }`)));
    expect(r.sim.outputText()).toBe('enough\n');
  });

  it('runs the countdown checkpoint and aborts on low fuel', () => {
    const src = (fuel: number) => tier0(`
        int fuelLevel = ${fuel};
        int threshold = 50;
        if (fuelLevel < threshold) {
            System.out.println("Abort: fuel too low");
        } else {
            for (int t = 10; t > 0; t--) {
                System.out.println(t);
            }
            System.out.println("Launch");
            leftDrive.setPower(0.8);
            rightDrive.setPower(0.8);
            sleep(1500);
            leftDrive.setPower(0);
            rightDrive.setPower(0);
        }`);
    const low = expectOk(run(src(20)));
    expect(low.sim.outputText()).toBe('Abort: fuel too low\n');
    expect(low.sim.distanceTravelledCm).toBe(0);

    const high = expectOk(run(src(90)));
    expect(high.sim.outputText().split('\n').slice(0, 10)).toEqual(
      ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'],
    );
    expect(high.sim.distanceTravelledCm).toBeGreaterThan(100);
  });

  it('runs while loops and nested loops', () => {
    const r = expectOk(run(tier0(`
        int n = 3;
        while (n > 0) { System.out.print(n + " "); n--; }
        System.out.println("");
        for (int a = 1; a <= 2; a++) {
            for (int b = 1; b <= 3; b++) { System.out.print(a * b + " "); }
        }`)));
    expect(r.sim.outputText()).toBe('3 2 1 \n1 2 3 2 4 6 ');
  });
});

describe('Tier 2: methods, returns, classes, objects', () => {
  it('calls a method with a parameter and uses a return value', () => {
    const r = expectOk(run(tier0(`
        System.out.println(doubled(21));
        shout("go");
    }

    private int doubled(int n) {
        return n * 2;
    }

    private void shout(String word) {
        System.out.println(word.toUpperCase() + "!");`)));
    expect(r.sim.outputText()).toBe('42\nGO!\n');
  });

  it('runs the Robot helper class checkpoint', () => {
    const r = expectOk(run(`
package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Helper")
public class Helper extends LinearOpMode {

    class Robot {
        private DcMotor left;
        private DcMotor right;
        private LinearOpMode opMode;

        public Robot(DcMotor left, DcMotor right, LinearOpMode opMode) {
            this.left = left;
            this.right = right;
            this.opMode = opMode;
        }

        public void driveForward(double seconds) {
            left.setPower(0.7);
            right.setPower(0.7);
            opMode.sleep((long) (seconds * 1000));
            stopMoving();
        }

        public void turnLeft() {
            left.setPower(-0.5);
            right.setPower(0.5);
            opMode.sleep(785);
            stopMoving();
        }

        public void turnRight() {
            left.setPower(0.5);
            right.setPower(-0.5);
            opMode.sleep(785);
            stopMoving();
        }

        private void stopMoving() {
            left.setPower(0);
            right.setPower(0);
        }
    }

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");
        waitForStart();

        Robot robot = new Robot(leftDrive, rightDrive, this);
        robot.driveForward(2.0);
        robot.turnLeft();
        robot.driveForward(1.0);
    }
}`));
    expect(r.sim.distanceTravelledCm).toBeGreaterThan(150);
    expect(Math.abs(r.sim.headingChangeDeg)).toBeGreaterThan(80);
  });
});

describe('Tier 3: a real mecanum TeleOp', () => {
  it('drives from gamepad input and reports telemetry', () => {
    const sim = mecSim();
    const r = runJava(`
package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.Servo;

@TeleOp(name = "Nebula Drive", group = "Nebula")
public class NebulaDrive extends OpMode {
    private DcMotor frontLeft;
    private DcMotor frontRight;
    private DcMotor backLeft;
    private DcMotor backRight;
    private DcMotor armMotor;
    private Servo clawServo;

    @Override
    public void init() {
        frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        backRight = hardwareMap.get(DcMotor.class, "backRight");
        armMotor = hardwareMap.get(DcMotor.class, "armMotor");
        clawServo = hardwareMap.get(Servo.class, "clawServo");

        frontRight.setDirection(DcMotor.Direction.REVERSE);
        backRight.setDirection(DcMotor.Direction.REVERSE);

        telemetry.addData("status", "ready");
        telemetry.update();
    }

    @Override
    public void loop() {
        double drive = -gamepad1.left_stick_y;
        double strafe = gamepad1.left_stick_x;
        double turn = gamepad1.right_stick_x;

        frontLeft.setPower(drive + strafe + turn);
        frontRight.setPower(drive - strafe - turn);
        backLeft.setPower(drive - strafe + turn);
        backRight.setPower(drive + strafe - turn);

        if (gamepad1.a) {
            clawServo.setPosition(1.0);
        } else if (gamepad1.b) {
            clawServo.setPosition(0.0);
        }
        armMotor.setPower(gamepad1.right_trigger - gamepad1.left_trigger);

        telemetry.addData("heading", "%.1f", 0.0);
        telemetry.addData("drive", drive);
        telemetry.update();
    }
}`, {
      sim,
      teleOpForMs: 2000,
      onTick: (s) => {
        // Push the left stick forward for the first second, then strafe right.
        if (s.timeMs < 1000) {
          s.gamepad1.left_stick_y = -1;
          s.gamepad1.left_stick_x = 0;
        } else {
          s.gamepad1.left_stick_y = 0;
          s.gamepad1.left_stick_x = 1;
          s.gamepad1.a = true;
        }
      },
    });
    expect(r.thrown).toBeNull();
    expect(r.sim.pose.y).toBeGreaterThan(130); // drove forward
    expect(r.sim.pose.x).toBeGreaterThan(200); // then strafed right
    expect(r.sim.servos.get('clawServo')!.position).toBe(1);
    expect(r.sim.telemetryKeysSeen.has('heading')).toBe(true);
    expect(r.sim.telemetryLog.some((l) => l.startsWith('heading : 0.0'))).toBe(true);
  });

  it('reverses a motor with setDirection', () => {
    const r = expectOk(run(tier0(`
        rightDrive.setDirection(DcMotor.Direction.REVERSE);
        leftDrive.setPower(0.5);
        rightDrive.setPower(0.5);
        sleep(500);`)));
    // One side reversed means it spins instead of driving.
    expect(Math.abs(r.sim.headingChangeDeg)).toBeGreaterThan(20);
    expect(r.sim.distanceTravelledCm).toBeLessThan(5);
  });
});

describe('Tier 4: autonomous with sensors', () => {
  it('stops 20 cm from the wall using the distance sensor', () => {
    const sim = mecSim();
    const r = runJava(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DistanceSensor;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;

@Autonomous(name = "Wall")
public class Wall extends LinearOpMode {
    @Override
    public void runOpMode() {
        DcMotor frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        DcMotor frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        DcMotor backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        DcMotor backRight = hardwareMap.get(DcMotor.class, "backRight");
        DistanceSensor distanceSensor = hardwareMap.get(DistanceSensor.class, "distanceSensor");

        frontRight.setDirection(DcMotor.Direction.REVERSE);
        backRight.setDirection(DcMotor.Direction.REVERSE);

        waitForStart();

        while (opModeIsActive() && distanceSensor.getDistance(DistanceUnit.CM) > 20) {
            frontLeft.setPower(0.4);
            frontRight.setPower(0.4);
            backLeft.setPower(0.4);
            backRight.setPower(0.4);
            telemetry.addData("distance", distanceSensor.getDistance(DistanceUnit.CM));
            telemetry.update();
        }
        frontLeft.setPower(0);
        frontRight.setPower(0);
        backLeft.setPower(0);
        backRight.setPower(0);
    }
}`, { sim });
    expect(r.thrown).toBeNull();
    expect(r.sim.distanceCm()).toBeGreaterThan(14);
    expect(r.sim.distanceCm()).toBeLessThan(26);
    expect(r.sim.pose.y).toBeLessThan(FIELD_CM - ROBOT_HALF);
  });

  it('turns to 90 degrees using the IMU', () => {
    const sim = mecSim();
    const r = runJava(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.IMU;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;

@Autonomous(name = "Turn")
public class Turn extends LinearOpMode {
    @Override
    public void runOpMode() {
        DcMotor frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        DcMotor frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        DcMotor backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        DcMotor backRight = hardwareMap.get(DcMotor.class, "backRight");
        IMU imu = hardwareMap.get(IMU.class, "imu");

        frontRight.setDirection(DcMotor.Direction.REVERSE);
        backRight.setDirection(DcMotor.Direction.REVERSE);

        waitForStart();
        imu.resetYaw();

        while (opModeIsActive() && imu.getRobotYawPitchRollAngles().getYaw(AngleUnit.DEGREES) < 90) {
            frontLeft.setPower(-0.3);
            frontRight.setPower(0.3);
            backLeft.setPower(-0.3);
            backRight.setPower(0.3);
        }
        frontLeft.setPower(0);
        frontRight.setPower(0);
        backLeft.setPower(0);
        backRight.setPower(0);
    }
}`, { sim });
    expect(r.thrown).toBeNull();
    expect(r.sim.yawDeg()).toBeGreaterThan(85);
    expect(r.sim.yawDeg()).toBeLessThan(105);
  });

  it('drives to a target with RUN_TO_POSITION encoders', () => {
    const sim = mecSim();
    const r = runJava(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Ticks")
public class Ticks extends LinearOpMode {
    @Override
    public void runOpMode() {
        DcMotor frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        frontLeft.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
        frontLeft.setTargetPosition(900);
        frontLeft.setMode(DcMotor.RunMode.RUN_TO_POSITION);
        waitForStart();
        frontLeft.setPower(0.5);
        while (opModeIsActive() && frontLeft.isBusy()) {
            telemetry.addData("ticks", frontLeft.getCurrentPosition());
            telemetry.update();
        }
        frontLeft.setPower(0);
    }
}`, { sim });
    expect(r.thrown).toBeNull();
    expect(r.sim.motor('frontLeft')!.ticks).toBeGreaterThan(880);
    expect(r.sim.motor('frontLeft')!.ticks).toBeLessThan(960);
  });

  it('reacts to the colour under the robot', () => {
    const sim = new Simulation({ robot: 'mecanum', start: { x: 30, y: 335, headingDeg: 0 } });
    const r = runJava(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.ColorSensor;

@Autonomous(name = "Colour")
public class Colour extends LinearOpMode {
    @Override
    public void runOpMode() {
        ColorSensor colorSensor = hardwareMap.get(ColorSensor.class, "colorSensor");
        waitForStart();
        if (colorSensor.blue() > colorSensor.red()) {
            telemetry.addData("tile", "blue");
        } else {
            telemetry.addData("tile", "not blue");
        }
        telemetry.update();
    }
}`, { sim });
    expect(r.thrown).toBeNull();
    expect(r.sim.telemetryLog).toContain('tile : blue');
  });
});

describe('Tier 5: enums and state machines', () => {
  it('runs a state machine over an enum', () => {
    const r = expectOk(run(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@Autonomous(name = "States")
public class States extends LinearOpMode {

    enum State { DRIVE, TURN, DONE }

    @Override
    public void runOpMode() {
        waitForStart();
        State state = State.DRIVE;
        int guard = 0;
        while (state != State.DONE && guard < 20) {
            switch (state) {
                case DRIVE:
                    System.out.println("driving");
                    state = State.TURN;
                    break;
                case TURN:
                    System.out.println("turning");
                    state = State.DONE;
                    break;
                default:
                    break;
            }
            guard++;
        }
        System.out.println("state=" + state);
        System.out.println("count=" + State.values().length);
        System.out.println("ordinal=" + State.TURN.ordinal());
    }
}`));
    expect(r.sim.outputText()).toBe('driving\nturning\nstate=DONE\ncount=3\nordinal=1\n');
  });

  it('clamps an arm with Range.clip', () => {
    const r = expectOk(run(tier0(`
        double wanted = 2.5;
        double safe = Range.clip(wanted, -1.0, 1.0);
        System.out.println(safe);
        System.out.println(Math.abs(-3));
        System.out.println(Math.round(2.6));
        System.out.println(String.format("%.2f", 1.0 / 3.0));`)));
    expect(r.sim.outputText()).toBe('1.0\n3\n3\n0.33\n');
  });
});

describe('the guard rails', () => {
  it('catches a loop that never finishes, without touching the editor', () => {
    const r = run(tier0(`        while (true) { int x = 1; }`));
    expect(['steps', 'time']).toContain(r.stopReason);
    expect(r.ok).toBe(false);
  });

  it('catches a robot loop that runs forever in sim time', () => {
    const r = run(tier0(`        while (opModeIsActive()) { leftDrive.setPower(0.1); }`), tankSim(), {
      maxSimMs: 5000,
    });
    expect(r.stopReason).toBe('simTime');
  });

  it('reports divide by zero as Java does', () => {
    const r = run(tier0(`        int bad = 5 / 0;`));
    expect(r.thrown?.exceptionClass).toBe('ArithmeticException');
    expect(r.thrown?.message).toBe('/ by zero');
  });

  it('reports an array index that is out of range', () => {
    const r = run(tier0(`
        int[] values = new int[3];
        values[5] = 1;`));
    expect(r.thrown?.exceptionClass).toBe('ArrayIndexOutOfBoundsException');
    expect(r.thrown?.message).toContain('Index 5');
  });

  it('names the devices the robot actually has when the config name is wrong', () => {
    const r = run(tier0(`        DcMotor nope = hardwareMap.get(DcMotor.class, "leftdrive");`));
    expect(r.thrown?.exceptionClass).toBe('IllegalArgumentException');
    expect(r.thrown?.message).toContain('leftdrive');
    expect(r.thrown?.message).toContain('leftDrive');
  });

  it('reports using a device that was never fetched', () => {
    const r = run(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Oops")
public class Oops extends LinearOpMode {
    private DcMotor leftDrive;
    @Override
    public void runOpMode() {
        waitForStart();
        leftDrive.setPower(0.5);
    }
}`);
    expect(r.thrown?.exceptionClass).toBe('NullPointerException');
    expect(r.thrown?.message).toContain('leftDrive');
  });

  it('stops when the host asks it to', () => {
    let polls = 0;
    const sim = tankSim();
    const r = run(tier0(`        while (opModeIsActive()) { leftDrive.setPower(0.2); }`), sim, {
      shouldStop: () => ++polls > 50,
      maxSimMs: 30_000,
    });
    // opModeIsActive() goes false, so runOpMode returns normally: that is a graceful
    // stop, exactly as it behaves on a real robot when the driver presses stop.
    expect(r.stopReason).toBe('finished');
    expect(sim.timeMs).toBeLessThan(30_000);
  });

  it('reports a missing OpMode rather than doing nothing', () => {
    const r = run('class Nothing { void hello() {} }');
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some((d) => d.code === 'no.main.method')).toBe(true);
  });

  it('seeds Math.random so a lesson cannot be flaky', () => {
    const src = tier0(`        System.out.println(Math.random());`);
    expect(run(src).sim.outputText()).toBe(run(src).sim.outputText());
  });
});
