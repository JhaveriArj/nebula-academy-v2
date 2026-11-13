package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@Autonomous(name = "Reading Errors")
public class ReadingErrors extends LinearOpMode {

    @Override
    public void runOpMode() {
        waitForStart();

        // Broken program 1 said:  ';' expected
        //     telemetry.addLine("One")
        telemetry.addLine("One");

        // Broken program 2 said:  cannot find symbol   symbol: variable cont
        //     int count = 2;
        //     telemetry.addLine("Two " + cont);
        int count = 2;
        telemetry.addLine("Two " + count);

        // Broken program 3 said:  reached end of file while parsing
        //     telemetry.addLine("Three");
        //   (the file was missing its last brace)
        telemetry.addLine("Three");

        // Broken program 4 said:  incompatible types: String cannot be converted to int
        //     int four = "4";
        int four = 4;
        telemetry.addLine("Four " + four);

        // Broken program 5 said:  cannot find symbol   symbol: method toUpperCse()
        //     telemetry.addLine("Five".toUpperCse());
        telemetry.addLine("Five".toUpperCase());

        // This sends every line above to the Driver Station.
        telemetry.update();
    }
}
