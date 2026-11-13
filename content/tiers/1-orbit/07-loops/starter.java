package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Loops")
public class Loops extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        // One side and one corner, written out by hand.
        // TODO: wrap these eleven lines in a for loop that runs four times,
        //       and show the side number on the Driver Station each time round.

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
