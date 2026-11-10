import { el } from '../dom';
import { icon } from '../icons';
import { pathway } from '../../content/loader';
import { lessonHref } from '../router';

export function aboutPage(): HTMLElement {
  const first = pathway.tiers[0]?.lessons[0];
  return el('article', { class: 'prose-page about-page' },
    el('h1', { text: 'About Nebula Academy' }),
    el('figure', { class: 'about-mascot' },
      el('img', {
        src: `${import.meta.env.BASE_URL}art/mascot-hero-560.webp`,
        alt: 'The Nebula Academy mascot: a small purple astronaut with a blue helmet, yellow antenna tips and a big round visor.',
        width: '560',
        height: '1233',
        loading: 'lazy',
      }),
    ),
    el('p', { text: 'Nebula Academy teaches FTC robot programming in Java, from never having written a line of code to a working TeleOp and Autonomous you can put on your team\'s robot.' }),

    el('h2', { text: 'What it is' }),
    el('p', { text: 'Six tiers and 42 lessons. Every lesson runs real Java against a mocked FTC SDK and a virtual robot on a 12 ft field. The package names and method signatures are the real ones, so the code you write here pastes into Android Studio unchanged.' }),
    el('p', { text: 'There is no account and no server. Your progress and your code live in this browser, and you can export them to a file and bring them back on another computer.' }),

    el('h2', { text: 'The two modes' }),
    el('p', { text: 'Explorer is for ages 9 to 12: larger text, more of the code filled in and locked, and no theory panels. Builder is for ages 13 to 18: full editing, and a "Why this works" panel on every lesson that goes deeper.' }),
    el('p', { text: 'Both modes get the same lessons and the same tests. Switching mode never changes what you have to achieve, and you can switch at any time from the header.' }),

    el('h2', { text: 'What the robot is not' }),
    el('p', { text: 'The virtual robot is a teaching tool, not a physics engine. Distances and turn rates are chosen to be round numbers a kid can predict, and the field has no season-specific game elements. Your real robot will behave differently, which is exactly why Tier 4 teaches encoders and the IMU instead of stopwatches.' }),

    el('h2', { text: 'Credits and licences' }),
    el('p', { text: 'Built by and for an FTC team. The FIRST Tech Challenge SDK documentation is at ftc-docs.firstinspires.org, and the SDK itself is at github.com/FIRST-Tech-Challenge/FtcRobotController. Nebula Academy is not affiliated with or endorsed by FIRST.' }),
    el('p', { class: 'muted', text: 'Typefaces: Fredoka, Lexend and Atkinson Hyperlegible Next, all from Google Fonts. Atkinson Hyperlegible was designed by the Braille Institute to make letters easier to tell apart, which is why every lesson is set in it.' }),

    el('h2', { text: 'For mentors' }),
    el('p', {},
      'Each tier has a guide with the common mistakes, what to say when a kid is stuck, and a printable checkpoint rubric. ',
      el('a', { href: '#/mentor', text: 'Open the mentor guides' }),
      '.',
    ),

    first
      ? el('p', { class: 'about-start' },
          el('a', { href: lessonHref(first.id), class: 'btn btn-next' }, el('span', { text: 'Start lesson 1' }), icon('next', 20)),
        )
      : null,
  );
}
