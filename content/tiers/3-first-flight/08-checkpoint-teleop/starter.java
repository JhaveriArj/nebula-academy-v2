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

        // TODO 1: mix drive, strafe and turn into the four wheel powers.
        //         frontLeft gets drive + strafe + turn.
        //         frontRight gets drive - strafe - turn.
        //         backLeft gets drive - strafe + turn.
        //         backRight gets drive + strafe - turn.

        // TODO 2: give armMotor the right trigger minus the left trigger.

        // TODO 3: when A is held, move clawServo to 1.0. When B is held, to 0.0.

        // TODO 4: show drive, strafe and turn on telemetry, then send it.
    }
}
