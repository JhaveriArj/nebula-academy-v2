import { describe, it, expect } from 'vitest';
import { missingImports } from '../src/runtime/java/imports';
import { translateMissingImport } from '../src/runtime/errorTranslator';
import { loadAllLessons } from './helpers/content';

const withImports = (imports: string, body: string) => `package org.firstinspires.ftc.teamcode;

${imports}

public class Drive extends LinearOpMode {
    @Override
    public void runOpMode() {
${body}
    }
}
`;

describe('missingImports (Builder asks for what Android Studio will)', () => {
  it('finds an SDK type used without its import, and the line it is first used on', () => {
    const src = withImports(
      'import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;',
      '        DcMotor left = hardwareMap.get(DcMotor.class, "leftDrive");',
    );
    expect(missingImports(src)).toEqual([
      { name: 'DcMotor', fqn: 'com.qualcomm.robotcore.hardware.DcMotor', line: 8 },
    ]);
  });

  it('is satisfied by the exact import or a wildcard', () => {
    const body = '        DcMotor left = hardwareMap.get(DcMotor.class, "leftDrive");';
    const op = 'import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;';
    expect(missingImports(withImports(`${op}\nimport com.qualcomm.robotcore.hardware.DcMotor;`, body))).toEqual([]);
    expect(missingImports(withImports(`${op}\nimport com.qualcomm.robotcore.hardware.*;`, body))).toEqual([]);
  });

  it('ignores names inside comments and strings', () => {
    const src = withImports(
      'import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;',
      '        // a DcMotor would go here\n        telemetry.addData("Servo", "not used");',
    );
    expect(missingImports(src)).toEqual([]);
  });

  it('needs no import for java.lang', () => {
    const src = withImports(
      'import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;',
      '        String name = "robot";\n        int n = Math.round(2.4f);',
    );
    expect(missingImports(src)).toEqual([]);
  });

  it('turns into a kid-readable error that keeps javac\'s own words behind the toggle', () => {
    const src = withImports('import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;', '        DcMotor m = null;');
    const [missing] = missingImports(src);
    const error = translateMissingImport(missing!, src);
    expect(error.headline).toBe('The robot does not know a kind of thing called DcMotor on line 8.');
    expect(error.fix).toContain('import com.qualcomm.robotcore.hardware.DcMotor;');
    expect(error.line).toBe(8);
    expect(error.raw).toContain('error: cannot find symbol');
    expect(error.fix).not.toMatch(/\b(simply|just|easy|obviously)\b/i);
  });

  it('never stops a lesson\'s starting code in Builder', () => {
    for (const lesson of loadAllLessons()) {
      expect(missingImports(lesson.starter).map((m) => m.name), `${lesson.dir}/starter.java`).toEqual([]);
    }
  });
});
