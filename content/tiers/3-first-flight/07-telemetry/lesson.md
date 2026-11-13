---
id: t3-telemetry
title: Talking back
tier: 3
minutes: 20
concept: Telemetry puts numbers on the driver's phone while the robot is running.
robot: mecanum
explorerLockedRanges: [[1, 34]]
---

## Mission

The robot shows the driver how much power it is being given, while it drives.

## Watch

The robot drives forward. Watch the telemetry panel beside the field fill in as it goes.

## Learn

You have put lines on the Driver Station since Tier 0, mostly once, at the end. A driver needs them while the robot is moving.

**Telemetry** is the readout on the driver's phone. You build a line, then send it:

```
telemetry.addData("drive", drive);
telemetry.addLine("Nebula");
telemetry.update();
```

`addData` takes a label and a value, and shows them side by side. `addLine` shows one piece of text with no label.

`update()` is the part people forget. Nothing appears until you call it. `addData` only builds the line up; `update` sends what you have built.

All three go in `loop`, so the numbers keep up with the robot.

Telemetry is how you find out what your robot thinks is happening, which is rarely what you assumed. Every team that debugs quickly does it by putting numbers on the screen.

:::why
Telemetry replaces itself each pass rather than scrolling, which is what makes it readable at fifty updates a second. Call `addData("drive", ...)` every pass and the driver sees one line whose number changes, not two thousand lines.

There is a version that formats: `telemetry.addData("heading", "%.1f", yaw)` shows `heading 43.2` instead of `43.19999999999999`, which matters once you start reading an IMU. The `%.1f` means one digit after the point, and it is the same formatting Tier 1 lesson 04 touched on.

Telemetry is not free. Every `update()` sends a packet over the wifi link to the phone, and a TeleOp that sends twenty lines fifty times a second can make the controls feel laggy. Teams that notice use `telemetry.setMsTransmissionInterval(250)` to slow the sending down without changing their code.

The habit worth forming: when a robot does something you cannot explain, put the thing you cannot explain on the screen before changing any code.
:::

## Try

Three lines at the end of `loop`. Show `drive` under the key `drive`, add a line reading `Nebula`, and send it.

## Check

The checks want telemetry to have shown a key called `drive`, and the robot to have driven.

## Boost

Add a second `addData` showing `frontLeft.getPower()`. Then take out the `update()` line and press Run, so you see what happens without it.
