import { I18n, t } from '../../i18n/i18n.ts';
import { BaseComponent } from '../Base/BaseComponent.ts';
import template from 'bundle-text:./RichTextEditor.pug';
import styles from 'bundle-text:./RichTextEditor.css';
import { IPropTypes } from '../../models/index.ts';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

enum HeadingLevel {
  h1 = 1,
  h2 = 2,
  h3 = 3,
  h4 = 4,
  h5 = 5,
  h6 = 6
}

export interface RichTextEditorProps extends IPropTypes {
  log: string;
  i18n: I18n;
  placeholder?: string; // optional override
  readonly?: boolean;
}

export interface RichTextEditorEvents {
  'log-change': { value: string };
}

export class RichTextEditor extends BaseComponent<RichTextEditorProps, RichTextEditorEvents> {
  static tag = 'rich-text-editor';
  static requiredProps = ['log', 'i18n'];

  private editor?: Editor;

  constructor() {
    const templateFn = () => template;
    super(templateFn, undefined, [styles]);
    // defaults
    this.props.log = this.props.log ?? '';
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  /** Keep textarea in sync with props.log */
  override render(): void {
    super.render();
    if (!this.editor) {
      this.editor = new Editor({
        element: this.shadowRoot?.querySelector('#editor'),
        editable: !this.props.readonly,
        extensions: [StarterKit],
        content: this.props.log ?? '',
        onUpdate: ({ editor }) => this.onUpdate(editor),
        onSelectionUpdate: ({ editor }) => this.onSelectionUpdate(editor)
      });
      this.shadowRoot
        ?.getElementById('editor')
        ?.classList.toggle('empty', this.editor?.isEmpty ?? true);
    }
  }

  // override updateBindings(key?: keyof RichTextEditorProps & string): void {
  //   super.updateBindings(key);
  //   if (!this.shadowRoot) return;
  //   this.editor?.setEditable(!this.props.readonly);
  // }

  private onFocus() {
    const time = this.getTime();
    if (!this.props.readonly) {
      const existing = this.props.log ?? '';

      // Replace trailing timestamp line [hh:mm] if present, otherwise append a new timestamp block
      const lines = existing.split(/\r?\n/);
      // find last non-empty line
      let lastIdx = lines.length - 1;
      while (lastIdx >= 0 && lines[lastIdx].trim() === '') lastIdx--;

      const timeTokenRegex = /^\[\d{1,2}:\d{2}(?:\s?[APMapm]{2})?\]$/;
      let next = '';

      if (lastIdx >= 0 && timeTokenRegex.test(lines[lastIdx].trim())) {
        // replace the last timestamp line with the updated time (keep single trailing space)
        lines[lastIdx] = `[${time}] `;
        next = lines.join('\n');
      } else if (existing.trim() === '') {
        next = `[${time}] `;
      } else {
        next = `${existing}\n\n[${time}] `;
      }

      this.setProp('log', next);
      this.updateBindings('log');
    }
  }

  private toolbarHeading(event: Event) {
    const target = event.currentTarget as HTMLElement;
    const level = parseInt(target.dataset.level!) as HeadingLevel;
    this.editor?.chain().focus().toggleHeading({ level }).run();
    // Toggle active state for all heading buttons up to the current level
    const buttons = this.shadowRoot?.querySelectorAll('button[data-level]');
    buttons?.forEach((btn) => {
      const btnLevel = parseInt(btn.getAttribute('data-level')!) as HeadingLevel;
      btn.classList.toggle(
        'active',
        this.editor?.isActive('heading', { level: btnLevel }) ?? false
      );
    });
  }

  private toolbarBold(event: Event) {
    const target = event.currentTarget as HTMLButtonElement;
    this.editor?.chain().focus().toggleBold().run();
    target.classList.toggle('active', this.editor?.isActive('bold') ?? false);
  }

  private toolbarItalic(event: Event) {
    const target = event.currentTarget as HTMLButtonElement;
    this.editor?.chain().focus().toggleItalic().run();
    target.classList.toggle('active', this.editor?.isActive('italic') ?? false);
  }

  private toolbarUnderline(event: Event) {
    const target = event.currentTarget as HTMLButtonElement;
    this.editor?.chain().focus().toggleUnderline().run();
    target.classList.toggle('active', this.editor?.isActive('underline') ?? false);
  }

  private toolbarBulletList(event: Event) {
    const target = event.currentTarget as HTMLButtonElement;
    this.editor?.chain().focus().toggleBulletList().run();
    target.classList.toggle('active', this.editor?.isActive('bulletList') ?? false);
    const orderedListBtn = this.shadowRoot?.querySelector(
      'button[data-action="click:toolbarOrderedList"]'
    );
    if (orderedListBtn)
      orderedListBtn.classList.toggle('active', this.editor?.isActive('orderedList') ?? false);
  }

  private toolbarOrderedList(event: Event) {
    const target = event.currentTarget as HTMLButtonElement;
    this.editor?.chain().focus().toggleOrderedList().run();
    target.classList.toggle('active', this.editor?.isActive('orderedList') ?? false);
    const bulletListBtn = this.shadowRoot?.querySelector(
      'button[data-action="click:toolbarBulletList"]'
    );
    if (bulletListBtn)
      bulletListBtn.classList.toggle('active', this.editor?.isActive('bulletList') ?? false);
  }

  private onUpdate(editor: Editor) {
    const value = editor?.getHTML() ?? '';
    this.setProp('log', value);
    this.emit('log-change', { value });
    this.shadowRoot
      ?.getElementById('editor')
      ?.classList.toggle('empty', this.editor?.isEmpty ?? true);
  }

  private onSelectionUpdate(editor: Editor) {
    // Update active state for heading buttons
    const buttons = this.shadowRoot?.querySelectorAll('button[data-level]');
    buttons?.forEach((btn) => {
      const btnLevel = parseInt(btn.getAttribute('data-level')!) as HeadingLevel;
      btn.classList.toggle('active', editor.isActive('heading', { level: btnLevel }));
    });

    // Update active state for bold, italic, underline, bullet list, and ordered list buttons
    const boldBtn = this.shadowRoot?.querySelector('button[data-action="click:toolbarBold"]');
    if (boldBtn) boldBtn.classList.toggle('active', editor.isActive('bold'));
    const italicBtn = this.shadowRoot?.querySelector('button[data-action="click:toolbarItalic"]');
    if (italicBtn) italicBtn.classList.toggle('active', editor.isActive('italic'));
    const underlineBtn = this.shadowRoot?.querySelector(
      'button[data-action="click:toolbarUnderline"]'
    );
    if (underlineBtn) underlineBtn.classList.toggle('active', editor.isActive('underline'));
    const bulletListBtn = this.shadowRoot?.querySelector(
      'button[data-action="click:toolbarBulletList"]'
    );
    if (bulletListBtn) bulletListBtn.classList.toggle('active', editor.isActive('bulletList'));
    const orderedListBtn = this.shadowRoot?.querySelector(
      'button[data-action="click:toolbarOrderedList"]'
    );
    if (orderedListBtn) orderedListBtn.classList.toggle('active', editor.isActive('orderedList'));
  }

  private getTime(): string {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

customElements.define(RichTextEditor.tag, RichTextEditor);
