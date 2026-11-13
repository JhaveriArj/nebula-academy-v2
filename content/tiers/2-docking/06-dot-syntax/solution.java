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

        telemetry.addLine(reporter.describe());

        telemetry.addLine("Nebula".toUpperCase());

        leftDrive.setPower(0.6);
        rightDrive.setPower(0.6);
        sleep(1000);

        telemetry.addData("power was", leftDrive.getPower());
        telemetry.update();

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
