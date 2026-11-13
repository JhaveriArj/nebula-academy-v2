package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "If Else")
public class IfElse extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        double distanceToWall = 150.0;

        telemetry.addLine("Checking the way ahead");
        telemetry.update();

        if (distanceToWall > 100) {
            telemetry.addLine("Driving");
            telemetry.update();
            leftDrive.setPower(0.6);
            rightDrive.setPower(0.6);
            sleep(2000);
            leftDrive.setPower(0);
            rightDrive.setPower(0);
        } else {
            telemetry.addLine("Too close");
            telemetry.update();
        }

    }
}
