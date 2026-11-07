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

        // TODO 1: if fuelLevel is below threshold, print "Abort: fuel too low"
        //         and do nothing else.

        // TODO 2: otherwise, count down from 10 to 1, printing each number on its
        //         own line, then print "Launch" and drive forward at power 0.8
        //         for 1500 milliseconds.

    }
}
