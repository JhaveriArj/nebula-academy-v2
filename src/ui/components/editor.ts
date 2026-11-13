import { EditorState, Compartment, type Extension, type Transaction } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, gutter, GutterMarker,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { java } from '@codemirror/lang-java';
import { HighlightStyle, syntaxHighlighting, indentUnit, bracketMatching, codeFolding, foldEffect } from '@codemirror/language';
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
  { tag: t.keyword, color: 'var(--syn-keyword)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--syn-string)' },
  { tag: t.number, color: 'var(--syn-number)' },
  { tag: t.comment, color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: [t.typeName, t.className, t.standard(t.typeName)], color: 'var(--syn-type)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--syn-function)' },
  { tag: t.annotation, color: 'var(--syn-annotation)' },
  { tag: t.bool, color: 'var(--syn-keyword)' },
  { tag: t.operator, color: 'var(--syn-operator)' },
]);

const nebulaTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--space)',
      color: 'var(--space-ink)',
      fontSize: 'var(--size-code)',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: 'var(--face-code)',
      padding: '10px 0',
      caretColor: 'var(--star)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--space-raised)',
      color: 'var(--space-dim)',
      border: 'none',
      borderRight: '1px solid var(--space-line)',
      fontFamily: 'var(--face-code)',
    },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--star) 7%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--star) 7%, transparent)', color: 'var(--star)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'color-mix(in srgb, var(--syn-number) 28%, transparent)',
    },
    '&.cm-focused': { outline: '3px solid var(--star)', outlineOffset: '-3px' },
    '.cm-line.cm-locked': { color: 'var(--space-mute)' },
    '.cm-line.cm-editable': { backgroundColor: 'color-mix(in srgb, var(--star) 10%, transparent)' },
    '.cm-edit-gutter-col': { width: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    '.cm-edit-gutter-col .cm-gutterElement': { display: 'flex', justifyContent: 'center', width: '18px' },
    '.cm-edit-mark': { display: 'block', width: '4px', height: '100%', minHeight: '1.2em', backgroundColor: 'var(--star)', borderRadius: 'var(--radius-pill)' },
    '.cm-line.cm-error-line': { backgroundColor: 'color-mix(in srgb, var(--space-alert) 22%, transparent)' },
    '.cm-scroller': { overflow: 'auto', lineHeight: '1.55' },
  },
  { dark: true },
);

class EditMarker extends GutterMarker {
  override toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-edit-mark';
    span.setAttribute('aria-hidden', 'true');
    return span;
  }
}

/** Explorer's locked lines: a small padlock, with one line of explanation on hover. The same
    explanation reaches every kid through the status line when they try to type there. */
class LockMarker extends GutterMarker {
  override toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-lock-mark';
    span.title = 'Locked in Explorer. Change the lines with the yellow bar.';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 7.5h8v6H4z M5.75 7.5V5.5a2.25 2.25 0 0 1 4.5 0v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return span;
  }
}

/** The folded import block reads "4 imports"; a click, Enter or Space opens it. */
function importsPlaceholder(view: EditorView, onclick: (event: Event) => void): HTMLElement {
  const count = view.state.doc.toString().split('\n').filter((l) => /^\s*import\s/.test(l)).length;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cm-imports-fold';
  button.textContent = `▸ ${count} import${count === 1 ? '' : 's'}`;
  button.setAttribute('aria-label', `Show the ${count} import lines`);
  button.addEventListener('click', onclick);
  return button;
}

class ErrorMarker extends GutterMarker {
  override toDOM() {
    const span = document.createElement('span');
    span.textContent = '!';
    span.className = 'cm-error-gutter';
    span.setAttribute('aria-hidden', 'true');
    return span;
  }
}

/** How far a wrapped line's later rows sit in, in characters: its leading spaces (a tab
    counts four) plus one indent step. */
export function wrapIndentOf(text: string): number {
  let width = 0;
  for (const ch of text) {
    if (ch === ' ') width++;
    else if (ch === '\t') width += 4;
    else break;
  }
  return width + 4;
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

/** The last locked line at the top and the first locked line at the bottom (1-based). */
export function lockedLinesOf(doc: EditorState['doc'], region: LockedRegion | null | undefined): { from: number; to: number } {
  if (!region) return { from: 0, to: 0 };
  return { from: region.prefix, to: doc.lines - region.suffix + 1 };
}

/** Rejects any change the kid makes that would touch a locked line. Changes made by the code
    itself (Reset, Undo, the solution) pass `filter: false` and are not the kid's to make. */
export function lockFilterFor(region: LockedRegion | null | undefined, onLockedEdit?: () => void): Extension {
  return EditorState.transactionFilter.of((tr: Transaction) => {
    if (!tr.docChanged || !region) return tr;
    const { from, to } = lockedLinesOf(tr.startState.doc, region);
    let blocked = false;
    tr.changes.iterChangedRanges((fromA, toA) => {
      const first = tr.startState.doc.lineAt(fromA).number;
      const last = tr.startState.doc.lineAt(Math.min(toA, tr.startState.doc.length)).number;
      if (first <= from || last >= to) blocked = true;
    });
    if (blocked) onLockedEdit?.();
    return blocked ? [] : tr;
  });
}

/** Replaces the whole text from code, past the lock: the lock guards the kid's edits only. */
export const replaceAllSpec = (state: EditorState, code: string) =>
  ({ changes: { from: 0, to: state.doc.length, insert: code }, filter: false });

let editorCount = 0;

export function createEditor(options: {
  code: string;
  locked: LockedRegion | null;
  onChange?: (code: string) => void;
  onRun?: () => void;
  /** Called when a kid tries to type on a locked line, so the page can say why nothing happened. */
  onLockedEdit?: () => void;
}): CodeEditor {
  const element = document.createElement('div');
  element.className = 'editor on-dark';
  // Tab indents inside the editor, so a keyboard user needs telling how to get out. Shown
  // while the editor has focus, and read out with it.
  const hintId = `editor-hint-${++editorCount}`;
  const hint = document.createElement('p');
  hint.className = 'editor-hint';
  hint.id = hintId;
  hint.textContent = 'Press Esc, then Tab, to leave the code.';

  const lockCompartment = new Compartment();
  let errorLine: number | null = null;
  let lockedRegion = options.locked;

  const lockedLineNumbers = (doc: EditorState['doc']) => lockedLinesOf(doc, lockedRegion);
  const lockFilter = (): Extension => lockFilterFor(lockedRegion, options.onLockedEdit);

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
          if (lockedRegion) classes.push(n <= from || n >= to ? 'cm-locked' : 'cm-editable');
          if (errorLine === n) classes.push('cm-error-line');
          // A long line that wraps carries on under its own indent plus one step, not at the
          // left edge. Its first row starts where it always did (the negative text-indent).
          const indent = wrapIndentOf(doc.line(n).text);
          marks.push(Decoration.line({
            class: classes.join(' '),
            attributes: { style: `padding-left: calc(6px + ${indent}ch); text-indent: -${indent}ch` },
          }).range(doc.line(n).from));
        }
        return Decoration.set(marks, true);
      }
    },
    { decorations: (v) => v.decorations },
  );

  // In Explorer, the lines a kid may change carry a yellow bar in their own gutter, so the
  // difference never rests on a faint background tint alone.
  const editGutter = gutter({
    class: 'cm-edit-gutter-col',
    lineMarker: (view, lineBlock) => {
      if (!lockedRegion) return null;
      const n = view.state.doc.lineAt(lineBlock.from).number;
      const { from, to } = lockedLineNumbers(view.state.doc);
      if (n > from && n < to) return new EditMarker();
      return lockedRegion ? new LockMarker() : null;
    },
    lineMarkerChange: () => true,
  });

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
        editGutter,
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
        codeFolding({ placeholderDOM: importsPlaceholder }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) options.onChange?.(update.state.doc.toString());
        }),
        EditorView.contentAttributes.of({
          'aria-label': 'Java code for this lesson',
          'aria-describedby': hintId,
          autocapitalize: 'off',
          autocorrect: 'off',
          spellcheck: 'false',
        }),
      ],
    }),
  });

  element.append(hint);

  // The imports start folded: they are the same in nearly every lesson, and the code that
  // matters is below them. Builder kids open them when Android Studio asks for one.
  const foldImports = () => {
    const doc = view.state.doc;
    let first = 0;
    let last = 0;
    for (let n = 1; n <= doc.lines; n++) {
      if (/^\s*import\s/.test(doc.line(n).text)) {
        if (!first) first = n;
        last = n;
      }
    }
    if (first && last) {
      view.dispatch({ effects: foldEffect.of({ from: doc.line(first).from, to: doc.line(last).to }) });
    }
  };
  foldImports();

  const redraw = () => {
    // Nudges the decoration plugin without changing the document.
    view.dispatch({ selection: view.state.selection });
  };

  return {
    element,
    getCode: () => view.state.doc.toString(),
    setCode: (code: string) => {
      view.dispatch(replaceAllSpec(view.state, code));
      foldImports();
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
