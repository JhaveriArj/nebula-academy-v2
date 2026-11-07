package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Parameters")
public class Parameters extends LinearOpMode {

    private DcMotor leftDrive;
    private DcMotor rightDrive;

    @Override
    public void runOpMode() {
        leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        // TODO 2: call driveForward three times, with 1.0, then 0.5, then 1.5 seconds.

    }

    // TODO 1: write a method called driveForward that takes a double called seconds.
    //         It drives at power 0.7 for that many seconds, then stops.
    //         Turn seconds into milliseconds by multiplying by 1000.
}
