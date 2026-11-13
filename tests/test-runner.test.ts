import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runLessonTests, type TestSpec } from '../src/runtime/testRunner';
import { runJava } from '../src/runtime/java/interpreter';
import { Simulation } from '../src/sim/simulation';

const lesson = (dir: string) => ({
  starter: readFileSync(`content/tiers/${dir}/starter.java`, 'utf8'),
  spec: JSON.parse(readFileSync(`content/tiers/${dir}/tests.json`, 'utf8')) as TestSpec,
});

const turnProgram = (left: number, right: number, ms: number, times: number) => `
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Turn")
public class Turn extends LinearOpMode {
    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");
        waitForStart();
        for (int i = 0; i < ${times}; i++) {
            leftDrive.setPower(${left});
            rightDrive.setPower(${right});
            sleep(${ms});
        }
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}`;

const fullTurn = {
  robot: 'tank',
  withElements: false,
  checks: [{ type: 'robotHeadingWithin', degrees: 360, tolerance: 30, relative: true }],
} as TestSpec;

describe('robotHeadingWithin with relative turns', () => {
  it('measures one corner against the full turn the lesson asks for', () => {
    const { starter, spec } = lesson('1-orbit/07-loops');
    const r = runLessonTests(starter, spec);
    const turn = r.results.find((x) => x.type === 'robotHeadingWithin')!;
    expect(turn.passed).toBe(false);
    const m = /turned (-?[\d.]+) degrees, which is ([\d.]+) off/.exec(turn.detail)!;
    expect(Number(m[2])).toBeCloseTo(360 - Number(m[1]), 1);
  });

  it('does not count standing still as one full turn', () => {
    const r = runLessonTests(turnProgram(0, 0, 100, 1), fullTurn);
    expect(r.results[0]!.passed).toBe(false);
    expect(r.results[0]!.detail).toMatch(/which is 360\.0 off/);
  });

  it('counts a full turn either way round', () => {
    const left = runLessonTests(turnProgram(-0.5, 0.5, 785, 4), fullTurn);
    const right = runLessonTests(turnProgram(0.5, -0.5, 785, 4), fullTurn);
    expect(left.results[0]!.passed, left.results[0]!.detail).toBe(true);
    expect(right.results[0]!.passed, right.results[0]!.detail).toBe(true);
  });
});

describe('telemetryContains and the hardware map lesson', () => {
  it('passes the solution and not the starter', () => {
    const { starter, spec } = lesson('3-first-flight/03-hardwaremap');
    const before = runLessonTests(starter, spec);
    expect(before.results[0]!.passed).toBe(false);
    expect(before.results[0]!.detail).toMatch(/never showed anything/);
  });

  it('getDeviceName describes the kind of device, not its configured name', () => {
    const r = runJava(`
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Name")
public class Name extends LinearOpMode {
    @Override
    public void runOpMode() {
        DcMotor frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        System.out.println(frontLeft.getDeviceName());
    }
}`, { sim: new Simulation({ robot: 'mecanum' }) });
    expect(r.sim.outputText()).toBe('Motor\n');
  });
});

describe('break it on purpose: the answers are what the experiments really say', () => {
  const { starter, spec } = lesson('0-launchpad/02-run-and-break-it');
  const answer = (name: string) => {
    const c = spec.checks.find((x) => x.type === 'telemetryContains' && x.text.startsWith(`${name} : `));
    return Number((c as { text: string }).text.split(' : ')[1]);
  };
  const lineAfter = (edit: (src: string) => string) => {
    const r = runLessonTests(edit(starter), spec);
    expect(r.compiled).toBe(false);
    return r.error!.line;
  };

  it('semicolon', () => {
    expect(lineAfter((s) => s.replace('int speed = 1;', 'int speed = 1'))).toBe(answer('semicolon'));
  });
  it('spelling', () => {
    expect(lineAfter((s) => s.replace('leftDrive.setPower(speed);', 'leftDrive.setPower(sped);'))).toBe(answer('spelling'));
  });
  it('brace', () => {
    expect(lineAfter((s) => s.slice(0, s.lastIndexOf('}')) + s.slice(s.lastIndexOf('}') + 1))).toBe(answer('brace'));
  });
  it('the starter as written does not pass, so the numbers have to come from somewhere', () => {
    const r = runLessonTests(starter, spec);
    expect(r.results.filter((x) => x.type === 'telemetryContains').every((x) => !x.passed)).toBe(true);
  });
});

describe('telemetryInOrder and the launch countdown', () => {
  const dir = '1-orbit/08-checkpoint-launch';
  const solution = readFileSync(`content/tiers/${dir}/solution.java`, 'utf8');
  const { spec } = lesson(dir);
  const countdown = (src: string) => runLessonTests(src, spec).results[0]!;

  it('passes a countdown from 10 to 1', () => {
    const r = countdown(solution);
    expect(r.passed, r.detail).toBe(true);
  });

  it('fails the same numbers counted up, and says where the order broke', () => {
    const up = solution.replace('int count = 10; count >= 1; count--', 'int count = 1; count <= 10; count++');
    expect(up).not.toBe(solution);
    const r = countdown(up);
    expect(r.passed).toBe(false);
    expect(r.detail).toMatch(/never "countdown : 9" after that/);
  });
});
