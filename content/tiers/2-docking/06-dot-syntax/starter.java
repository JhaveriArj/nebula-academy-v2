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

        // TODO 2: show reporter.describe() with telemetry.addLine

        // TODO 3: show "Nebula".toUpperCase() with telemetry.addLine

        leftDrive.setPower(0.6);
        rightDrive.setPower(0.6);
        sleep(1000);

        // TODO 4: show leftDrive.getPower(), labelled "power was", then telemetry.update()

        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }

    class Reporter {
        String team;

        Reporter(String team) {
            this.team = team;
        }

        // TODO 1: write a method called describe that takes nothing and returns a
        //         String. It returns "team " joined to team.
    }
}
