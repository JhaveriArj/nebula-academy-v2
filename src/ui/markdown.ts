import { el, escapeHtml } from './dom';

/* A small Markdown renderer for lesson and mentor prose.

   Hand-rolled rather than adding a dependency: docs/ARCHITECTURE.md caps the dependency
   budget, and the content only uses headings, paragraphs, lists, tables, fenced code,
   links and the three inline marks. It builds DOM nodes and escapes every piece of text,
   so lesson content cannot inject markup. */

export function renderMarkdown(markdown: string, options: { headingOffset?: number } = {}): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const offset = options.headingOffset ?? 0;
  let i = 0;

  const paragraph: string[] = [];
  const flush = () => {
    if (!paragraph.length) return;
    fragment.appendChild(el('p', { html: inline(paragraph.join(' ')) }));
    paragraph.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code.
    if (/^\s*```/.test(line)) {
      flush();
      const language = line.replace(/^\s*```/, '').trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i]!)) body.push(lines[i++]!);
      i++;
      fragment.appendChild(
        el('pre', { class: 'code-block', 'data-language': language || 'java' },
          el('code', { text: body.join('\n') }),
        ),
      );
      continue;
    }

    // Heading.
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const level = Math.min(6, heading[1]!.length + offset);
      fragment.appendChild(
        el(`h${level}` as 'h2', { html: inline(heading[2]!.trim()) }),
      );
      i++;
      continue;
    }

    // Table. A header row, a divider, then body rows.
    if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      flush();
      const header = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i]!)) rows.push(cells(lines[i++]!));
      const table = el('table', { class: 'md-table' },
        el('thead', {}, el('tr', {}, ...header.map((c) => el('th', { html: inline(c) })))),
        el('tbody', {}, ...rows.map((row) => el('tr', {}, ...row.map((c) => el('td', { html: inline(c) }))))),
      );
      fragment.appendChild(el('div', { class: 'md-table-wrap' }, table));
      continue;
    }

    // Lists, including nested ordered content.
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i]!;
        const match = ordered ? /^\s*\d+[.)]\s+(.*)$/.exec(current) : /^\s*[-*]\s+(.*)$/.exec(current);
        if (match) {
          items.push(match[1]!);
          i++;
          continue;
        }
        // A wrapped continuation line belongs to the item above.
        if (/^\s{2,}\S/.test(current) && items.length) {
          items[items.length - 1] += ' ' + current.trim();
          i++;
          continue;
        }
        break;
      }
      fragment.appendChild(
        el(ordered ? 'ol' : 'ul', { class: 'md-list' },
          ...items.map((item) => el('li', { html: inline(item) })),
        ),
      );
      continue;
    }

    // Blockquote.
    if (/^\s*>\s?/.test(line)) {
      flush();
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i]!)) body.push(lines[i++]!.replace(/^\s*>\s?/, ''));
      fragment.appendChild(el('blockquote', { html: inline(body.join(' ')) }));
      continue;
    }

    // Horizontal rule.
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flush();
      fragment.appendChild(el('hr', {}));
      i++;
      continue;
    }

    if (!line.trim()) {
      flush();
      i++;
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }

  flush();
  return fragment;
}

const cells = (row: string): string[] =>
  row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/** Inline marks. Everything is escaped first, so no content can inject markup. */
export function inline(text: string): string {
  let out = escapeHtml(text);

  // Code spans first, so marks inside them are left alone.
  const spans: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => {
    spans.push(code);
    return `\uE000${spans.length - 1}\uE000`;
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    const safe = /^(https?:|#|\.?\/)/.test(href) ? href : '#';
    const external = /^https?:/.test(safe);
    return `<a href="${safe}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  return out.replace(/\uE000(\d+)\uE000/g, (_m, index: string) => `<code>${spans[Number(index)]}</code>`);
}
