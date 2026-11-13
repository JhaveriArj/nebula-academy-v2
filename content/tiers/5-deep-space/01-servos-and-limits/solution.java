package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.Servo;

@TeleOp(name = "Arm Limits", group = "Nebula")
public class ArmLimits extends OpMode {

    private DcMotor armMotor;
    private Servo clawServo;

    @Override
    public void init() {
        armMotor = hardwareMap.get(DcMotor.class, "armMotor");
        clawServo = hardwareMap.get(Servo.class, "clawServo");
        clawServo.setPosition(0.0);
    }

    @Override
    public void loop() {
        double armPower = gamepad1.right_trigger - gamepad1.left_trigger;
        int ticks = armMotor.getCurrentPosition();

        if (armPower > 0 && ticks >= 1100) {
            armPower = 0;
            telemetry.addLine("arm at limit");
        } else if (armPower < 0 && ticks <= 50) {
            armPower = 0;
        }

        armMotor.setPower(armPower);

        if (gamepad1.a) {
            clawServo.setPosition(1.0);
        } else if (gamepad1.b) {
            clawServo.setPosition(0.0);
        }

        telemetry.addData("armTicks", ticks);
        telemetry.update();
    }
}
