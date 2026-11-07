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

        double speed = 0.6;

        System.out.println(speed);

        leftDrive.setPower(speed);
        rightDrive.setPower(speed);
        sleep(1500);
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}
