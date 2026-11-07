package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.Servo;

@TeleOp(name = "Arm Limits", group = "Nebula")
public class ArmLimits extends OpMode {

    private DcMotor armMotor;
    private Servo clawServo;
    private boolean warned;

    @Override
    public void init() {
        armMotor = hardwareMap.get(DcMotor.class, "armMotor");
        clawServo = hardwareMap.get(Servo.class, "clawServo");
        clawServo.setPosition(0.0);
        warned = false;
    }

    @Override
    public void loop() {
        double armPower = gamepad1.right_trigger - gamepad1.left_trigger;
        int ticks = armMotor.getCurrentPosition();

        // TODO 1: if armPower is going up and ticks are already 1100 or more,
        //         set armPower to 0. The first time that happens, print
        //         "arm at limit" and set warned to true so it only prints once.
        //         If armPower is going down and ticks are 50 or less, set it to 0.

        armMotor.setPower(armPower);

        // TODO 2: when A is held move clawServo to 1.0, when B is held to 0.0.

        telemetry.addData("armTicks", ticks);
        telemetry.update();
    }
}
