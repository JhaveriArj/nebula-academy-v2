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

        MissionPlan square = new MissionPlan("Square", 4, 1.0);
        MissionPlan triangle = new MissionPlan("Triangle", 3, 1.4);

        System.out.println(square.name);
        System.out.println(triangle.name);

        leftDrive.setPower(0.6);
        rightDrive.setPower(0.6);
        sleep((long) (square.sideSeconds * 1000));
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }

    class MissionPlan {
        String name;
        int sides;
        double sideSeconds;

        MissionPlan(String name, int sides, double sideSeconds) {
            this.name = name;
            this.sides = sides;
            this.sideSeconds = sideSeconds;
        }
    }
}
