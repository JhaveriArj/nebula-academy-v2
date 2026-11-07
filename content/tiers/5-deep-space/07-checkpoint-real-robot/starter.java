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

        // TODO 1: drive to the wall. While active and robot.cmAhead() is more
        //         than 25, robot.drive(0.4). Then robot.park().

        // TODO 2: turn square. Use the proportional turn from lesson 03 to reach
        //         90 degrees, with kP of 0.012, clamped to 0.4 and a floor of 0.08,
        //         stopping once Math.abs(error) is under 1.0. Then robot.park().

        // TODO 3: robot.closeClaw(), then print the pre-run checklist: a line
        //         reading "Pre-run checklist" and then five numbered lines.
    }
}
