package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "First Method")
public class FirstMethod extends LinearOpMode {

    private DcMotor leftDrive;
    private DcMotor rightDrive;

    @Override
    public void runOpMode() {
        leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        // TODO 2: call driveOneSide() four times, one after the other.

    }

    // TODO 1: write a method here called driveOneSide(). It drives forward at
    //         power 0.6 for 1000 milliseconds, stops, then turns left with
    //         leftDrive at -0.5 and rightDrive at 0.5 for 785 milliseconds, and stops.
}
