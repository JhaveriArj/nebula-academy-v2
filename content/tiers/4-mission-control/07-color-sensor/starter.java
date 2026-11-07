package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.ColorSensor;

@Autonomous(name = "Read The Floor", group = "Nebula")
public class ReadTheFloor extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        DcMotor frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        DcMotor backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        DcMotor backRight = hardwareMap.get(DcMotor.class, "backRight");

        frontRight.setDirection(DcMotor.Direction.REVERSE);
        backRight.setDirection(DcMotor.Direction.REVERSE);

        ColorSensor colorSensor = hardwareMap.get(ColorSensor.class, "colorSensor");

        waitForStart();

        // TODO 1: while the OpMode is active and blue() is not more than red(),
        //         creep forward at 0.3 and show blue() under the key "blue".

        // TODO 2: stop all four motors, then show "blue" under the key "tile".
    }
}
