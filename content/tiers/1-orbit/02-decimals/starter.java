package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Decimals")
public class Decimals extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        // TODO 1: make a double called speed and set it to 0.6.

        // TODO 2: show speed on the Driver Station, then telemetry.update().

        // TODO 3: use speed in both setPower lines below instead of 0.0.

        leftDrive.setPower(0.0);
        rightDrive.setPower(0.0);
        sleep(1500);
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}
