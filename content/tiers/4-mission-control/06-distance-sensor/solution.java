package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DistanceSensor;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;

@Autonomous(name = "Stop At The Wall", group = "Nebula")
public class StopAtTheWall extends LinearOpMode {

    @Override
    public void runOpMode() {
        DcMotor frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        DcMotor frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        DcMotor backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        DcMotor backRight = hardwareMap.get(DcMotor.class, "backRight");

        frontRight.setDirection(DcMotor.Direction.REVERSE);
        backRight.setDirection(DcMotor.Direction.REVERSE);

        DistanceSensor distanceSensor = hardwareMap.get(DistanceSensor.class, "distanceSensor");

        waitForStart();

        while (opModeIsActive() && distanceSensor.getDistance(DistanceUnit.CM) > 20) {
            frontLeft.setPower(0.4);
            frontRight.setPower(0.4);
            backLeft.setPower(0.4);
            backRight.setPower(0.4);
            telemetry.addData("cm", distanceSensor.getDistance(DistanceUnit.CM));
            telemetry.update();
        }

        frontLeft.setPower(0);
        frontRight.setPower(0);
        backLeft.setPower(0);
        backRight.setPower(0);
    }
}
