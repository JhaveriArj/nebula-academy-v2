import { describe, it, expect } from 'vitest';
import { parse } from '../src/runtime/java/parser';

const ok = (src: string) => {
  const { unit, diagnostics } = parse(src);
  expect(diagnostics, `unexpected diagnostics: ${JSON.stringify(diagnostics, null, 2)}`).toEqual([]);
  return unit;
};

describe('parser: shapes a lesson actually uses', () => {
  it('parses a Tier 0 hello program', () => {
    const unit = ok(`
public class HelloRobot {
    public static void main(String[] args) {
        System.out.println("Hello, robot!");
        leftDrive.setPower(0.5);
    }
}`);
    expect(unit.types).toHaveLength(1);
    expect(unit.types[0]!.name).toBe('HelloRobot');
    expect(unit.types[0]!.methods[0]!.name).toBe('main');
    expect(unit.types[0]!.methods[0]!.modifiers).toContain('static');
  });

  it('parses a real FTC TeleOp with package, imports and an annotation', () => {
    const unit = ok(`
package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;

@TeleOp(name = "Nebula Drive", group = "Nebula")
public class NebulaDrive extends OpMode {
    private DcMotor frontLeft;
    private DcMotor frontRight;

    @Override
    public void init() {
        frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        frontRight.setDirection(DcMotor.Direction.REVERSE);
    }

    @Override
    public void loop() {
        double drive = -gamepad1.left_stick_y;
        double turn = gamepad1.right_stick_x;
        frontLeft.setPower(drive + turn);
        frontRight.setPower(drive - turn);
        telemetry.addData("drive", drive);
        telemetry.update();
    }
}`);
    const cls = unit.types[0]!;
    expect(unit.packageName).toBe('org.firstinspires.ftc.teamcode');
    expect(unit.imports).toHaveLength(3);
    expect(cls.superclass!.name).toBe('OpMode');
    expect(cls.annotations[0]!.name).toBe('TeleOp');
    expect(cls.annotations[0]!.args[0]).toMatchObject({ name: 'name' });
    expect(cls.fields.map((f) => f.name)).toEqual(['frontLeft', 'frontRight']);
    expect(cls.methods.map((m) => m.name)).toEqual(['init', 'loop']);
  });

  it('parses hardwareMap.get with a class literal as a generic argument', () => {
    ok(`class A { void f() { DcMotor m = hardwareMap.get(DcMotor.class, "armMotor"); } }`);
  });

  it('parses loops, nested loops, if/else and integer division', () => {
    const unit = ok(`
class Square {
    void run() {
        for (int side = 0; side < 4; side++) {
            for (int i = 0; i < 2; i++) {
                int half = 50 / 2;
                if (half > 20 && side != 3) {
                    drive(half);
                } else if (half == 25) {
                    turn();
                } else {
                    stop();
                }
            }
        }
        int count = 10;
        while (count > 0) {
            count--;
        }
        do { count++; } while (count < 3);
    }
}`);
    expect(unit.types[0]!.methods[0]!.body!.stmts).toHaveLength(4);
  });

  it('parses a class with fields, a constructor and a return value', () => {
    const unit = ok(`
class Robot {
    private String name;
    private double speed = 0.5;

    public Robot(String name) {
        this.name = name;
    }

    public double getSpeed() {
        return speed;
    }

    public void driveForward(double seconds) {
        leftDrive.setPower(speed);
    }
}`);
    const cls = unit.types[0]!;
    expect(cls.constructors).toHaveLength(1);
    expect(cls.constructors[0]!.params[0]!.name).toBe('name');
    expect(cls.methods.find((m) => m.name === 'getSpeed')!.returnType!.name).toBe('double');
  });

  it('parses an enum state machine and a switch over it', () => {
    const unit = ok(`
class Auto {
    enum State { DRIVE, TURN, PARK }
    State state = State.DRIVE;
    void loop() {
        switch (state) {
            case DRIVE:
                state = State.TURN;
                break;
            case TURN:
            case PARK:
                break;
            default:
                break;
        }
    }
}`);
    expect(unit.types[0]!.nested[0]!.kind).toBe('enum');
    expect(unit.types[0]!.nested[0]!.enumConstants.map((c) => c.name)).toEqual(['DRIVE', 'TURN', 'PARK']);
  });

  it('parses arrays, casts, ternaries and enhanced for', () => {
    ok(`
class A {
    void f() {
        int[] values = new int[4];
        double[] powers = {0.1, 0.2, 0.3};
        values[0] = (int) powers[1];
        int best = values[0] > 2 ? values[0] : 0;
        for (double p : powers) {
            total = total + p;
        }
    }
}`);
  });

  it('does not mistake a parenthesized expression for a cast', () => {
    const unit = ok(`class A { void f() { double x = (a) + (b); } }`);
    const stmt = unit.types[0]!.methods[0]!.body!.stmts[0]!;
    expect(stmt.t).toBe('localVar');
    if (stmt.t === 'localVar') expect(stmt.decls[0]!.init!.t).toBe('binary');
  });
});

describe('parser: the mistakes Tier 0 asks kids to make on purpose', () => {
  it("reports a missing semicolon as javac does, on the right line", () => {
    const { diagnostics } = parse(`class A {
    void f() {
        int speed = 1
        drive(speed);
    }
}`);
    expect(diagnostics).not.toHaveLength(0);
    const d = diagnostics[0]!;
    expect(d.code).toBe('expected');
    expect(d.message).toBe("';' expected");
    expect(d.line).toBe(3);
  });

  it('reports a missing closing brace as reaching the end of the file', () => {
    const { diagnostics } = parse(`class A {
    void f() {
        drive(1);
`);
    expect(diagnostics.some((d) => d.code === 'premature.eof')).toBe(true);
  });

  it('reports an unclosed string literal', () => {
    const { diagnostics } = parse(`class A { void f() { print("hello); } }`);
    expect(diagnostics.some((d) => d.code === 'unclosed.string.literal')).toBe(true);
  });

  it('names the unsupported feature kindly instead of crashing', () => {
    const { diagnostics } = parse(`class A { void f() { list.forEach(x -> print(x)); } }`);
    const d = diagnostics.find((x) => x.code === 'unsupported.feature')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('lambdas');
  });

  it('stops after a sane number of errors rather than cascading', () => {
    const { diagnostics } = parse('class A { ) ) ) ) ) ) ) ) ) ) ) ) ) ) ) ) ) ) ) }');
    expect(diagnostics.length).toBeLessThanOrEqual(12);
  });
});

describe('parser: always terminates', () => {
  /* A hang is the one parser failure that takes the whole quality gate with it, and
     recovery loops are exactly where it hides. These mutations are the shapes a kid
     produces by deleting half a line and pressing Run. */
  const programs = [
    'public class A { public static void main(String[] a) { System.out.println("hi"); } }',
    '@TeleOp public class A extends OpMode { DcMotor m; public void init() { m = hardwareMap.get(DcMotor.class, "m"); } public void loop() { m.setPower(gamepad1.left_stick_y); } }',
    'class R { enum S { A, B } void f() { for (int i = 0; i < 3; i++) { if (i > 1) { g(i); } } } }',
  ];

  it('survives every single-character deletion of a real program', () => {
    for (const src of programs) {
      for (let i = 0; i < src.length; i++) {
        const broken = src.slice(0, i) + src.slice(i + 1);
        const started = Date.now();
        expect(() => parse(broken)).not.toThrow();
        expect(Date.now() - started, `slow at index ${i} of ${src.slice(0, 20)}`).toBeLessThan(500);
      }
    }
  });

  it('survives every truncation of a real program', () => {
    for (const src of programs) {
      for (let i = 0; i <= src.length; i++) {
        expect(() => parse(src.slice(0, i))).not.toThrow();
      }
    }
  });

  it('survives deterministic token soup', () => {
    const pieces = ['class', '{', '}', '(', ')', ';', 'int', 'x', '=', '5', '.', ',', 'if', 'for', '"s"', '>', '<', 'class', '@'];
    let seed = 12345;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let n = 0; n < 400; n++) {
      const len = 3 + Math.floor(rand() * 40);
      const src = Array.from({ length: len }, () => pieces[Math.floor(rand() * pieces.length)]).join(' ');
      expect(() => parse(src), `soup: ${src}`).not.toThrow();
    }
  });
});
