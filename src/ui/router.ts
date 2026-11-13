/* A hash router, because GitHub Pages serves no rewrites and `#/lesson/t1-05` is the only
   thing that reliably deep-links. See docs/ARCHITECTURE.md. */

export interface Route {
  name: 'home' | 'chart' | 'lesson' | 'mentor' | 'about' | 'progress' | 'class' | 'privacy' | 'glossary' | 'notfound';
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
      if (tail !== undefined && !/^[0-5]$/.test(tail)) return { name: 'notfound', param: null };
      return { name: 'mentor', param: tail ?? null };
    case 'about':
      return { name: 'about', param: null };
    case 'privacy':
      return { name: 'privacy', param: null };
    case 'glossary':
      return { name: 'glossary', param: null };
    case 'progress':
      return { name: 'progress', param: null };
    case 'class':
      return tail ? { name: 'class', param: tail.toUpperCase() } : { name: 'mentor', param: null };
    default:
      return { name: 'notfound', param: null };
  }
}

export const lessonHref = (lessonId: string) => `#/lesson/${lessonId}`;

type Handler = (route: Route) => void;

export function startRouter(handler: Handler): void {
  const go = () => handler(parseHash(location.hash));
  addEventListener('hashchange', go);
  go();
}

