import { Simulation, type RobotKind, type RobotPose, type SimSnapshot } from './simulation';

/* watch.json: the scripted demo the Watch step plays before a kid writes anything.

   It is a timed list of motor and servo settings rather than Java, for two reasons: the
   demo has to play before the lesson has taught the code that would produce it, and a
   recorded script is deterministic and authorable by a mentor who does not write Java. */

export interface WatchStep {
  atMs: number;
  motors?: Record<string, number>;
  servos?: Record<string, number>;
  /** A caption shown while this step runs. Keep it to a few words. */
  say?: string;
}

export interface WatchSpec {
  robot: RobotKind;
  /** Motors set to Direction.REVERSE for the whole demo, as the lesson's own code does.
      Powers in the steps are then what that code passes to setPower, so the readout
      shows the same positive numbers the kid's program will. */
  reverse?: string[];
  start?: RobotPose;
  durationMs: number;
  withElements?: boolean;
  steps: WatchStep[];
}

export interface WatchFrame {
  snapshot: SimSnapshot;
  caption: string | null;
}

/** Plays a watch script to completion and returns one frame per tick. */
export function playWatch(spec: WatchSpec): WatchFrame[] {
  const sim = new Simulation({
    robot: spec.robot,
    ...(spec.start ? { start: spec.start } : {}),
    ...(spec.withElements === false ? { withElements: false } : {}),
  });
  for (const name of spec.reverse ?? []) {
    const m = sim.motor(name);
    if (m) m.reversed = true;
  }
  const steps = [...spec.steps].sort((a, b) => a.atMs - b.atMs);
  const frames: WatchFrame[] = [];
  let next = 0;
  let caption: string | null = null;

  while (sim.timeMs < spec.durationMs) {
    while (next < steps.length && steps[next]!.atMs <= sim.timeMs) {
      const step = steps[next]!;
      for (const [name, power] of Object.entries(step.motors ?? {})) sim.setMotorPower(name, power);
      for (const [name, pos] of Object.entries(step.servos ?? {})) sim.setServoPosition(name, pos);
      if (step.say !== undefined) caption = step.say;
      next++;
    }
    sim.step();
    frames.push({ snapshot: sim.snapshot(), caption });
  }
  return frames;
}
