package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "True And False")
public class TrueAndFalse extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        DcMotor rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        double speed = 0.3;

        // TODO 1: make a boolean called fastEnough that is true when speed is more than 0.5.

        // TODO 2: show fastEnough on the Driver Station, then telemetry.update().

        // TODO 3: change speed above so that fastEnough comes out true.

        leftDrive.setPower(speed);
        rightDrive.setPower(speed);
        sleep(1500);
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }
}
