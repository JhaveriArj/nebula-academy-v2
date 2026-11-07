package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.util.ElapsedTime;

@TeleOp(name = "State Machine", group = "Nebula")
public class StateMachine extends OpMode {

    enum State { IDLE, DRIVE, TURN, DONE }

    private State state;
    private ElapsedTime timer;
    private DcMotor frontLeft;
    private DcMotor frontRight;
    private DcMotor backLeft;
    private DcMotor backRight;

    @Override
    public void init() {
        frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        backRight = hardwareMap.get(DcMotor.class, "backRight");

        frontRight.setDirection(DcMotor.Direction.REVERSE);
        backRight.setDirection(DcMotor.Direction.REVERSE);

        state = State.IDLE;
        timer = new ElapsedTime();
    }

    @Override
    public void loop() {
        // TODO: write the switch. In IDLE, pressing A moves to DRIVE, resets the
        //       timer and prints "DRIVE". In DRIVE, drive(0.5) until the timer
        //       passes 1.0, then park, reset, move to TURN and print "TURN".
        //       In TURN, spinLeft(0.3) until the timer passes 0.8, then park,
        //       move to DONE and print "DONE". In DONE, park.

        telemetry.addData("state", state);
        telemetry.update();
    }

    private void drive(double power) {
        frontLeft.setPower(power);
        frontRight.setPower(power);
        backLeft.setPower(power);
        backRight.setPower(power);
    }

    private void spinLeft(double power) {
        frontLeft.setPower(-power);
        frontRight.setPower(power);
        backLeft.setPower(-power);
        backRight.setPower(power);
    }

    private void park() {
        frontLeft.setPower(0);
        frontRight.setPower(0);
        backLeft.setPower(0);
        backRight.setPower(0);
    }
}
