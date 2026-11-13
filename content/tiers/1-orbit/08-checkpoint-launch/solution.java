package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Launch Sequence")
public class LaunchSequence extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        int fuelLevel = 90;
        int threshold = 50;

        if (fuelLevel < threshold) {
            telemetry.addLine("Abort: fuel too low");
            telemetry.update();
        } else {
            for (int count = 10; count >= 1; count--) {
                telemetry.addData("countdown", count);
                telemetry.update();
                sleep(500);
            }

            telemetry.addLine("Launch");
            telemetry.update();

            leftDrive.setPower(0.8);
            rightDrive.setPower(0.8);
            sleep(1500);
            leftDrive.setPower(0);
            rightDrive.setPower(0);
        }

    }
}
