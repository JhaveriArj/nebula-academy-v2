import { describe, it, expect } from 'vitest';
import { parse } from '../src/runtime/java/parser';
import { check } from '../src/runtime/java/checker';

const errs = (src: string) => {
  const { unit, diagnostics } = parse(src);
  expect(diagnostics, 'the source should parse cleanly for a checker test').toEqual([]);
  return check(unit);
};

const wrap = (body: string) => `
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.Servo;
import com.qualcomm.robotcore.hardware.IMU;
import com.qualcomm.robotcore.hardware.DistanceSensor;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;

@Autonomous(name = "L")
public class L extends LinearOpMode {
    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        waitForStart();
${body}
    }
}`;

describe('the checker stays quiet on correct code', () => {
  it('accepts the shapes every tier uses', () => {
    expect(errs(wrap(`
        int speed = 50;
        double power = speed / 100.0;
        boolean ready = power > 0.2;
        String label = "power " + power;
        leftDrive.setPower(power);
        leftDrive.setDirection(DcMotor.Direction.REVERSE);
        leftDrive.setMode(DcMotor.RunMode.RUN_TO_POSITION);
        leftDrive.setTargetPosition(500);
        telemetry.addData("ready", ready);
        telemetry.addData("label", "%s", label);
        telemetry.update();
        System.out.println(label);
        sleep(100);
        if (opModeIsActive() && !isStopRequested()) {
            for (int i = 0; i < 3; i++) {
                System.out.println(Math.abs(-i) + Math.round(1.5));
            }
        }
        int[] ticks = new int[4];
        ticks[0] = leftDrive.getCurrentPosition();
        for (int t : ticks) { System.out.println(t); }
        double yaw = hardwareMap.get(IMU.class, "imu")
            .getRobotYawPitchRollAngles().getYaw(AngleUnit.DEGREES);
        double cm = hardwareMap.get(DistanceSensor.class, "distanceSensor").getDistance(DistanceUnit.CM);
        Servo claw = hardwareMap.get(Servo.class, "clawServo");
        claw.setPosition(0.5);
        System.out.println(yaw + cm + claw.getPosition());`))).toEqual([]);
  });

  it('accepts a user class with fields, a constructor and methods', () => {
    expect(errs(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "H")
public class H extends LinearOpMode {
    class Robot {
        private DcMotor left;
        private double speed = 0.5;
        public Robot(DcMotor left) { this.left = left; }
        public double getSpeed() { return speed; }
        public void go(double seconds) { left.setPower(getSpeed()); }
    }

    enum State { DRIVE, PARK }

    @Override
    public void runOpMode() {
        waitForStart();
        Robot robot = new Robot(hardwareMap.get(DcMotor.class, "leftDrive"));
        robot.go(2.0);
        State state = State.DRIVE;
        switch (state) {
            case DRIVE: state = State.PARK; break;
            default: break;
        }
        System.out.println(state.name() + State.values().length + robot.getSpeed());
    }
}`)).toEqual([]);
  });
});

describe('the mistakes Tier 0 lessons 02 and 03 are built on', () => {
  it('reports a misspelled variable the way javac does', () => {
    const d = errs(wrap(`
        int speed = 50;
        leftDrive.setPower(spede);`));
    expect(d).toHaveLength(1);
    expect(d[0]!.code).toBe('cant.resolve');
    expect(d[0]!.message).toBe('cannot find symbol');
    expect(d[0]!.symbol).toBe('spede');
    expect(d[0]!.detail).toContain('  symbol:   variable spede');
    expect(d[0]!.line).toBe(19);
  });

  it('reports a misspelled SDK method and names the class', () => {
    const d = errs(wrap(`        leftDrive.setPwer(0.5);`));
    expect(d).toHaveLength(1);
    expect(d[0]!.message).toBe('cannot find symbol');
    expect(d[0]!.symbol).toBe('setPwer');
    expect(d[0]!.detail!.join(' ')).toContain('DcMotor');
  });

  it('reports a misspelled class name', () => {
    const d = errs(wrap(`        DcMoter other = null;`));
    expect(d.some((x) => x.symbol === 'DcMoter')).toBe(true);
    expect(d[0]!.detail![0]).toBe('  symbol:   class DcMoter');
  });

  it('reports a method this class does not have', () => {
    const d = errs(wrap(`        driveInCircles(3);`));
    expect(d).toHaveLength(1);
    expect(d[0]!.symbol).toBe('driveInCircles');
    expect(d[0]!.detail!.join(' ')).toContain('method driveInCircles');
  });
});

describe('type mistakes', () => {
  it('refuses a String where an int belongs', () => {
    const d = errs(wrap(`        int speed = "fast";`));
    expect(d).toHaveLength(1);
    expect(d[0]!.code).toBe('incompatible.types');
    expect(d[0]!.message).toBe('incompatible types: String cannot be converted to int');
  });

  it('refuses a double where an int belongs, which needs a cast in Java', () => {
    const d = errs(wrap(`        int ticks = 3.5;`));
    expect(d[0]!.message).toBe('incompatible types: double cannot be converted to int');
  });

  it('allows the cast that fixes it', () => {
    expect(errs(wrap(`        int ticks = (int) 3.5;`))).toEqual([]);
  });

  it('refuses an int where a boolean belongs', () => {
    const d = errs(wrap(`        boolean ready = 1;`));
    expect(d[0]!.message).toBe('incompatible types: int cannot be converted to boolean');
  });

  it('allows int widening to double, which Java does silently', () => {
    expect(errs(wrap(`        double power = 1;`))).toEqual([]);
  });

  it('allows String concatenation with any type', () => {
    expect(errs(wrap(`        String s = "n=" + 1 + 2.5 + true;`))).toEqual([]);
  });
});

describe('shape mistakes', () => {
  it('reports the wrong number of arguments', () => {
    const d = errs(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@Autonomous(name = "A")
public class A extends LinearOpMode {
    private void drive(double seconds) { }
    @Override
    public void runOpMode() {
        waitForStart();
        drive(1.0, 2.0);
    }
}`);
    expect(d).toHaveLength(1);
    expect(d[0]!.code).toBe('arg.length.mismatch');
    expect(d[0]!.detail!.join(' ')).toContain('differ in length');
  });

  it('reports a missing return statement', () => {
    const d = errs(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@Autonomous(name = "A")
public class A extends LinearOpMode {
    private int half(int n) {
        int result = n / 2;
    }
    @Override
    public void runOpMode() { waitForStart(); }
}`);
    expect(d.some((x) => x.code === 'missing.ret.stmt')).toBe(true);
  });

  it('accepts a return inside a complete if/else', () => {
    expect(errs(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@Autonomous(name = "A")
public class A extends LinearOpMode {
    private int pick(int n) {
        if (n > 0) { return 1; } else { return -1; }
    }
    @Override
    public void runOpMode() { waitForStart(); }
}`)).toEqual([]);
  });

  it('stops after a sane number of problems', () => {
    const body = Array.from({ length: 30 }, (_, i) => `        wrong${i}(1);`).join('\n');
    expect(errs(wrap(body)).length).toBeLessThanOrEqual(12);
  });
});
