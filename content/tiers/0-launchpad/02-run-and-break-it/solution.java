package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Break It On Purpose")
public class BreakItOnPurpose extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        int speed = 1;

        telemetry.addData("speed", speed);

        // Full power for one second,
        // then stop.

        leftDrive.setPower(speed);
        rightDrive.setPower(speed);
        sleep(1000);

        leftDrive.setPower(0);
        rightDrive.setPower(0);

        // The line the robot named after each experiment.
        telemetry.addData("semicolon", 17);
        telemetry.addData("spelling", 24);
        telemetry.addData("brace", 8);
        telemetry.update();
    }
}
