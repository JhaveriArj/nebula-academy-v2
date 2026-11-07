package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Square And Signature")
public class SquareAndSignature extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        // One side of the square, then one left turn. Four of these makes a square.

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

        System.out.println("Sam");
        System.out.println("Sam");
        System.out.println("Sam");

    }
}
