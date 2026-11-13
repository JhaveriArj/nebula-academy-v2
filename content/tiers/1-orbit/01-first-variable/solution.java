package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "First Variable")
public class FirstVariable extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        int driveTime = 1500;

        telemetry.addData("driveTime", driveTime);
        telemetry.update();

        leftDrive.setPower(0.5);
        rightDrive.setPower(0.5);
        sleep(driveTime);
        leftDrive.setPower(0);
        rightDrive.setPower(0);

        leftDrive.setPower(0.5);
        rightDrive.setPower(0.5);
        sleep(driveTime);
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}
