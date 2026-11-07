import { describe, it, expect } from 'vitest';
import { entryKindOf, startTeleOp, type TeleOpSession } from '../src/runtime/java/interpreter';
import { Simulation } from '../src/sim/simulation';

const TELEOP = `
import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;

@TeleOp(name = "Drive")
public class Drive extends OpMode {
    private DcMotor frontLeft;
    private DcMotor frontRight;
    private DcMotor backLeft;
    private DcMotor backRight;

    @Override
    public void init() {
        frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        backRight = hardwareMap.get(DcMotor.class, "backRight");
        frontRight.setDirection(DcMotor.Direction.REVERSE);
        backRight.setDirection(DcMotor.Direction.REVERSE);
    }

    @Override
    public void loop() {
        double drive = -gamepad1.left_stick_y;
        frontLeft.setPower(drive);
        frontRight.setPower(drive);
        backLeft.setPower(drive);
        backRight.setPower(drive);
        telemetry.addData("drive", drive);
        telemetry.update();
    }
}`;

const asSession = (x: TeleOpSession | { ok: boolean } | null): TeleOpSession => {
  expect(x !== null && 'step' in x, `expected a session, got ${JSON.stringify(x)}`).toBe(true);
  return x as TeleOpSession;
};

describe('a TeleOp driven one loop at a time', () => {
  it('responds to gamepad input between steps, which is the whole point', () => {
    const sim = new Simulation({ robot: 'mecanum', start: { x: 182.88, y: 91.44, headingDeg: 0 } });
    const session = asSession(startTeleOp(TELEOP, { sim, teleOpForMs: 60_000 }));

    // Nothing pressed: the robot should not move.
    for (let i = 0; i < 25; i++) session.step();
    expect(sim.distanceTravelledCm).toBeCloseTo(0, 3);

    // Push the stick forward between steps, as a human would.
    sim.gamepad1.left_stick_y = -1;
    for (let i = 0; i < 50; i++) session.step();
    expect(sim.pose.y).toBeGreaterThan(150);

    // Release it and the robot stops where it is.
    sim.gamepad1.left_stick_y = 0;
    const restingY = sim.pose.y;
    for (let i = 0; i < 25; i++) session.step();
    expect(sim.pose.y).toBeCloseTo(restingY, 1);

    const result = session.finish();
    expect(result.ok).toBe(true);
    expect(sim.telemetryKeysSeen.has('drive')).toBe(true);
  });

  it('advances the sim exactly one tick per step', () => {
    const sim = new Simulation();
    const session = asSession(startTeleOp(TELEOP, { sim, teleOpForMs: 60_000 }));
    const before = sim.timeMs;
    session.step();
    session.step();
    expect(sim.timeMs - before).toBe(40);
  });

  it('stops stepping once the TeleOp reaches its scheduled end', () => {
    const sim = new Simulation();
    const session = asSession(startTeleOp(TELEOP, { sim, teleOpForMs: 200 }));
    let steps = 0;
    while (session.step()) steps++;
    expect(steps).toBe(10);
    expect(session.finish().stopReason).toBe('finished');
  });

  it('catches a runaway inside one loop without losing the session', () => {
    const sim = new Simulation();
    const session = asSession(startTeleOp(`
import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

@TeleOp(name = "Runaway")
public class Runaway extends OpMode {
    @Override
    public void init() { }
    @Override
    public void loop() {
        int n = 0;
        while (true) {
            n++;
        }
    }
}`, { sim, teleOpForMs: 60_000, maxSteps: 200_000 }));
    expect(session.step()).toBe(false);
    const result = session.finish();
    expect(['steps', 'time']).toContain(result.stopReason);
    expect(result.ok).toBe(false);
  });

  it('reports a compile error instead of handing back a session', () => {
    const broken = startTeleOp('class Nope { void hi() { int x = "text"; } }', { sim: new Simulation() });
    expect(broken).not.toBeNull();
    expect(broken !== null && 'step' in broken).toBe(false);
    expect((broken as { ok: boolean }).ok).toBe(false);
  });

  it('says a LinearOpMode is not a TeleOp rather than running it here', () => {
    const linear = startTeleOp(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@Autonomous(name = "A")
public class A extends LinearOpMode {
    @Override
    public void runOpMode() { waitForStart(); }
}`, { sim: new Simulation() });
    expect(linear).toBeNull();
  });

  it('can say what kind of program a source is without running it', () => {
    expect(entryKindOf(TELEOP)).toBe('teleop');
    expect(entryKindOf(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@Autonomous(name = "A")
public class A extends LinearOpMode {
    @Override
    public void runOpMode() { waitForStart(); }
}`)).toBe('linear');
    expect(entryKindOf('class Broken {')).toBeNull();
  });

  it('hands back a finished session when init itself fails', () => {
    const session = asSession(startTeleOp(`
import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;

@TeleOp(name = "BadName")
public class BadName extends OpMode {
    private DcMotor wheel;
    @Override
    public void init() {
        wheel = hardwareMap.get(DcMotor.class, "nosuchmotor");
    }
    @Override
    public void loop() {
        wheel.setPower(1);
    }
}`, { sim: new Simulation() }));
    expect(session.step()).toBe(false);
    expect(session.result!.thrown?.exceptionClass).toBe('IllegalArgumentException');
  });
});
