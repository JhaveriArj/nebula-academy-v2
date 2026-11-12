import { el, svg, prefersReducedMotion } from '../dom';
import { icon } from '../icons';
import { pathway } from '../../content/loader';
import { lessonHref } from '../router';
import { fieldThumb, inkArrow, mascot, paper, routeOf } from '../kit';
import { HERO_SPEC } from '../heroDemo';
import { playWatch } from '../../sim/watch';
import { FIELD_CM } from '../../sim/field';

/* About: the text on the left in numbered sections, read in order; on the right, a sticky
   column with the mascot standing on the ground and a small field driving the Tier 0 square
   slowly, round and round, with a hand-written note that the field is not to scale. */

export function aboutPage(): HTMLElement {
  const first = pathway.tiers[0]?.lessons[0];
  const section = (n: number, title: string, ...body: (Node | string | null)[]) =>
    el('section', { class: 'about-section', 'aria-labelledby': `about-${n}` },
      el('h2', { id: `about-${n}`, class: 'about-h' },
        el('span', { class: 'about-num', 'aria-hidden': 'true', text: String(n).padStart(2, '0') }),
        el('span', { class: 'display', text: title }),
      ),
      ...body);

  return el('div', { class: 'about-page' },
    el('article', { class: 'about-text' },
      el('h1', { class: 'display', text: 'About Nebula Academy' }),
      el('p', { class: 'about-lede', text: 'Nebula Academy teaches FTC robot programming in Java, from never having written a line of code to a working TeleOp and Autonomous you can put on your team\'s robot.' }),

      section(1, 'What it is',
        el('p', { text: 'Six tiers and 42 lessons. Every lesson runs real Java against a mocked FTC SDK and a virtual robot on a 12 ft field. The package names and method signatures are the real ones, so the code you write here pastes into Android Studio unchanged.' }),
        el('p', { text: 'There is no account. Your progress and your code live in this browser, and you can export them to a file and bring them back on another computer.' }),
        el('p', { text: 'If your mentor runs a class, you can join it from the Progress page with a class code and a nickname. The class then sees which lessons you passed and when. Your code, your real name and anything else stay in this browser, and leaving the class deletes what it had.' }),
      ),

      section(2, 'The two modes',
        el('p', { text: 'Explorer is for ages 9 to 12: larger text, more of the code filled in and locked, and no theory panels. Builder is for ages 13 to 18: full editing, and a "Why this works" panel on every lesson that goes deeper.' }),
        modeMockups(),
        el('p', { text: 'Both modes get the same lessons and the same tests. Switching mode never changes what you have to achieve, and you can switch at any time from the header.' }),
      ),

      section(3, 'What the robot is not',
        el('p', { text: 'The virtual robot is a teaching tool, not a physics engine. Distances and turn rates are chosen to be round numbers a kid can predict, and the field has no season-specific game elements. Your real robot will behave differently, which is exactly why Tier 4 teaches encoders and the IMU instead of stopwatches.' }),
      ),

      section(4, 'For mentors',
        el('p', {},
          'Each tier has a guide with the common mistakes, what to say when a kid is stuck, and a printable checkpoint rubric. ',
          el('a', { href: '#/mentor', text: 'Open the mentor guides' }),
          '.',
        ),
      ),

      section(5, 'Credits',
        el('div', { class: 'about-credits' },
          paper('plain',
            el('p', { text: 'Built by and for an FTC team. The FIRST Tech Challenge SDK documentation is at ftc-docs.firstinspires.org, and the SDK itself is at github.com/FIRST-Tech-Challenge/FtcRobotController. Nebula Academy is not affiliated with or endorsed by FIRST.' }),
            el('p', { text: 'Typefaces: Fredoka, Lexend and Atkinson Hyperlegible Next, free under the SIL Open Font License and served from this site, not from a font service. Atkinson Hyperlegible was designed by the Braille Institute to make letters easier to tell apart, which is why every lesson is set in it.' }),
          ),
        ),
      ),

      first
        ? el('p', { class: 'about-start' },
            el('a', { href: lessonHref(first.id), class: 'btn btn-next' }, el('span', { text: 'Start lesson 1' }), icon('next', 20)),
          )
        : null,
    ),

    el('aside', { class: 'about-side', 'aria-label': 'The mascot and the field' },
      mascot('full', { height: 240, alt: 'The Nebula Academy mascot: a small purple astronaut with a blue helmet, yellow antenna tips and a big round visor.' }),
      liveField(),
    ),
  );
}

/** The two editors side by side, small, drawn from the same five lines of lesson 1:
    Explorer locks all but the line to change (a padlock in the gutter, a yellow bar on the
    open line); Builder leaves everything open and adds the "Why this works" tab. */
function modeMockups(): HTMLElement {
  const lines: [string, boolean][] = [
    ['leftDrive.setPower(0.5);', false],
    ['rightDrive.setPower(0.5);', false],
    ['sleep(2000);', true],
    ['leftDrive.setPower(0);', false],
    ['rightDrive.setPower(0);', false],
  ];
  const lock = () => svg('svg', { viewBox: '0 0 16 16', width: '11', height: '11', class: 'about-lock' },
    svg('path', { d: 'M4 7.5h8v6H4z M5.75 7.5V5.5a2.25 2.25 0 0 1 4.5 0v2' }));
  const mock = (mode: 'explorer' | 'builder') =>
    el('figure', { class: `about-mock is-${mode}` },
      el('div', { class: 'about-mock-bar' },
        el('span', { class: 'about-mock-tab is-on', text: 'Try' }),
        mode === 'builder' ? el('span', { class: 'about-mock-tab', text: 'Why this works' }) : null,
      ),
      el('div', { class: 'about-mock-code', 'aria-hidden': 'true' },
        ...lines.map(([text, open], i) => el('div', { class: `about-mock-line${mode === 'explorer' ? (open ? ' is-open' : ' is-locked') : ''}` },
          el('span', { class: 'about-mock-n', text: String(17 + i + (i > 1 ? 2 : 0)) }),
          el('span', { class: 'about-mock-gutter' }, mode === 'explorer' && !open ? lock() : null),
          el('code', { text }),
        )),
      ),
      el('figcaption', {},
        el('strong', { class: 'display', text: mode === 'explorer' ? 'Explorer' : 'Builder' }),
        mode === 'explorer' ? ' One line open, the rest locked.' : ' Every line open, and a panel that goes deeper.'),
    );
  return el('div', { class: 'about-mocks' }, mock('explorer'), mock('builder'));
}

/** A small field with the Tier 0 square drawn in and a robot driving it, slowly, in a loop.
    It pauses when it is off screen or the tab is hidden, and stands still at the start for
    reduced motion. */
function liveField(): HTMLElement {
  const route = routeOf(HERO_SPEC);
  const thumb = fieldThumb(route, { size: 200, label: 'A small field with the Tier 0 square drawn on it, and a robot driving round it' });
  const frames = playWatch(HERO_SPEC).map((f) => f.snapshot.pose);
  const k = 120 / FIELD_CM;
  const robot = svg('rect', { x: '-5', y: '-5', width: '10', height: '10', rx: '1.5', class: 'kit-thumb-robot about-robot' });
  thumb.querySelector('.kit-thumb-robot')?.remove();
  thumb.append(robot);
  const put = (i: number) => {
    const p = frames[i]!;
    robot.setAttribute('transform', `translate(${(p.x * k).toFixed(1)} ${((FIELD_CM - p.y) * k).toFixed(1)}) rotate(${-p.headingDeg})`);
  };
  put(0);

  const figure = el('figure', { class: 'about-field' },
    thumb,
    el('figcaption', { class: 'about-field-note' }, inkArrow(40), el('span', { text: 'not to scale: the real field is 12 ft' })),
  );

  if (!prefersReducedMotion()) {
    // One frame of the watch run is 20 ms of sim time; played at half speed, so one lap of
    // the square takes about 15 s.
    const msPerFrame = 40;
    let start = 0;
    let raf = 0;
    let visible = false;
    const tick = (now: number) => {
      if (!start) start = now;
      put(Math.floor((now - start) / msPerFrame) % frames.length);
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !document.hidden) raf = requestAnimationFrame(tick);
      if (!figure.isConnected) io.disconnect();
    });
    queueMicrotask(() => io.observe(figure));
    // Removed once the page is gone, so each About visit does not leave its figure in memory.
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!figure.isConnected) { document.removeEventListener('visibilitychange', onVisibility); io.disconnect(); return; }
      if (visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', onVisibility);
  }
  return figure;
}
