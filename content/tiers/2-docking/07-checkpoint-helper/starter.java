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

        // TODO 4: drive the mission. Go forward 2 seconds, turn left, go forward 1 second.

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

        // TODO 1: write driveForward(double seconds). Both wheels at 0.7 for that
        //         many seconds, then stopMoving(). Use opMode.sleep for the wait.

        // TODO 2: write turnLeft(). left wheel -0.5, right wheel 0.5,
        //         opMode.sleep(785), then stopMoving().

        // TODO 3: write turnRight(). The same as turnLeft with the powers swapped.

        void stopMoving() {
            left.setPower(0);
            right.setPower(0);
        }
    }
}
