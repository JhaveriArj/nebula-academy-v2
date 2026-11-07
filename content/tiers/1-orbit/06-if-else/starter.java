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

        // TODO: if distanceToWall is more than 100, print "Driving" and drive forward
        //       for 2000 milliseconds at power 0.6. Otherwise print "Too close".

    }
}
