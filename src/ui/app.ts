import { el, mount } from './dom';
import { applyMode, createHeader } from './header';
import { siteFooter } from './footer';
import { classPage } from './pages/classPage';
import { refreshMembership, syncPasses } from '../classes/membership';
import { prefersReducedMotion } from './dom';
import { parseHash, startRouter, type Route } from './router';
import { homePage } from './pages/home';
import { chartPage } from './pages/chart';
// The lesson page carries CodeMirror and the Java runtime, which no other page needs, so it
// is loaded on first use. That keeps them off the home page's first load.
let lessonModule: Promise<typeof LessonPageModule> | null = null;
const loadLesson = (): Promise<typeof LessonPageModule> => (lessonModule ??= import('./pages/lesson'));
import { mentorPage } from './pages/mentor';
import { aboutPage } from './pages/about';
import { progressPage } from './pages/progress';
import { pathway } from '../content/loader';
import type * as LessonPageModule from './pages/lesson';

/* The shell. A header, one outlet, and a route handler. No framework, per
   docs/ARCHITECTURE.md: there are six pages and each builds itself once. */

export function startApp(root: HTMLElement): void {
  applyMode();

  const outlet = el('main', { id: 'main', class: 'outlet', tabindex: '-1' });
  /** A lesson just passed, so the chart should animate when we land on it. */
  let celebrateOn: string | null = null;

  const header = createHeader(() => {
    // Mode changed. A lesson updates its own locks and keeps the kid on the step they were
    // on; re-rendering it would throw them back to Mission. Other pages re-render.
    const route = parseHash(location.hash);
    if (route.name === 'lesson') {
      outlet.firstElementChild?.dispatchEvent(new CustomEvent('nebula:modechange', { bubbles: false }));
    } else {
      render(route);
    }
  });

  mount(root, header.element, outlet, siteFooter());

  let renderTicket = 0;
  let lastRoute: Route['name'] | null = null;
  /** Where the chart was scrolled to, so coming back to it lands in the same place. */
  let chartScroll = 0;

  function render(route: Route): void {
    renderTicket++;
    if (lastRoute === 'chart') chartScroll = scrollY;
    // Let the page it replaces release timers, workers and the editor.
    outlet.firstElementChild?.dispatchEvent(new CustomEvent('nebula:leave', { bubbles: false }));

    // The graphic kit's contact sheet, for review in development only; never in a build.
    if (import.meta.env.DEV && location.hash.startsWith('#/kit')) {
      document.title = `Graphic kit · Nebula Academy`;
      document.body.dataset.route = 'kit';
      void import('./pages/kitSheet').then(({ kitSheet }) => mount(outlet, kitSheet()));
      return;
    }
    document.title = titleFor(route);
    // The home page is always the navy notebook cover; the header matches it there.
    document.body.dataset.route = route.name;

    switch (route.name) {
      case 'chart': {
        const page = chartPage();
        mount(outlet, page.element);
        if (celebrateOn) {
          const lessonId = celebrateOn;
          celebrateOn = null;
          requestAnimationFrame(() => page.celebrate(lessonId));
        }
        break;
      }
      case 'lesson': {
        const ticket = ++renderTicket;
        mount(outlet, el('p', { class: 'prose-page muted', role: 'status', text: 'Opening the lesson.' }));
        void loadLesson().then(({ lessonPage }) => {
          // The kid may have gone somewhere else while it loaded.
          if (ticket !== renderTicket) return;
          mount(outlet, lessonPage(route.param ?? '', {
            onPassed: (lessonId) => {
              celebrateOn = lessonId;
              void syncPasses();
              header.refresh();
            },
          }));
          outlet.focus({ preventScroll: true });
        });
        break;
      }
      case 'mentor':
        mount(outlet, mentorPage(route.param));
        break;
      case 'about':
        mount(outlet, aboutPage());
        break;
      case 'progress':
        mount(outlet, progressPage(() => { header.refresh(); void syncPasses(); }));
        break;
      case 'class':
        mount(outlet, classPage(route.param ?? ''));
        break;
      default:
        mount(outlet, homePage());
    }

    header.refresh();
    // Moving focus to the outlet is what makes a hash route usable with a keyboard.
    outlet.focus({ preventScroll: true });
    // Every page starts at the top, except the chart, which you come back to mid-scroll.
    const restore = route.name === 'chart' && lastRoute !== null ? chartScroll : 0;
    scrollTo({ top: restore, behavior: 'instant' as ScrollBehavior });
    // A 200ms fade between pages (the first page appears as it is).
    if (lastRoute !== null && !prefersReducedMotion()) {
      outlet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    }
    lastRoute = route.name;
  }

  startRouter(render);

  // Fetch the lesson code once the first page is up and the browser is idle, so opening a
  // lesson later does not wait on it.
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
    ?? ((cb: () => void) => setTimeout(cb, 1500));
  idle(() => void loadLesson());
  // A kid in a class: send any passes made while offline, and notice if they were removed.
  idle(() => { void refreshMembership().then(() => syncPasses()).catch(() => undefined); });
}

function titleFor(route: Route): string {
  const base = 'Nebula Academy';
  switch (route.name) {
    case 'chart': return `Star chart · ${base}`;
    case 'lesson': {
      const lesson = pathway.tiers.flatMap((t) => t.lessons).find((l) => l.id === route.param);
      return `${lesson?.title ?? 'Lesson'} · ${base}`;
    }
    case 'mentor': return `Mentor guides · ${base}`;
    case 'about': return `About · ${base}`;
    case 'progress': return `Your progress · ${base}`;
    case 'class': return `Class ${route.param ?? ''} · ${base}`;
    default: return `${base} — program a competition robot in real Java`;
  }
}
