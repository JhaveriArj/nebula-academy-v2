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

        // TODO 1: work out driveMs. At power 0.6 the robot goes 60 cm every second,
        //         so driveMs is cm times 1000, divided by 60.

        // TODO 2: print "whole seconds: " joined to cm / 60

        // TODO 3: print "left over: " joined to cm % 60

        // TODO 4: use driveMs in the sleep line below instead of 500.

        leftDrive.setPower(power);
        rightDrive.setPower(power);
        sleep(500);
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}
