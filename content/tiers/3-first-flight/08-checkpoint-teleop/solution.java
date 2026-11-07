package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.Servo;

@TeleOp(name = "Nebula TeleOp", group = "Nebula")
public class NebulaTeleOp extends OpMode {

    private DcMotor frontLeft;
    private DcMotor frontRight;
    private DcMotor backLeft;
    private DcMotor backRight;
    private DcMotor armMotor;
    private Servo clawServo;

    @Override
    public void init() {
        frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        backRight = hardwareMap.get(DcMotor.class, "backRight");
        armMotor = hardwareMap.get(DcMotor.class, "armMotor");
        clawServo = hardwareMap.get(Servo.class, "clawServo");

        frontRight.setDirection(DcMotor.Direction.REVERSE);
        backRight.setDirection(DcMotor.Direction.REVERSE);

        telemetry.addData("status", "ready");
        telemetry.update();
    }

    @Override
    public void loop() {
        double drive = -gamepad1.left_stick_y;
        double strafe = gamepad1.left_stick_x;
        double turn = gamepad1.right_stick_x;

        frontLeft.setPower(drive + strafe + turn);
        frontRight.setPower(drive - strafe - turn);
        backLeft.setPower(drive - strafe + turn);
        backRight.setPower(drive + strafe - turn);

        armMotor.setPower(gamepad1.right_trigger - gamepad1.left_trigger);

        if (gamepad1.a) {
            clawServo.setPosition(1.0);
        } else if (gamepad1.b) {
            clawServo.setPosition(0.0);
        }

        telemetry.addData("drive", drive);
        telemetry.addData("strafe", strafe);
        telemetry.addData("turn", turn);
        telemetry.update();
    }
}
