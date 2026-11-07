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

        driveOneSide();
        driveOneSide();
        driveOneSide();
        driveOneSide();
    }

    private void driveOneSide() {
        leftDrive.setPower(0.6);
        rightDrive.setPower(0.6);
        sleep(1000);
        leftDrive.setPower(0);
        rightDrive.setPower(0);

        leftDrive.setPower(-0.5);
        rightDrive.setPower(0.5);
        sleep(785);
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}
