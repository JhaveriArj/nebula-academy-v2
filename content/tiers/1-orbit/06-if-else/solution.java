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

        System.out.println("Checking the way ahead");

        if (distanceToWall > 100) {
            System.out.println("Driving");
            leftDrive.setPower(0.6);
            rightDrive.setPower(0.6);
            sleep(2000);
            leftDrive.setPower(0);
            rightDrive.setPower(0);
        } else {
            System.out.println("Too close");
        }

    }
}
