package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Square And Signature")
public class SquareAndSignature extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        // One side of the square, then one left turn. Four of these makes a square.

        // TODO 1: drive forward. Both wheels 0.6, sleep 1000, both wheels 0.
        // TODO 2: turn left. leftDrive -0.5, rightDrive 0.5, sleep 785, both wheels 0.
        // TODO 3: copy TODO 1 and TODO 2 three more times, so there are four of each.
        // TODO 4: sign your work. Show your name on the Driver Station with
        //         telemetry.addData("Pilot", ...), then telemetry.update().

    }
}
