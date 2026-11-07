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
            // TODO 1: fetch all four motors and clawServo from map, then reverse
            //         frontRight and backRight.
        }

        void drive(double power) {
            // TODO 2: give all four motors that power.
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
        // TODO 3: drive from the left stick with robot.drive, remembering the
        //         minus sign, and show the power on telemetry under "drive".
    }
}
