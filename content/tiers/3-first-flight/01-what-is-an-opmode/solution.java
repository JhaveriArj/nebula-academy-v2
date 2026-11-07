package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

@TeleOp(name = "What Is An OpMode", group = "Nebula")
public class WhatIsAnOpMode extends OpMode {

    private int loops;

    @Override
    public void init() {
        System.out.println("Nebula ready");
    }

    @Override
    public void loop() {
        loops++;
    }

    @Override
    public void stop() {
        System.out.println("loop ran " + loops + " times");
    }
}
