import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runLessonTests, type TestSpec } from '../src/runtime/testRunner';

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
