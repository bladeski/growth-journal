import { I18n, t } from '../../i18n/i18n.ts';
import { BaseComponent } from '../Base/BaseComponent.ts';
import template from 'bundle-text:./RichTextEditor.pug';
import styles from 'bundle-text:./RichTextEditor.css';
import { IPropTypes } from '../../models/index.ts';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';

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
  i18n: I18n;
  label?: string; // optional label text
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
    this.props.label = this.props.label ?? '';
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  /** Keep textarea in sync with props.log */
  override render(): void {
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
        extensions: [StarterKit, TextStyleKit],
        content: this.props.log ?? '',
        onUpdate: ({ editor }) => this.onUpdate(editor),
        onSelectionUpdate: ({ editor }) => this.onSelectionUpdate(editor),
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

  // private onFocus() {
  //   const time = this.getTime();
  //   if (!this.props.readonly && this.editor) {
  //     const timeTokenRegex = /^\[\d{1,2}:\d{2}(?:\s?[APMapm]{2})?\]\s*$/;
  //     const newTimestamp = `[${time}] `;

  //     // Get the last node with content
  //     const lastNode = this.editor.state.doc.lastChild;
  //     const isTimestampNode = lastNode && timeTokenRegex.test(lastNode.textContent.trim());
  //     const { state, commands } = this.editor;

  //     if (isTimestampNode) {
  //       // Update the existing timestamp node by replacing its text

  //       // commands.setTextSelection({ from: lastNodeStart, to: state.doc.content.size });
  //       // commands.deleteSelection();
  //       // lastNode.type.name

  //       this.editor
  //         .chain()
  //         .focus('end')
  //         .deleteRange({ from: state.doc.content.size - lastNode.nodeSize, to: state.doc.content.size })
  //         // .deleteNode(lastNode.type.name)
  //         // .deleteSelection()
  //         .focus('end')
  //         .setBold()
  //         .setItalic()
  //         .insertContent(newTimestamp)
  //         .toggleBold()
  //         .unsetItalic()
  //         .focus('end')
  //         .run();
  //       // commands.updateAttributes('paragraph', { class: 'timestamp' });
  //     } else {
  //       // Create a new timestamp paragraph
  //       // commands.setHorizontalRule();
  //       // commands.insertContent(newTimestamp);
  //       this.editor
  //         .chain()
  //         .setHorizontalRule()
  //         .setBold()
  //         .setItalic()
  //         .setMark('textStyle', { class: 'timestamp' })
  //         .insertContent(newTimestamp)
  //         .unsetBold()
  //         .unsetItalic()
  //         .focus('end')
  //         .run();
  //       // commands.updateAttributes('paragraph', { class: 'timestamp' });
  //     }

  //     // this.editor.commands;
  //     const updatedContent = this.editor.getHTML() ?? '';
  //     this.setProp('log', updatedContent);
  //     this.updateBindings('log');
  //   }
  // }

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

  private onSelectionUpdate(editor: Editor) {
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
}

customElements.define(RichTextEditor.tag, RichTextEditor);
