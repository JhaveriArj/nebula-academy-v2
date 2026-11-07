package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Return Values")
public class ReturnValues extends LinearOpMode {

    private DcMotor leftDrive;
    private DcMotor rightDrive;

    @Override
    public void runOpMode() {
        leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        int cm = 90;

        // TODO 2: print "driving for " joined to msForCm(cm) joined to " ms"

        // TODO 3: drive forward at power 0.6 for msForCm(cm) milliseconds, then stop.

    }

    // TODO 1: write a method called msForCm that takes an int called cm and
    //         returns an int. The answer is cm times 1000, divided by 60.
}
