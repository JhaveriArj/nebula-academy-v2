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

        System.out.println("Starting up");

        // TODO: after each experiment, print the name of the error you saw.
        // One line for each: semicolon, spelling, brace.

        leftDrive.setPower(speed);
        rightDrive.setPower(speed);
        sleep(1000);

        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}
