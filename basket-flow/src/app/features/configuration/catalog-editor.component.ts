import { Component, inject, signal, output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'catalog-editor',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="editor-section">
      <div class="editor-header">
        <h2>{{ title() }}</h2>
        <button class="btn-add" (click)="startAdd()">+ Añadir</button>
      </div>

      @if (showForm()) {
        <div class="inline-form">
          <input type="text" [(ngModel)]="formName" placeholder="Nombre" class="input-sm" (keyup.enter)="confirmAdd()">
          <input type="text" [(ngModel)]="formShort" placeholder="Abreviatura" class="input-sm input-short">
          @if (columns().includes('points')) {
            <input type="number" [(ngModel)]="formPoints" placeholder="Pts" class="input-sm input-pts">
          }
          <input type="color" [(ngModel)]="formColor" class="input-color">
          <button class="btn-confirm" (click)="confirmAdd()">✓</button>
          <button class="btn-cancel" (click)="cancelAdd()">✕</button>
        </div>
      }

      <div class="item-list">
        @for (item of items(); track item.id) {
          <div class="item-row">
            <span class="item-color" [style.background]="item.color || '#6b7280'"></span>
            @if (editingId() === item.id) {
              <input type="text" [(ngModel)]="editName" class="input-sm" (keyup.enter)="confirmEdit(item.id)">
              <input type="text" [(ngModel)]="editShort" class="input-sm input-short">
              @if (columns().includes('points')) {
                <input type="number" [(ngModel)]="editPoints" class="input-sm input-pts">
              }
              <input type="color" [(ngModel)]="editColor" class="input-color">
              <button class="btn-confirm" (click)="confirmEdit(item.id)">✓</button>
              <button class="btn-cancel" (click)="cancelEdit()">✕</button>
            } @else {
              <span class="item-name">{{ item.name }}</span>
              @if (item.short_name) {
                <span class="item-short">{{ item.short_name }}</span>
              }
              @if ('points' in item && item.points !== undefined && item.points > 0) {
                <span class="item-points">+{{ item.points }}</span>
              }
              <div class="item-actions">
                <button class="btn-icon" (click)="startEdit(item)" title="Editar">✎</button>
                <button class="btn-icon btn-icon-danger" (click)="deleteItem(item.id)" title="Eliminar">✕</button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .editor-section { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-subtle); overflow: hidden; }
    .editor-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--border-subtle); }
    .editor-header h2 { font-size: 16px; font-weight: 600; margin: 0; }
    .btn-add { background: rgba(189,194,255,0.1); color: #bdc2ff; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 600; font-size: 12px; }
    .btn-add:hover { background: rgba(189,194,255,0.2); }
    .inline-form { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap; }
    .item-list { }
    .item-row { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .item-row:last-child { border-bottom: none; }
    .item-color { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }
    .item-name { flex: 1; font-size: 14px; font-weight: 500; }
    .item-short { font-size: 12px; color: var(--text-secondary); min-width: 40px; }
    .item-points { font-size: 11px; font-weight: 700; color: var(--color-pts-2); min-width: 24px; }
    .item-actions { display: flex; gap: 4px; }
    .btn-icon { background: none; border: none; color: var(--text-secondary); font-size: 14px; padding: 2px 6px; border-radius: 4px; }
    .btn-icon:hover { color: var(--text-primary); background: rgba(255,255,255,0.05); }
    .btn-icon-danger:hover { color: var(--color-rival); }
    .input-sm { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 5px 8px; color: var(--text-primary); font-size: 13px; outline: none; flex: 1; min-width: 80px; }
    .input-sm:focus { border-color: #bdc2ff; }
    .input-short { max-width: 80px; }
    .input-pts { max-width: 50px; }
    .input-color { width: 30px; height: 28px; border: none; border-radius: 4px; padding: 0; cursor: pointer; background: transparent; }
    .btn-confirm { background: var(--color-pts-2); color: #fff; border: none; width: 26px; height: 26px; border-radius: 4px; font-size: 12px; font-weight: 700; }
    .btn-confirm:hover { opacity: 0.9; }
    .btn-cancel { background: rgba(255,255,255,0.08); color: var(--text-secondary); border: none; width: 26px; height: 26px; border-radius: 4px; font-size: 12px; }
    .btn-cancel:hover { color: var(--text-primary); }
  `]
})
export class CatalogEditorComponent {
  readonly items = input<any[]>([]);
  readonly title = input('');
  readonly columns = input<string[]>([]);

  readonly add = output<any>();
  readonly update = output<any>();
  readonly remove = output<string>();

  editingId = signal<string | null>(null);
  showForm = signal(false);

  formName = '';
  formShort = '';
  formColor = '#6b7280';
  formPoints = 0;

  editName = '';
  editShort = '';
  editColor = '#6b7280';
  editPoints = 0;

  startAdd() {
    this.showForm.set(true);
    this.formName = '';
    this.formShort = '';
    this.formColor = '#6b7280';
    this.formPoints = 0;
  }

  confirmAdd() {
    if (!this.formName.trim()) return;
    this.add.emit({ name: this.formName.trim(), short_name: this.formShort.trim(), color: this.formColor, points: this.formPoints });
    this.showForm.set(false);
  }

  cancelAdd() {
    this.showForm.set(false);
  }

  startEdit(item: any) {
    this.editingId.set(item.id);
    this.editName = item.name;
    this.editShort = item.short_name || '';
    this.editColor = item.color || '#6b7280';
    this.editPoints = item.points ?? 0;
  }

  confirmEdit(id: string) {
    if (!this.editName.trim()) return;
    this.update.emit({ id, name: this.editName.trim(), short_name: this.editShort.trim(), color: this.editColor, points: this.editPoints });
    this.editingId.set(null);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  deleteItem(id: string) {
    if (confirm('¿Eliminar este elemento?')) {
      this.remove.emit(id);
    }
  }
}
