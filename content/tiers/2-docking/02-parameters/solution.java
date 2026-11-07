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

        driveForward(1.0);
        driveForward(0.5);
        driveForward(1.5);
    }

    private void driveForward(double seconds) {
        leftDrive.setPower(0.7);
        rightDrive.setPower(0.7);
        sleep((long) (seconds * 1000));
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}
