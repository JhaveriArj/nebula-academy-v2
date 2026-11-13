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

        MissionPlan plan = new MissionPlan();

        telemetry.addData("name", plan.name);
        telemetry.addData("sides", plan.sides);
        telemetry.addData("sideSeconds", plan.sideSeconds);
        telemetry.update();

        leftDrive.setPower(0.6);
        rightDrive.setPower(0.6);
        sleep((long) (plan.sideSeconds * 1000));
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }

    class MissionPlan {
        String name = "Square";
        int sides = 4;
        double sideSeconds = 1.0;
    }
}
