import { el, mount } from './dom';
import { applyMode, createHeader } from './header';
import { parseHash, startRouter, type Route } from './router';
import { homePage } from './pages/home';
import { chartPage } from './pages/chart';
import { lessonPage } from './pages/lesson';
import { mentorPage } from './pages/mentor';
import { aboutPage } from './pages/about';
import { progressPage } from './pages/progress';
import { pathway } from '../content/loader';

/* The shell. A header, one outlet, and a route handler. No framework, per
   docs/ARCHITECTURE.md: there are six pages and each builds itself once. */

export function startApp(root: HTMLElement): void {
  applyMode();

  const outlet = el('main', { id: 'main', class: 'outlet', tabindex: '-1' });
  /** A lesson just passed, so the chart should animate when we land on it. */
  let celebrateOn: string | null = null;

  const header = createHeader(() => {
    // Mode changed: let the current page react without a full reload.
    outlet.firstElementChild?.dispatchEvent(new CustomEvent('nebula:modechange', { bubbles: false }));
    render(parseHash(location.hash));
  });

  mount(root, header.element, outlet);

  function render(route: Route): void {
    // Let the page it replaces release timers, workers and the editor.
    outlet.firstElementChild?.dispatchEvent(new CustomEvent('nebula:leave', { bubbles: false }));

    document.title = titleFor(route);

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
      case 'lesson':
        mount(outlet, lessonPage(route.param ?? '', {
          onPassed: (lessonId) => {
            celebrateOn = lessonId;
            header.refresh();
          },
        }));
        break;
      case 'mentor':
        mount(outlet, mentorPage(route.param));
        break;
      case 'about':
        mount(outlet, aboutPage());
        break;
      case 'progress':
        mount(outlet, progressPage(() => header.refresh()));
        break;
      default:
        mount(outlet, homePage());
    }

    header.refresh();
    // Moving focus to the outlet is what makes a hash route usable with a keyboard.
    outlet.focus({ preventScroll: true });
    scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }

  startRouter(render);
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
    default: return `${base} — learn FTC robot programming in Java`;
  }
}
