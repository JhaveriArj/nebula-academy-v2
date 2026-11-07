package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;

@TeleOp(name = "Hardware Names", group = "Nebula")
public class HardwareNames extends OpMode {

    private DcMotor frontLeft;
    private DcMotor frontRight;
    private DcMotor backLeft;
    private DcMotor backRight;

    @Override
    public void init() {
        // TODO: fetch all four motors from the hardware map, then print
        //       frontLeft.getDeviceName() joined to " ready".
    }

    @Override
    public void loop() {
    }
}
