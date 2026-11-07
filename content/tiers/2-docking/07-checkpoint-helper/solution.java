package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Robot Helper")
public class RobotHelper extends LinearOpMode {

    private DcMotor leftDrive;
    private DcMotor rightDrive;

    @Override
    public void runOpMode() {
        leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        Robot robot = new Robot(leftDrive, rightDrive, this);

        robot.driveForward(2.0);
        robot.turnLeft();
        robot.driveForward(1.0);
    }

    class Robot {
        DcMotor left;
        DcMotor right;
        LinearOpMode opMode;

        Robot(DcMotor left, DcMotor right, LinearOpMode opMode) {
            this.left = left;
            this.right = right;
            this.opMode = opMode;
        }

        void driveForward(double seconds) {
            left.setPower(0.7);
            right.setPower(0.7);
            opMode.sleep((long) (seconds * 1000));
            stopMoving();
        }

        void turnLeft() {
            left.setPower(-0.5);
            right.setPower(0.5);
            opMode.sleep(785);
            stopMoving();
        }

        void turnRight() {
            left.setPower(0.5);
            right.setPower(-0.5);
            opMode.sleep(785);
            stopMoving();
        }

        void stopMoving() {
            left.setPower(0);
            right.setPower(0);
        }
    }
}
