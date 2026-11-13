package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.HardwareMap;
import com.qualcomm.robotcore.hardware.Servo;
import com.qualcomm.robotcore.hardware.DistanceSensor;
import com.qualcomm.robotcore.hardware.IMU;
import com.qualcomm.hardware.rev.RevHubOrientationOnRobot;
import org.firstinspires.ftc.robotcore.external.navigation.AngleUnit;
import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;

@Autonomous(name = "Nebula Auto", group = "Nebula")
public class NebulaAuto extends LinearOpMode {

    static class Hardware {
        DcMotor frontLeft;
        DcMotor frontRight;
        DcMotor backLeft;
        DcMotor backRight;
        Servo clawServo;
        DistanceSensor distanceSensor;
        IMU imu;

        void init(HardwareMap map) {
            frontLeft = map.get(DcMotor.class, "frontLeft");
            frontRight = map.get(DcMotor.class, "frontRight");
            backLeft = map.get(DcMotor.class, "backLeft");
            backRight = map.get(DcMotor.class, "backRight");
            clawServo = map.get(Servo.class, "clawServo");
            distanceSensor = map.get(DistanceSensor.class, "distanceSensor");
            imu = map.get(IMU.class, "imu");

            frontRight.setDirection(DcMotor.Direction.REVERSE);
            backRight.setDirection(DcMotor.Direction.REVERSE);

            imu.initialize(new IMU.Parameters(new RevHubOrientationOnRobot(
                    RevHubOrientationOnRobot.LogoFacingDirection.UP,
                    RevHubOrientationOnRobot.UsbFacingDirection.FORWARD)));
        }

        void drive(double power) {
            frontLeft.setPower(power);
            frontRight.setPower(power);
            backLeft.setPower(power);
            backRight.setPower(power);
        }

        void spinLeft(double power) {
            frontLeft.setPower(-power);
            frontRight.setPower(power);
            backLeft.setPower(-power);
            backRight.setPower(power);
        }

        void park() {
            drive(0);
        }

        void closeClaw() {
            clawServo.setPosition(1.0);
        }

        double cmAhead() {
            return distanceSensor.getDistance(DistanceUnit.CM);
        }

        double yaw() {
            return imu.getRobotYawPitchRollAngles().getYaw(AngleUnit.DEGREES);
        }
    }

    private Hardware robot;

    @Override
    public void runOpMode() {
        robot = new Hardware();
        robot.init(hardwareMap);

        waitForStart();
        robot.imu.resetYaw();

        while (opModeIsActive() && robot.cmAhead() > 25) {
            robot.drive(0.4);
            telemetry.addData("step", "to the wall");
            telemetry.addData("cm", robot.cmAhead());
            telemetry.update();
        }
        robot.park();

        while (opModeIsActive()) {
            double error = 90 - robot.yaw();

            if (Math.abs(error) < 1.0) {
                break;
            }

            double power = error * 0.012;

            if (power > 0.4) {
                power = 0.4;
            }
            if (power > 0 && power < 0.08) {
                power = 0.08;
            }

            robot.spinLeft(power);
            telemetry.addData("step", "turning");
            telemetry.addData("error", error);
            telemetry.update();
        }
        robot.park();

        robot.closeClaw();

        telemetry.addLine("Pre-run checklist");
        telemetry.addLine("1. Battery charged and clipped in");
        telemetry.addLine("2. Configuration names match the code");
        telemetry.addLine("3. Arm at the bottom before power on");
        telemetry.addLine("4. Field clear of people and tools");
        telemetry.addLine("5. Driver knows which OpMode to pick");

        telemetry.addData("step", "parked");
        telemetry.update();
    }
}
