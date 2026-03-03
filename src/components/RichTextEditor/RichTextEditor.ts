import { BaseComponent } from '../Base/BaseComponent.ts';
import template from 'bundle-text:./RichTextEditor.pug';
import styles from 'bundle-text:./RichTextEditor.css';
import { IPropTypes } from '../../models/index.ts';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { type I18n, t } from '../../i18n/i18n.ts';

enum HeadingLevel {
  h1 = 1,
  h2 = 2,
  h3 = 3,
  h4 = 4,
  h5 = 5,
  h6 = 6,
}

export interface RichTextEditorProps extends IPropTypes {
  log: string;
  label?: string; // optional label text
  placeholder?: string; // optional override
  readonly?: boolean;
  i18n?: I18n;
  [key: string]: unknown;
}

export interface RichTextEditorEvents {
  'log-change': { value: string };
}

export class RichTextEditor extends BaseComponent<RichTextEditorProps, RichTextEditorEvents> {
  static tag = 'rich-text-editor';
  static requiredProps = ['log'];

  private editor?: Editor;

  constructor() {
    const templateFn = () => template;
    super(templateFn, undefined, [styles]);
    // defaults
    this.props.log = this.props.log ?? '';
    this.props.label = this.props.label ?? '';
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  /** Keep textarea in sync with props.log */
  override render(): void {
    // Spread translated toolbar labels into props
    if (this.props.i18n) {
      Object.assign(this.props, RichTextEditor.getLabels(this.props.i18n));
    }

    super.render();
    StarterKit.configure({
      horizontalRule: {
        HTMLAttributes: { class: 'horizontal-rule' },
      },
    });
    if (!this.editor) {
      this.editor = new Editor({
        element: this.shadowRoot?.querySelector('#editor-content'),
        editable: !this.props.readonly,
        editorProps: {
          attributes: {
            class: 'editor-content',
            'aria-label': this.props.label || 'Rich text editor',
          },
        },
        extensions: [StarterKit, TextStyleKit],
        content: this.props.log ?? '',
        onUpdate: ({ editor }) => this.onUpdate(editor),
        onSelectionUpdate: () => this.onSelectionUpdate(),
      });
      this.shadowRoot
        ?.getElementById('editor-content')
        ?.classList.toggle('empty', this.editor?.isEmpty ?? true);
    }
  }

  updateContent(log: string): void {
    if (this.editor && log !== this.props.log) {
      this.editor.commands.setContent(log);
      this.setProp('log', log);
      this.emit('log-change', { value: log });
      this.editor.commands.focus();
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
        this.editor?.isActive('heading', { level: btnLevel }) ?? false,
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
      'button[data-action="click:toolbarOrderedList"]',
    );
    if (orderedListBtn)
      orderedListBtn.classList.toggle('active', this.editor?.isActive('orderedList') ?? false);
  }

  private toolbarOrderedList(event: Event) {
    const target = event.currentTarget as HTMLButtonElement;
    this.editor?.chain().focus().toggleOrderedList().run();
    target.classList.toggle('active', this.editor?.isActive('orderedList') ?? false);
    const bulletListBtn = this.shadowRoot?.querySelector(
      'button[data-action="click:toolbarBulletList"]',
    );
    if (bulletListBtn)
      bulletListBtn.classList.toggle('active', this.editor?.isActive('bulletList') ?? false);
  }

  private toolbarUndo() {
    this.editor?.chain().focus().undo().run();
    this.setToolbarState();
  }

  private toolbarRedo() {
    this.editor?.chain().focus().redo().run();
    this.setToolbarState();
  }

  private onUpdate(editor: Editor) {
    const value = editor?.getHTML() ?? '';
    this.setProp('log', value);
    this.emit('log-change', { value });
    this.shadowRoot
      ?.getElementById('editor-content')
      ?.classList.toggle('empty', this.editor?.isEmpty ?? true);
    this.setToolbarState();
  }

  private onSelectionUpdate() {
    this.setToolbarState();
  }

  private getTime(): string {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private setToolbarState() {
    // Update active state for heading buttons
    const buttons = this.shadowRoot?.querySelectorAll('button[data-level]');
    buttons?.forEach((btn) => {
      const btnLevel = parseInt(btn.getAttribute('data-level')!) as HeadingLevel;
      btn.classList.toggle(
        'active',
        this.editor?.isActive('heading', { level: btnLevel }) ?? false,
      );
    });
    // Update active state for bold, italic, underline, bullet list, and ordered list buttons
    const boldBtn = this.shadowRoot?.querySelector('button[data-action="click:toolbarBold"]');
    if (boldBtn) boldBtn.classList.toggle('active', this.editor?.isActive('bold') ?? false);
    const italicBtn = this.shadowRoot?.querySelector('button[data-action="click:toolbarItalic"]');
    if (italicBtn) italicBtn.classList.toggle('active', this.editor?.isActive('italic') ?? false);
    const underlineBtn = this.shadowRoot?.querySelector(
      'button[data-action="click:toolbarUnderline"]',
    );
    if (underlineBtn)
      underlineBtn.classList.toggle('active', this.editor?.isActive('underline') ?? false);
    const bulletListBtn = this.shadowRoot?.querySelector(
      'button[data-action="click:toolbarBulletList"]',
    );
    if (bulletListBtn)
      bulletListBtn.classList.toggle('active', this.editor?.isActive('bulletList') ?? false);
    const orderedListBtn = this.shadowRoot?.querySelector(
      'button[data-action="click:toolbarOrderedList"]',
    );
    if (orderedListBtn)
      orderedListBtn.classList.toggle('active', this.editor?.isActive('orderedList') ?? false);
    const redoBtn = this.shadowRoot?.querySelector(
      'button[data-action="click:toolbarRedo"]',
    ) as HTMLButtonElement;
    if (redoBtn) redoBtn.disabled = !(this.editor?.can().redo() ?? false);
    const undoBtn = this.shadowRoot?.querySelector(
      'button[data-action="click:toolbarUndo"]',
    ) as HTMLButtonElement;
    if (undoBtn) undoBtn.disabled = !(this.editor?.can().undo() ?? false);
  }

  /** Resolve toolbar labels from i18n, falling back to English defaults. */
  private static tr(i18n: I18n, key: string, fallback: string): string {
    const resolved = t(i18n, key);
    return resolved === key ? fallback : resolved;
  }

  private static getLabels(i18n: I18n) {
    const r = RichTextEditor.tr;
    return {
      toolbarAriaLabel: r(i18n, 'rte.toolbar', 'Text formatting'),
      headingGroupAriaLabel: r(i18n, 'rte.headingGroup', 'Heading styles'),
      textStylesGroupAriaLabel: r(i18n, 'rte.textStylesGroup', 'Text styles'),
      listsGroupAriaLabel: r(i18n, 'rte.listsGroup', 'Lists'),
      historyGroupAriaLabel: r(i18n, 'rte.historyGroup', 'History'),
      heading1Tooltip: r(i18n, 'rte.heading1', 'Heading 1'),
      heading2Tooltip: r(i18n, 'rte.heading2', 'Heading 2'),
      heading3Tooltip: r(i18n, 'rte.heading3', 'Heading 3'),
      boldTooltip: r(i18n, 'rte.bold', 'Bold'),
      italicTooltip: r(i18n, 'rte.italic', 'Italic'),
      underlineTooltip: r(i18n, 'rte.underline', 'Underline'),
      bulletListTooltip: r(i18n, 'rte.bulletList', 'Bullet list'),
      numberedListTooltip: r(i18n, 'rte.numberedList', 'Numbered list'),
      undoTooltip: r(i18n, 'rte.undo', 'Undo'),
      redoTooltip: r(i18n, 'rte.redo', 'Redo'),
    };
  }
}

customElements.define(RichTextEditor.tag, RichTextEditor);
