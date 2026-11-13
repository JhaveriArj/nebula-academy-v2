package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Words")
public class Words extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        int mission = 4;

        String pilot = "Sam";

        telemetry.addLine("Pilot " + pilot + " on mission " + mission);
        telemetry.update();

        leftDrive.setPower(0.5);
        rightDrive.setPower(0.5);
        sleep(800);
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}
