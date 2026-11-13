package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

@TeleOp(name = "Init And Loop", group = "Nebula")
public class InitAndLoop extends OpMode {

    private int loops;
    private String message;

    @Override
    public void init() {
        message = "not yet";
        loops = 0;
    }

    @Override
    public void loop() {
        loops++;

        if (loops == 50) {
            message = "50 loops";
        }

        telemetry.addData("loops", loops);
        telemetry.addData("message", message);
        telemetry.update();
    }
}
