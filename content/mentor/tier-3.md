# Mentor guide: Tier 3, First Flight

Eight lessons, three hours. **Mecanum from here on.** This is the tier where the code
becomes real FTC code. Everything a kid writes from lesson 01 onwards would run on your
team's robot, and it is worth telling them that out loud on day one.

## What they already have

Methods, parameters, returns, classes, objects and the dot. They can read
`thing.doSomething()`. They have never seen an OpMode.

## Common mistakes, in the order you will see them

**They expect `runOpMode` and find `init` and `loop`.** Lessons 01 and 02 exist for this.
The sentence that lands is "you are not in charge of when your code runs any more".

**Setting up inside `loop`.** The most common structural mistake in the tier, and it often
appears to work. Ask "how many times should this happen?"

**A local variable where a field was needed.** Lesson 01's counter resets to zero every
pass if they declare it inside `loop`. The count stays at 1 and they cannot see why.

**`"frontleft"` instead of `"frontLeft"`.** Lesson 03. The error names the devices the
robot does have, so get them to read it rather than explaining.

**They expect one motor to drive the robot forward.** Lesson 04 is built on it not doing
that. Let them watch the robot slew before saying anything.

**They skip the reversals and conclude the sim is broken.** Lesson 05, and this is the
whole lesson. Have them press Run first and watch it spin. On a real robot this is the
same symptom and the same fix.

**The missing minus sign.** Lesson 06. The robot drives backwards and the kid is certain
the code is right. Ask them what number the stick gives when pushed forward.

**No `telemetry.update()`.** Lesson 07. Nothing appears and they assume `addData` is
broken. This catches experienced people too.

**Signs wrong in the mecanum mixing.** Lesson 08. The symptom tells you which: spins when
asked to strafe means the `turn` signs; strafes when asked to drive means `strafe`. Ask
them to set two of the three to zero and test one at a time.

**Full diagonal does not go where they aimed.** Lesson 08's Boost. The sum passes 1.0 and
the motor clips. Worth doing with any kid who will drive at a competition.

## What to say when a kid is stuck

- "How often should that line run?" Sorts `init` from `loop` every time.
- "Put it on telemetry." The answer to almost every "why is it doing that".
- "Set two of the three sticks to zero and try one." Untangles all mixing bugs.
- For a robot moving the wrong way: "which wheels are turning the wrong way?" That is how
  teams really debug it.
- Resist fixing the signs for them. Finding them is the skill.

## What this tier does not cover

Autonomous, sensors, encoders, the IMU. The TeleOp here drives on raw stick values with no
ramping and no field-centric steering, which is on purpose: both are better understood once
proportional control has been met in Tier 5.

## Checkpoint rubric: Mecanum TeleOp

| | Not yet | Got it | Going further |
|---|---|---|---|
| **Driving** | Drives but will not strafe, or spins when it should slide | Drive, strafe and spin all work, alone and together | Added scaling so full diagonal drives true |
| **Structure** | Hardware fetched in `loop` | Setting up in `init`, watching in `loop` | Can say why that matters without prompting |
| **Arm and claw** | One works | Arm on triggers, claw on A and B, predictable when both held | Arm has a software limit |
| **Telemetry** | Nothing on screen, or `update` missing | The three stick values readable while driving | Shows something they chose to debug with |

**One question before they move on:** "Why is `frontRight` reversed?" If the answer
mentions how the motor is bolted on rather than "because the lesson said so", they are
ready for Tier 4.
