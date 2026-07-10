import { Component, input, output } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-objective-editor',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="obj-editor">
      <div class="obj-row" *ngFor="let item of objectives(); let i = index">
        <span class="obj-idx">{{ i + 1 }}</span>
        <input class="obj-input" [value]="item" (input)="onEdit(i, $event)" placeholder="Nuevo objetivo..." />
        <button class="obj-remove" (click)="remove.emit(i)">✕</button>
      </div>
      <button class="obj-add" (click)="add.emit()">+ Añadir objetivo</button>
    </div>
  `,
  styles: [`
    .obj-editor { display: flex; flex-direction: column; gap: 6px; }
    .obj-row { display: flex; align-items: center; gap: 8px; }
    .obj-idx { width: 20px; font-size: 12px; color: #908f9d; text-align: center; }
    .obj-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px 10px; font-size: 13px; color: #dfe0ff; }
    .obj-input:focus { outline: none; border-color: #0068ed; }
    .obj-remove { background: none; border: none; color: #ff4d4d; cursor: pointer; font-size: 14px; padding: 2px; }
    .obj-add { align-self: flex-start; background: none; border: 1px dashed rgba(255,255,255,0.15); border-radius: 6px; padding: 6px 14px; font-size: 12px; color: #908f9d; cursor: pointer; margin-top: 4px; }
    .obj-add:hover { border-color: #0068ed; color: #0068ed; }
  `]
})
export class ObjectiveEditorComponent {
  objectives = input<string[]>([]);
  update = output<{ index: number; value: string }>();
  add = output<void>();
  remove = output<number>();

  onEdit(index: number, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.update.emit({ index, value });
  }
}
