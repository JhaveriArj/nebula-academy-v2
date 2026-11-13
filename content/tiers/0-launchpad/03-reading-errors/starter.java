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
        // TODO: write that line, fixed, so it shows One

        // Broken program 2 said:  cannot find symbol   symbol: variable cont
        //     int count = 2;
        //     telemetry.addLine("Two " + cont);
        int count = 2;
        // TODO: write the telemetry line, fixed, so it shows Two 2

        // Broken program 3 said:  reached end of file while parsing
        //     telemetry.addLine("Three");
        //   (the file was missing its last brace)
        // TODO: write the line, which was fine all along, so it shows Three

        // Broken program 4 said:  incompatible types: String cannot be converted to int
        //     int four = "4";
        // TODO: declare int four with a real number, then show Four 4

        // Broken program 5 said:  cannot find symbol   symbol: method toUpperCse()
        //     telemetry.addLine("Five".toUpperCse());
        // TODO: write it with the spelling fixed, so it shows FIVE

        // This sends every line above to the Driver Station.
        telemetry.update();
    }
}
