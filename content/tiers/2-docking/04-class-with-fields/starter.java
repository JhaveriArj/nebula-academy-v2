package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Class With Fields")
public class ClassWithFields extends LinearOpMode {

    private DcMotor leftDrive;
    private DcMotor rightDrive;

    @Override
    public void runOpMode() {
        leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        // TODO 2: show plan.name, plan.sides and plan.sideSeconds on the Driver
        //         Station, one telemetry.addData each, then telemetry.update().

        MissionPlan plan = new MissionPlan();

        // TODO 3: drive one side of the plan: power 0.6 for plan.sideSeconds seconds.

    }

    // TODO 1: give MissionPlan three fields: a String called name holding "Square",
    //         an int called sides holding 4, and a double called sideSeconds holding 1.0.
    class MissionPlan {
    }
}
