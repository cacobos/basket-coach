import { Component, input, output, model, AfterViewInit, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  template: `
    <div class="rte-wrap">
      <div class="rte-toolbar">
        <button type="button" class="rte-btn" (mousedown)="$event.preventDefault(); exec('bold')" title="Negrita">
          <strong>B</strong>
        </button>
        <button type="button" class="rte-btn" (mousedown)="$event.preventDefault(); exec('italic')" title="Cursiva">
          <em>I</em>
        </button>
        <button type="button" class="rte-btn" (mousedown)="$event.preventDefault(); exec('underline')" title="Subrayado">
          <u>U</u>
        </button>
        <span class="rte-sep"></span>
        <button type="button" class="rte-btn" (mousedown)="$event.preventDefault(); exec('insertUnorderedList')" title="Lista">
          ☰
        </button>
        <button type="button" class="rte-btn" (mousedown)="$event.preventDefault(); exec('insertOrderedList')" title="Lista numerada">
          1.
        </button>
        <span class="rte-sep"></span>
        <button type="button" class="rte-btn" (mousedown)="$event.preventDefault(); exec('formatBlock', 'h3')" title="Título">
          H
        </button>
        <button type="button" class="rte-btn" (mousedown)="$event.preventDefault(); exec('removeFormat')" title="Limpiar formato">
          <span style="text-decoration:line-through">A</span>
        </button>
      </div>
      <div #editorEl class="rte-editor"
           contenteditable="true"
           [innerHTML]="value()"
           (input)="onInput()"
           (keydown)="onKeydown($event)">
      </div>
    </div>
  `,
  styles: [`
    .rte-wrap { border: 1.5px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden; }
    .rte-toolbar { display: flex; align-items: center; gap: 2px; padding: 4px 6px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; }
    .rte-btn { background: transparent; border: none; color: var(--text-secondary); padding: 3px 8px; border-radius: 4px; font-size: 13px; cursor: pointer; min-height: 28px; display: flex; align-items: center; }
    .rte-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
    .rte-sep { width: 1px; height: 16px; background: rgba(255,255,255,0.08); margin: 0 2px; }
    .rte-editor { min-height: 100px; padding: 10px 12px; outline: none; font-size: 14px; line-height: 1.6; color: var(--text-primary); }
    .rte-editor:focus { background: rgba(255,255,255,0.02); }
    .rte-editor :where(h3) { font-size: 16px; margin: 8px 0 4px; }
    .rte-editor :where(ul, ol) { padding-left: 20px; margin: 4px 0; }
    .rte-editor :where(li) { margin: 2px 0; }
  `]
})
export class RichTextEditorComponent {
  value = model<string>('');

  private editorEl = viewChild<ElementRef<HTMLDivElement>>('editorEl');

  exec(command: string, value?: string) {
    document.execCommand(command, false, value || undefined);
    this.editorEl()?.nativeElement.focus();
    this.onInput();
  }

  onInput() {
    const el = this.editorEl()?.nativeElement;
    if (el) this.value.set(el.innerHTML);
  }

  onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key)) {
      e.preventDefault();
      const map: Record<string, string> = { b: 'bold', i: 'italic', u: 'underline' };
      document.execCommand(map[e.key]);
      this.onInput();
    }
  }
}
