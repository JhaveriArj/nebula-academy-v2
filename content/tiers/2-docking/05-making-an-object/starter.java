package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Making An Object")
public class MakingAnObject extends LinearOpMode {

    private DcMotor leftDrive;
    private DcMotor rightDrive;

    @Override
    public void runOpMode() {
        leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        // TODO 2: build two plans. One named "Square" with 4 sides and 1.0 seconds,
        //         one named "Triangle" with 3 sides and 1.4 seconds.
        //         Print both names, then drive one side of the square.

    }

    class MissionPlan {
        String name;
        int sides;
        double sideSeconds;

        // TODO 1: write the constructor. It is called MissionPlan, takes a String
        //         called name, an int called sides and a double called sideSeconds,
        //         and copies each one into the matching field with this.
    }
}
