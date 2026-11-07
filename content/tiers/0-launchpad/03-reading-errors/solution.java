package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

@Autonomous(name = "Reading Errors")
public class ReadingErrors extends LinearOpMode {

    @Override
    public void runOpMode() {
        waitForStart();

        // Broken program 1 said:  ';' expected
        //     System.out.println("One")
        System.out.println("One");

        // Broken program 2 said:  cannot find symbol   symbol: variable cont
        //     int count = 2;
        //     System.out.println("Two " + cont);
        int count = 2;
        System.out.println("Two " + count);

        // Broken program 3 said:  reached end of file while parsing
        //     System.out.println("Three");
        //   (the file was missing its last brace)
        System.out.println("Three");

        // Broken program 4 said:  incompatible types: String cannot be converted to int
        //     int four = "4";
        int four = 4;
        System.out.println("Four " + four);

        // Broken program 5 said:  cannot find symbol   symbol: method toUpperCse()
        //     System.out.println("Five".toUpperCse());
        System.out.println("Five".toUpperCase());
    }
}
