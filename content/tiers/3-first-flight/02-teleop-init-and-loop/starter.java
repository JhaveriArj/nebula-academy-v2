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
        // TODO 1: set loops to 0 here, in the place that happens once.
    }

    @Override
    public void loop() {
        // TODO 2: add one to loops. Then when loops reaches exactly 50,
        //         set message to "50 loops".

        telemetry.addData("loops", loops);
        telemetry.addData("message", message);
        telemetry.update();
    }
}
