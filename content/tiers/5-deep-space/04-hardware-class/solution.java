package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.HardwareMap;
import com.qualcomm.robotcore.hardware.Servo;

@TeleOp(name = "Shared Hardware", group = "Nebula")
public class SharedHardware extends OpMode {

    static class Hardware {
        DcMotor frontLeft;
        DcMotor frontRight;
        DcMotor backLeft;
        DcMotor backRight;
        Servo clawServo;

        void init(HardwareMap map) {
            frontLeft = map.get(DcMotor.class, "frontLeft");
            frontRight = map.get(DcMotor.class, "frontRight");
            backLeft = map.get(DcMotor.class, "backLeft");
            backRight = map.get(DcMotor.class, "backRight");
            clawServo = map.get(Servo.class, "clawServo");

            frontRight.setDirection(DcMotor.Direction.REVERSE);
            backRight.setDirection(DcMotor.Direction.REVERSE);
        }

        void drive(double power) {
            frontLeft.setPower(power);
            frontRight.setPower(power);
            backLeft.setPower(power);
            backRight.setPower(power);
        }

        void park() {
            frontLeft.setPower(0);
            frontRight.setPower(0);
            backLeft.setPower(0);
            backRight.setPower(0);
        }
    }

    private Hardware robot;

    @Override
    public void init() {
        robot = new Hardware();
        robot.init(hardwareMap);
    }

    @Override
    public void loop() {
        double power = -gamepad1.left_stick_y;

        robot.drive(power);

        telemetry.addData("drive", power);
        telemetry.update();
    }
}
