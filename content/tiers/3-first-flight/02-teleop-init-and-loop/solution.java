package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

@TeleOp(name = "Init And Loop", group = "Nebula")
public class InitAndLoop extends OpMode {

    private int loops;

    @Override
    public void init() {
        loops = 0;
    }

    @Override
    public void loop() {
        loops++;

        if (loops == 50) {
            System.out.println("50 loops");
        }
    }
}
