import { EditorState, Compartment, type Extension, type Transaction } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, gutter, GutterMarker,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { java } from '@codemirror/lang-java';
import { HighlightStyle, syntaxHighlighting, indentUnit, bracketMatching } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/* The code editor.

   Two things make it Nebula's rather than a stock CodeMirror: Explorer mode locks the
   code outside the TODO region, and the gutter can mark the line an error happened on.

   Locked regions are a prefix and a suffix of lines rather than arbitrary ranges. A
   prefix cannot shift, and a suffix is anchored to the end of the document, so both stay
   correct when a kid adds lines in the middle. tests/content.test.ts enforces that
   lesson frontmatter only uses those two shapes. */

export interface LockedRegion {
  /** Number of lines locked at the top. */
  prefix: number;
  /** Number of lines locked at the bottom. */
  suffix: number;
}

/** `totalLines` is the editor's line count, which includes the empty line a trailing
    newline creates. A suffix range authored as 22-26 in a 26-line file therefore has to
    match a 27-line document, so the test is `to >= totalLines - 1`. Locking that trailing
    empty line as well is harmless and keeps the arithmetic in one place. */
export function lockedRegionFrom(ranges: [number, number][], totalLines: number): LockedRegion {
  let prefix = 0;
  let suffix = 0;
  for (const [from, to] of ranges) {
    if (from <= 1) prefix = Math.max(prefix, Math.min(to, totalLines));
    else if (to >= totalLines - 1) suffix = Math.max(suffix, totalLines - from + 1);
  }
  // Never lock the whole document: there would be nothing to do. The prefix is the one
  // a kid is told to work below, so it gives way last.
  prefix = Math.min(prefix, Math.max(0, totalLines - 1));
  if (prefix + suffix >= totalLines) suffix = Math.max(0, totalLines - prefix - 1);
  return { prefix, suffix };
}

const highlight = HighlightStyle.define([
  { tag: t.keyword, color: '#F0A93B' },
  { tag: [t.string, t.special(t.string)], color: '#8FD6A8' },
  { tag: t.number, color: '#9FC6F0' },
  { tag: t.comment, color: '#7C8A9B', fontStyle: 'italic' },
  { tag: [t.typeName, t.className, t.standard(t.typeName)], color: '#E3D2A6' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#DCE0D8' },
  { tag: t.annotation, color: '#D7A6E3' },
  { tag: t.bool, color: '#F0A93B' },
  { tag: t.operator, color: '#B6BDB2' },
]);

const nebulaTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--chart)',
      color: 'var(--hull)',
      fontSize: 'var(--size-code)',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: 'var(--face-code)',
      padding: '10px 0',
      caretColor: 'var(--lamp)',
    },
    '.cm-gutters': {
      backgroundColor: '#0A1118',
      color: '#5F6F80',
      border: 'none',
      borderRight: '1px solid #1E2A38',
      fontFamily: 'var(--face-code)',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(240, 169, 59, 0.07)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(240, 169, 59, 0.07)', color: 'var(--lamp)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(159, 198, 240, 0.25)',
    },
    '&.cm-focused': { outline: '3px solid var(--lamp)', outlineOffset: '-3px' },
    '.cm-line.cm-locked': { backgroundColor: 'rgba(182, 189, 178, 0.06)', color: '#9AA6B4' },
    '.cm-line.cm-error-line': { backgroundColor: 'rgba(168, 48, 26, 0.28)' },
    '.cm-scroller': { overflow: 'auto', lineHeight: '1.55' },
  },
  { dark: true },
);

class ErrorMarker extends GutterMarker {
  override toDOM() {
    const span = document.createElement('span');
    span.textContent = '!';
    span.className = 'cm-error-gutter';
    span.setAttribute('aria-hidden', 'true');
    return span;
  }
}

export interface CodeEditor {
  element: HTMLElement;
  getCode(): string;
  setCode(code: string): void;
  /** Applies or removes the Explorer lock without losing the kid's work. */
  setLocked(locked: LockedRegion | null): void;
  /** Marks a line as the one that went wrong, or clears it with null. */
  markError(line: number | null): void;
  focus(): void;
  destroy(): void;
}

export function createEditor(options: {
  code: string;
  locked: LockedRegion | null;
  onChange?: (code: string) => void;
  onRun?: () => void;
}): CodeEditor {
  const element = document.createElement('div');
  element.className = 'editor on-dark';

  const lockCompartment = new Compartment();
  let errorLine: number | null = null;
  let lockedRegion = options.locked;

  const lockedLineNumbers = (doc: EditorState['doc']): { from: number; to: number } => {
    const lines = doc.lines;
    if (!lockedRegion) return { from: 0, to: 0 };
    return { from: lockedRegion.prefix, to: lines - lockedRegion.suffix + 1 };
  };

  /** Rejects any change that would touch a locked line. */
  const lockFilter = (): Extension =>
    EditorState.transactionFilter.of((tr: Transaction) => {
      if (!tr.docChanged || !lockedRegion) return tr;
      const { from, to } = lockedLineNumbers(tr.startState.doc);
      let blocked = false;
      tr.changes.iterChangedRanges((fromA, toA) => {
        const first = tr.startState.doc.lineAt(fromA).number;
        const last = tr.startState.doc.lineAt(Math.min(toA, tr.startState.doc.length)).number;
        if (first <= from || last >= to) blocked = true;
      });
      return blocked ? [] : tr;
    });

  const lockDecorations = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }
      update(update: ViewUpdate) {
        this.decorations = this.build(update.view);
      }
      build(view: EditorView): DecorationSet {
        const marks = [];
        const doc = view.state.doc;
        const { from, to } = lockedLineNumbers(doc);
        for (let n = 1; n <= doc.lines; n++) {
          const classes: string[] = [];
          if (lockedRegion && (n <= from || n >= to)) classes.push('cm-locked');
          if (errorLine === n) classes.push('cm-error-line');
          if (classes.length) {
            marks.push(Decoration.line({ class: classes.join(' ') }).range(doc.line(n).from));
          }
        }
        return Decoration.set(marks, true);
      }
    },
    { decorations: (v) => v.decorations },
  );

  const errorGutter = gutter({
    class: 'cm-error-gutter-col',
    lineMarker: (view, lineBlock) => {
      if (errorLine === null) return null;
      return view.state.doc.lineAt(lineBlock.from).number === errorLine ? new ErrorMarker() : null;
    },
    initialSpacer: () => new ErrorMarker(),
  });

  const view = new EditorView({
    parent: element,
    state: EditorState.create({
      doc: options.code,
      extensions: [
        lineNumbers(),
        errorGutter,
        history(),
        bracketMatching(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        indentUnit.of('    '),
        java(),
        syntaxHighlighting(highlight),
        nebulaTheme,
        EditorView.lineWrapping,
        keymap.of([
          {
            key: 'Mod-Enter',
            run: () => {
              options.onRun?.();
              return true;
            },
          },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        lockCompartment.of(lockFilter()),
        lockDecorations,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) options.onChange?.(update.state.doc.toString());
        }),
        EditorView.contentAttributes.of({
          'aria-label': 'Java code for this lesson',
          autocapitalize: 'off',
          autocorrect: 'off',
          spellcheck: 'false',
        }),
      ],
    }),
  });

  const redraw = () => {
    // Nudges the decoration plugin without changing the document.
    view.dispatch({ selection: view.state.selection });
  };

  return {
    element,
    getCode: () => view.state.doc.toString(),
    setCode: (code: string) => {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
    },
    setLocked: (locked: LockedRegion | null) => {
      lockedRegion = locked;
      view.dispatch({ effects: lockCompartment.reconfigure(lockFilter()) });
      redraw();
    },
    markError: (line: number | null) => {
      errorLine = line;
      redraw();
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}
