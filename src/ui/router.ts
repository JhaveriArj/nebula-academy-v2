/* A hash router, because GitHub Pages serves no rewrites and `#/lesson/t1-05` is the only
   thing that reliably deep-links. See docs/ARCHITECTURE.md. */

export interface Route {
  name: 'home' | 'chart' | 'lesson' | 'mentor' | 'about' | 'progress' | 'class';
  /** Lesson id, or tier number for the mentor page. */
  param: string | null;
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  if (!path) return { name: 'home', param: null };
  const [head, tail] = path.split('/');
  switch (head) {
    case 'chart':
      return { name: 'chart', param: null };
    case 'lesson':
      return tail ? { name: 'lesson', param: tail } : { name: 'chart', param: null };
    case 'mentor':
      return { name: 'mentor', param: tail ?? null };
    case 'about':
      return { name: 'about', param: null };
    case 'progress':
      return { name: 'progress', param: null };
    case 'class':
      return tail ? { name: 'class', param: tail.toUpperCase() } : { name: 'mentor', param: null };
    default:
      return { name: 'home', param: null };
  }
}

export const hrefFor = (route: Route): string => {
  switch (route.name) {
    case 'home': return '#/';
    case 'chart': return '#/chart';
    case 'lesson': return `#/lesson/${route.param ?? ''}`;
    case 'mentor': return route.param ? `#/mentor/${route.param}` : '#/mentor';
    case 'about': return '#/about';
    case 'progress': return '#/progress';
    case 'class': return `#/class/${route.param ?? ''}`;
  }
};

export const lessonHref = (lessonId: string) => `#/lesson/${lessonId}`;

type Handler = (route: Route) => void;

let current: Route = { name: 'home', param: null };

export function startRouter(handler: Handler): void {
  const go = () => {
    current = parseHash(location.hash);
    handler(current);
  };
  addEventListener('hashchange', go);
  go();
}

export const currentRoute = (): Route => current;

export function navigate(href: string): void {
  if (location.hash === href) return;
  location.hash = href;
}
