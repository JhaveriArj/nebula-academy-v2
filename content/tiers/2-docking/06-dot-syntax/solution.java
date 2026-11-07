package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Dot Syntax")
public class DotSyntax extends LinearOpMode {

    private DcMotor leftDrive;
    private DcMotor rightDrive;

    @Override
    public void runOpMode() {
        leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        Reporter reporter = new Reporter("Nebula");

        System.out.println(reporter.describe());

        System.out.println("Nebula".toUpperCase());

        leftDrive.setPower(0.6);
        rightDrive.setPower(0.6);
        sleep(1000);

        System.out.println("power was " + leftDrive.getPower());

        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }

    class Reporter {
        String team;

        Reporter(String team) {
            this.team = team;
        }

        String describe() {
            return "team " + team;
        }
    }
}
