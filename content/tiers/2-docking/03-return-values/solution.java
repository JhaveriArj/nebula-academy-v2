package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "Return Values")
public class ReturnValues extends LinearOpMode {

    private DcMotor leftDrive;
    private DcMotor rightDrive;

    @Override
    public void runOpMode() {
        leftDrive = hardwareMap.get(DcMotor.class, "leftDrive");
        rightDrive = hardwareMap.get(DcMotor.class, "rightDrive");

        waitForStart();

        int cm = 90;

        System.out.println("driving for " + msForCm(cm) + " ms");

        leftDrive.setPower(0.6);
        rightDrive.setPower(0.6);
        sleep(msForCm(cm));
        leftDrive.setPower(0);
        rightDrive.setPower(0);
    }

    private int msForCm(int cm) {
        return cm * 1000 / 60;
    }
}
