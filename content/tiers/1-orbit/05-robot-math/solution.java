package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Robot Math")
public class RobotMath extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        int cm = 90;
        double power = 0.6;

        int driveMs = cm * 1000 / 60;

        telemetry.addData("whole seconds", cm / 60);

        telemetry.addData("left over", cm % 60);
        telemetry.update();

        leftDrive.setPower(power);
        rightDrive.setPower(power);
        sleep(driveMs);
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}
