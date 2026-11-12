import { describe, it, expect } from 'vitest';
import { Simulation, TICKS_PER_CM, normalizeDeg, MAX_LINES, MAX_LINE, ticksDue } from '../src/sim/simulation';
import { FIELD_CM, ROBOT_HALF, TILE_CM } from '../src/sim/field';

const tank = () => new Simulation({ robot: 'tank', start: { x: 182.88, y: 30.48, headingDeg: 0 } });
/* The mecanum robot's right-hand motors are mounted mirrored, exactly as on a real
   robot, so every test that drives it reverses that side first — which is precisely
   what the two setDirection(REVERSE) lines in Tier 3 lesson 05 are for. */
const mec = () => {
  const s = new Simulation({ robot: 'mecanum', start: { x: 182.88, y: 182.88, headingDeg: 0 } });
  s.motor('frontRight')!.reversed = true;
  s.motor('backRight')!.reversed = true;
  return s;
};

describe('tank drivetrain', () => {
  it('drives 100 cm in one second at full power, which is the number lessons quote', () => {
    const s = tank();
    s.setMotorPower('leftDrive', 1);
    s.setMotorPower('rightDrive', 1);
    s.advance(1000);
    expect(s.pose.y).toBeCloseTo(130.48, 1);
    expect(s.pose.x).toBeCloseTo(182.88, 6);
    expect(s.distanceTravelledCm).toBeCloseTo(100, 1);
    expect(s.pose.headingDeg).toBeCloseTo(0, 6);
  });

  it('halves the distance at half power', () => {
    const s = tank();
    s.setMotorPower('leftDrive', 0.5);
    s.setMotorPower('rightDrive', 0.5);
    s.advance(1000);
    expect(s.distanceTravelledCm).toBeCloseTo(50, 1);
  });

  it('turns counter-clockwise when the right wheel is faster, like the IMU reports it', () => {
    const s = tank();
    s.setMotorPower('leftDrive', -1);
    s.setMotorPower('rightDrive', 1);
    s.advance(200);
    expect(s.pose.headingDeg).toBeGreaterThan(0);
    expect(s.yawDeg()).toBeGreaterThan(0);
    // Spinning in place does not move the centre.
    expect(s.pose.x).toBeCloseTo(182.88, 1);
    expect(s.pose.y).toBeCloseTo(30.48, 1);
  });

  it('reverses direction when setDirection(REVERSE) is applied', () => {
    const s = tank();
    s.motor('leftDrive')!.reversed = true;
    s.motor('rightDrive')!.reversed = true;
    s.setMotorPower('leftDrive', 1);
    s.setMotorPower('rightDrive', 1);
    s.advance(500);
    expect(s.pose.y).toBeLessThan(30.48);
  });
});

describe('mecanum drivetrain', () => {
  it('spins instead of driving when the right side is not reversed, as a real robot does', () => {
    const raw = new Simulation({ robot: 'mecanum', start: { x: 182.88, y: 182.88, headingDeg: 0 } });
    for (const m of ['frontLeft', 'frontRight', 'backLeft', 'backRight']) raw.setMotorPower(m, 1);
    raw.advance(300);
    expect(Math.abs(raw.headingChangeDeg)).toBeGreaterThan(10);
    expect(raw.distanceTravelledCm).toBeLessThan(2);
  });

  it('drives forward with all four wheels positive', () => {
    const s = mec();
    for (const m of ['frontLeft', 'frontRight', 'backLeft', 'backRight']) s.setMotorPower(m, 1);
    s.advance(1000);
    expect(s.pose.y).toBeCloseTo(182.88 + 120, 1);
    expect(s.pose.x).toBeCloseTo(182.88, 6);
  });

  it('strafes right without changing heading', () => {
    const s = mec();
    // The mixing from Tier 3 lesson 08 with drive = 0, strafe = 1, turn = 0.
    s.setMotorPower('frontLeft', 1);
    s.setMotorPower('frontRight', -1);
    s.setMotorPower('backLeft', -1);
    s.setMotorPower('backRight', 1);
    s.advance(1000);
    expect(s.pose.x).toBeCloseTo(182.88 + 102, 1); // 120 * 0.85 strafe efficiency
    expect(s.pose.y).toBeCloseTo(182.88, 1);
    expect(Math.abs(s.pose.headingDeg)).toBeLessThan(0.001);
  });

  it('rotates in place with turn only', () => {
    const s = mec();
    s.setMotorPower('frontLeft', 1);
    s.setMotorPower('frontRight', -1);
    s.setMotorPower('backLeft', 1);
    s.setMotorPower('backRight', -1);
    s.advance(100);
    expect(s.pose.headingDeg).toBeLessThan(0); // positive turn stick = clockwise
    expect(s.pose.x).toBeCloseTo(182.88, 1);
    expect(s.pose.y).toBeCloseTo(182.88, 1);
  });
});

describe('encoders', () => {
  it('counts ticks that match the distance driven', () => {
    const s = tank();
    s.setMotorPower('leftDrive', 1);
    s.setMotorPower('rightDrive', 1);
    s.advance(1000);
    const expected = 100 * TICKS_PER_CM;
    expect(s.motor('leftDrive')!.ticks).toBeCloseTo(expected, 0);
  });

  it('STOP_AND_RESET_ENCODER zeroes the count', () => {
    const s = tank();
    s.setMotorPower('leftDrive', 1);
    s.advance(500);
    expect(s.motor('leftDrive')!.ticks).toBeGreaterThan(0);
    s.setMotorMode('leftDrive', 'STOP_AND_RESET_ENCODER');
    expect(s.motor('leftDrive')!.ticks).toBe(0);
  });

  it('RUN_TO_POSITION drives to the target and stops being busy', () => {
    const s = tank();
    for (const m of ['leftDrive', 'rightDrive']) {
      s.setMotorMode(m, 'RUN_TO_POSITION');
      s.motor(m)!.targetTicks = 1000;
      s.setMotorPower(m, 0.5);
    }
    expect(s.isBusy('leftDrive')).toBe(true);
    s.advance(5000);
    expect(s.isBusy('leftDrive')).toBe(false);
    expect(s.motor('leftDrive')!.ticks).toBeCloseTo(1000, -1);
  });

  it('clamps the arm between its encoder limits', () => {
    const s = mec();
    s.setMotorPower('armMotor', 1);
    s.advance(5000);
    expect(s.motor('armMotor')!.ticks).toBe(1200);
    s.setMotorPower('armMotor', -1);
    s.advance(5000);
    expect(s.motor('armMotor')!.ticks).toBe(0);
  });
});

describe('sensors', () => {
  it('reads the distance to the wall from the front face', () => {
    const s = new Simulation({ robot: 'mecanum', start: { x: 182.88, y: 182.88, headingDeg: 0 }, withElements: false });
    const expected = FIELD_CM - 182.88 - ROBOT_HALF;
    expect(s.distanceCm()).toBeCloseTo(expected, 1);
  });

  it('caps the distance reading like a 2 m sensor', () => {
    const s = new Simulation({ robot: 'mecanum', start: { x: 182.88, y: ROBOT_HALF, headingDeg: 0 }, withElements: false });
    expect(s.distanceCm()).toBe(200);
  });

  it('sees a game element closer than the wall behind it', () => {
    const s = new Simulation({ robot: 'mecanum', start: { x: 121.92, y: 60, headingDeg: 0 } });
    // There is a cube at (121.92, 121.92).
    expect(s.distanceCm()).toBeLessThan(45);
  });

  it('reads the blue tile the Tier 4 checkpoint parks on', () => {
    const s = new Simulation({ start: { x: TILE_CM / 2, y: TILE_CM * 5.5, headingDeg: 0 } });
    expect(s.tileUnderRobot()).toBe('blue');
    const c = s.colorAt();
    expect(c.b).toBeGreaterThan(c.r);
    expect(c.b).toBeGreaterThan(c.g);
  });

  it('resetYaw makes the current heading zero', () => {
    const s = tank();
    s.setMotorPower('leftDrive', -1);
    s.setMotorPower('rightDrive', 1);
    s.advance(200);
    expect(Math.abs(s.yawDeg())).toBeGreaterThan(1);
    s.resetYaw();
    expect(s.yawDeg()).toBeCloseTo(0, 6);
  });
});

describe('the field holds the robot', () => {
  it('stops at the wall instead of driving through it', () => {
    const s = tank();
    s.setMotorPower('leftDrive', 1);
    s.setMotorPower('rightDrive', 1);
    s.advance(20000);
    expect(s.pose.y).toBeCloseTo(FIELD_CM - ROBOT_HALF, 3);
  });

  it('pushes a game element rather than passing through it', () => {
    const s = new Simulation({ robot: 'mecanum', start: { x: 121.92, y: 60, headingDeg: 0 } });
    s.motor('frontRight')!.reversed = true;
    s.motor('backRight')!.reversed = true;
    const before = s.elements[0]!.y;
    for (const m of ['frontLeft', 'frontRight', 'backLeft', 'backRight']) s.setMotorPower(m, 1);
    s.advance(1000);
    expect(s.elements[0]!.y).toBeGreaterThan(before);
  });
});

describe('determinism', () => {
  it('produces identical state for identical input, which the test tolerances rely on', () => {
    const run = () => {
      const s = new Simulation({ robot: 'mecanum', start: { x: 100, y: 100, headingDeg: 15 } });
      s.setMotorPower('frontLeft', 0.7);
      s.setMotorPower('frontRight', 0.3);
      s.setMotorPower('backLeft', -0.2);
      s.setMotorPower('backRight', 0.9);
      s.advance(3000);
      return JSON.stringify(s.snapshot());
    };
    expect(run()).toBe(run());
  });

  it('advances time only in whole 20 ms ticks', () => {
    const s = tank();
    s.advance(1000);
    expect(s.timeMs).toBe(1000);
    s.advance(30);
    expect(s.timeMs).toBe(1040);
  });
});

describe('angle helpers', () => {
  it('keeps angles in (-180, 180] as the IMU does', () => {
    expect(normalizeDeg(190)).toBeCloseTo(-170, 6);
    expect(normalizeDeg(-190)).toBeCloseTo(170, 6);
    expect(normalizeDeg(180)).toBeCloseTo(180, 6);
    expect(normalizeDeg(360)).toBeCloseTo(0, 6);
  });
});

describe('System.out in a runaway loop', () => {
  it('keeps the newest 2,000 lines and says older ones were dropped', () => {
    const sim = new Simulation();
    for (let i = 0; i < 10_000; i++) sim.println(`line ${i}`);
    expect(sim.output.length).toBe(MAX_LINES);
    const text = sim.outputText();
    expect(text.startsWith('(8000 older lines were dropped')).toBe(true);
    expect(text).toContain('line 9999\n');
    expect(text).not.toContain('line 7999\n');
  });

  it('cuts one line that print() grows forever', () => {
    const sim = new Simulation();
    for (let i = 0; i < 50_000; i++) sim.print('x');
    expect(sim.outputText().length).toBe(MAX_LINE);
  });

  it('leaves short output exactly as printed', () => {
    const sim = new Simulation();
    sim.print('Hello, ');
    sim.println('robot');
    expect(sim.outputText()).toBe('Hello, robot\n');
  });
});

describe('live TeleOp pacing', () => {
  const run = (frameMs: number, seconds: number) => {
    let carry = 0, ticks = 0;
    for (let t = 0; t < seconds * 1000; t += frameMs) { const d = ticksDue(carry, frameMs); carry = d.carryMs; ticks += d.ticks; }
    return ticks;
  };
  it('runs 50 loops a second on a 60 Hz screen and on a 120 Hz screen', () => {
    expect(run(1000 / 60, 10)).toBeGreaterThanOrEqual(499);
    expect(run(1000 / 60, 10)).toBeLessThanOrEqual(501);
    expect(run(1000 / 120, 10)).toBeGreaterThanOrEqual(499);
    expect(run(1000 / 120, 10)).toBeLessThanOrEqual(501);
  });
  it('does not try to catch up after the tab was hidden', () => {
    expect(ticksDue(0, 5_000).ticks).toBe(5);
    expect(ticksDue(0, 5_000).carryMs).toBe(0);
  });
});
