package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

@TeleOp(name = "What Is An OpMode", group = "Nebula")
public class WhatIsAnOpMode extends OpMode {

    private int loops;

    @Override
    public void init() {
        // TODO 1: show "Nebula ready" on the Driver Station, so you can see init run.
    }

    @Override
    public void loop() {
        // TODO 2: add one to loops, every time this runs.
    }

    @Override
    public void stop() {
        telemetry.addData("loop ran", loops + " times");
        telemetry.update();
    }
}
