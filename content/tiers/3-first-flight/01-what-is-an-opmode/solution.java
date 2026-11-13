package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

@TeleOp(name = "What Is An OpMode", group = "Nebula")
public class WhatIsAnOpMode extends OpMode {

    private int loops;

    @Override
    public void init() {
        telemetry.addData("Status", "Nebula ready");
        telemetry.update();
    }

    @Override
    public void loop() {
        loops++;
    }

    @Override
    public void stop() {
        telemetry.addData("loop ran", loops + " times");
        telemetry.update();
    }
}
