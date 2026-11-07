import { describe, it, expect } from 'vitest';
import { runJava } from '../src/runtime/java/interpreter';
import { Simulation } from '../src/sim/simulation';

/* A kid's own class named after an SDK type must not shadow it. Real javac resolves an
   inherited field's type where the field is declared, so `class Telemetry` in the kid's
   file never changes what `telemetry` is. This used to report `cannot find symbol` for
   telemetry.addData on correct code. */
describe('a user class named after an SDK type does not shadow it', () => {
  it('still finds telemetry.addData when the OpMode itself is called Telemetry', () => {
    const r = runJava(`
import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

@TeleOp(name = "T")
public class Telemetry extends OpMode {
    @Override
    public void init() { }
    @Override
    public void loop() {
        telemetry.addData("drive", 1.0);
        telemetry.update();
    }
}`, { sim: new Simulation(), teleOpForMs: 200 });
    expect(r.diagnostics).toEqual([]);
    expect(r.thrown).toBeNull();
    expect(r.sim.telemetryKeysSeen.has('drive')).toBe(true);
  });

  it('still reads gamepad1 when the kid has a class called Gamepad', () => {
    const r = runJava(`
import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

@TeleOp(name = "G")
public class PadTest extends OpMode {

    class Gamepad {
        int unrelated = 1;
    }

    @Override
    public void init() { }

    @Override
    public void loop() {
        if (gamepad1.a) {
            telemetry.addData("a", gamepad1.left_stick_y);
        }
        telemetry.addData("held", gamepad1.a);
        telemetry.update();
    }
}`, { sim: new Simulation(), teleOpForMs: 200 });
    expect(r.diagnostics).toEqual([]);
    expect(r.thrown).toBeNull();
    expect(r.sim.telemetryKeysSeen.has('held')).toBe(true);
  });
});
