import { Component, inject, signal, EnvironmentInjector } from '@angular/core';
import { NgFor, NgIf, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, from, of, combineLatest } from 'rxjs';
import { startWith, switchMap, filter, map, tap, catchError } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { DataService } from '../../core/services/data.service';
import { ExerciseRepository } from '../../core/repositories/exercise.repository';
import { SessionRepository } from '../../core/repositories/session.repository';
import type { TrainingSession, Exercise, ExerciseVariant, Tag } from '../../core/models/models';

@Component({
  selector: 'app-session-builder',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, AsyncPipe],
  template: `
    <div class="builder-page" *ngIf="vm$ | async as vm; else loadingTpl">
      <header class="builder-header">
        <div>
          <h1 class="page-title">Crear Sesión</h1>
          <p class="page-sub">Diseña la sesión con ejercicios organizados por secciones.</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="cancel()">Cancelar</button>
          <button class="btn-primary" (click)="save()" [disabled]="!formTitle.trim() || !formDate">
            <span class="material-symbols-outlined fill">save</span>
            Guardar Sesión
          </button>
        </div>
      </header>

      <div class="builder-body">
        <aside class="metadata-panel">
          <div class="meta-card">
            <h3 class="meta-title">Información General</h3>
            <div class="field">
              <label class="field-label">Título</label>
              <input class="field-input" [(ngModel)]="formTitle" (input)="onTitleEdited()" placeholder="Ej: Fundamentos de Tiro"/>
            </div>
            <div class="field">
              <label class="field-label">Equipo</label>
              <select class="field-input" [(ngModel)]="formTeam" (ngModelChange)="onTeamOrDateChange()">
                <option value="" disabled>Seleccionar equipo...</option>
                <option *ngFor="let t of vm.teams" [value]="t.id">{{ t.name }}</option>
              </select>
            </div>
            <div class="field-row">
              <div class="field flex-1">
                <label class="field-label">Fecha</label>
                <input class="field-input" type="date" [(ngModel)]="formDate" (ngModelChange)="onTeamOrDateChange()"/>
              </div>
            </div>
            <div class="field-row">
              <div class="field flex-1">
                <label class="field-label">Inicio</label>
                <input class="field-input" type="time" [(ngModel)]="formStart"/>
              </div>
              <div class="field flex-1">
                <label class="field-label">Fin</label>
                <input class="field-input" type="time" [(ngModel)]="formEnd"/>
              </div>
            </div>
            <div class="field">
              <label class="field-label">Ubicación</label>
              <input class="field-input" [(ngModel)]="formLocation" placeholder="Gimnasio"/>
            </div>
            <div class="field">
              <label class="field-label">Objetivos</label>
              <textarea class="field-input field-textarea" [(ngModel)]="formObjectives" rows="3" placeholder="Ej: Mejorar el porcentaje de tiro..."></textarea>
            </div>
          </div>

          <div class="meta-card summary-card">
            <h3 class="meta-title">Resumen</h3>
            <div class="summary-row">
              <span class="summary-label">Secciones</span>
              <span class="summary-value">{{ sections.length }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Ejercicios</span>
              <span class="summary-value">{{ totalExercises }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Duración total</span>
              <span class="summary-value">{{ totalDuration }} min</span>
            </div>
          </div>
        </aside>

        <main class="builder-main">
          <div class="sections-list">
            <div class="section-card" *ngFor="let sec of sections; let si = index"
                 [style.border-left-color]="sectionColors[si % sectionColors.length]">
              <div class="section-header">
                <div class="section-handle">
                  <span class="material-symbols-outlined">drag_indicator</span>
                </div>
                <div class="section-title-group">
                  <span class="section-badge" [style.background]="sectionColors[si % sectionColors.length]">{{ sec.name }}</span>
                  <input class="section-name-input" [(ngModel)]="sec.name" (blur)="updateSectionName(sec)" placeholder="Nombre de la sección"/>
                </div>
                <div class="section-duration">
                  <span class="duration-pill">{{ getSectionDuration(sec.id) }} min</span>
                </div>
                <div class="section-actions">
                  <button class="btn-icon" (click)="moveSection(sec, -1)" *ngIf="si > 0" title="Mover arriba">
                    <span class="material-symbols-outlined">keyboard_arrow_up</span>
                  </button>
                  <button class="btn-icon" (click)="moveSection(sec, 1)" *ngIf="si < sections.length - 1" title="Mover abajo">
                    <span class="material-symbols-outlined">keyboard_arrow_down</span>
                  </button>
                  <button class="btn-icon btn-icon-danger" (click)="removeSection(sec)" *ngIf="sections.length > 1" title="Eliminar sección">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

                  <div class="section-exercises"
                       (dragover)="onDragOver($event, sec)"
                       (dragleave)="onDragLeave(sec)"
                       (drop)="onDrop($event, sec)"
                       [class.drag-over]="dragOverSection === sec.id">
                    <div class="ex-item" *ngFor="let se of getSectionExercises(sec.id); let ei = index"
                         draggable="true"
                         (dragstart)="onDragStart(se, sec)"
                         (dragend)="onDragEnd()"
                         (dragover)="onItemDragOver($event, sec, se)"
                         (dragleave)="onItemDragLeave(se)"
                         [class.dragging]="draggedExercise?.id === se.id"
                         [class.drop-before]="dropBeforeId === se.id">
                    <div class="ex-drag-handle">
                      <span class="material-symbols-outlined">drag_indicator</span>
                    </div>
                    <div class="ex-order">{{ ei + 1 }}</div>
                    <div class="ex-body">
                      <div class="ex-body-row">
                        <span class="ex-name">{{ getExerciseDisplayName(se) }}</span>
                        <span class="ex-duration">{{ se.duration_minutes }}</span>
                        <span class="ex-duration-unit">min</span>
                      </div>
                      <div class="ex-notes-group" *ngIf="!editingNotes.has(se.id)">
                        <span class="ex-notes-text" (click)="editNotes(se)" [class.has-notes]="se.notes">
                          {{ se.notes || 'Añadir nota...' }}
                        </span>
                        <button class="btn-icon btn-icon-small" (click)="editNotes(se)" title="Editar nota">
                          <span class="material-symbols-outlined">edit</span>
                        </button>
                      </div>
                      <div class="ex-notes-edit" *ngIf="editingNotes.has(se.id)">
                        <input class="field-input ex-notes-input" [(ngModel)]="se.notes" (keyup.enter)="saveNotes(se)" placeholder="Observaciones..."/>
                        <button class="btn-icon btn-icon-small btn-icon-save" (click)="saveNotes(se)" title="Guardar nota">
                          <span class="material-symbols-outlined">check</span>
                        </button>
                      </div>
                    </div>
                    <div class="ex-actions">
                      <button class="btn-icon btn-icon-small" (click)="moveExercise(sec, se, -1)" *ngIf="ei > 0" title="Mover arriba">
                        <span class="material-symbols-outlined">arrow_upward</span>
                      </button>
                      <button class="btn-icon btn-icon-small" (click)="moveExercise(sec, se, 1)" *ngIf="ei < getSectionExercises(sec.id).length - 1" title="Mover abajo">
                        <span class="material-symbols-outlined">arrow_downward</span>
                      </button>
                      <div class="ex-move-section" *ngIf="sections.length > 1">
                        <button class="btn-icon btn-icon-small btn-move-section" title="Mover a otra sección">
                          <span class="material-symbols-outlined">drive_file_move</span>
                        </button>
                        <div class="ex-move-dropdown">
                          <div class="ex-move-header">Mover a...</div>
                          <button class="ex-move-option" *ngFor="let targetSec of sections"
                                  (click)="moveToSection(se, sec, targetSec)"
                                  [class.disabled]="targetSec.id === sec.id"
                                  [disabled]="targetSec.id === sec.id">
                            <span class="ex-move-dot" [style.background]="sectionColors[sections.indexOf(targetSec) % sectionColors.length]"></span>
                            {{ targetSec.name }}
                          </button>
                        </div>
                      </div>
                      <button class="btn-icon btn-icon-danger" (click)="removeExFromSection(se)">
                        <span class="material-symbols-outlined">remove_circle</span>
                      </button>
                    </div>
                  </div>
                  <div class="ex-empty" *ngIf="getSectionExercises(sec.id).length === 0">
                    <span class="material-symbols-outlined">fitness_center</span>
                    <span>Añade ejercicios desde abajo</span>
                  </div>
              </div>

                <div class="section-add-toggle">
                  <button class="btn-add-ex-toggle" (click)="openExercisePicker(sec)">
                    <span class="material-symbols-outlined">add</span>
                    Añadir ejercicio
                  </button>
                </div>
            </div>

            <button class="add-section-btn" (click)="addSection()">
              <span class="material-symbols-outlined">add</span>
              Añadir Sección
            </button>
          </div>
        </main>
      </div>
    </div>

    @if (pickerOpen()) {
      <div class="modal-overlay" (click)="closePicker()">
        <div class="ex-picker" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Seleccionar ejercicio">
          <div class="ex-picker-head">
            <h3 class="ex-picker-title">
              {{ pickerSelectedExId() ? 'Configurar ejercicio' : 'Elegir ejercicio' }}
            </h3>
            <button class="ex-picker-close" (click)="closePicker()" aria-label="Cerrar">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          @if (pickerSelectedExId()) {
            <p class="ex-picker-selected">
              {{ selectedPickerExerciseName }}
              <button class="ex-picker-back" (click)="backToPickerList()">Cambiar</button>
            </p>
            <div class="ex-picker-config">
              <label class="picker-field">
                <span>Variante</span>
                <select class="field-input" [(ngModel)]="pickerVariantId">
                  <option *ngFor="let v of pickerVariants()" [value]="v.id">{{ v.name }}</option>
                  <option value="">Sin variante</option>
                </select>
              </label>
              <label class="picker-field">
                <span>Duración (min)</span>
                <input class="field-input" type="number" [(ngModel)]="pickerDuration" min="1" max="120"/>
              </label>
              <label class="picker-field">
                <span>Notas / observaciones</span>
                <input class="field-input" [(ngModel)]="pickerNotes" placeholder="Opcional"/>
              </label>
              <div class="ex-picker-actions">
                <button class="btn-cancel-ex" (click)="closePicker()">Cancelar</button>
                <button class="btn-add-ex" (click)="confirmPickerAdd()">
                  <span class="material-symbols-outlined">add</span>
                  Añadir a sección
                </button>
              </div>
            </div>
          } @else {
            <div class="ex-picker-search">
              <span class="material-symbols-outlined">search</span>
              <input class="field-input" [(ngModel)]="pickerSearch" placeholder="Buscar por nombre, objetivo o descripción..."/>
            </div>

            @if (tags.length > 1) {
              <div class="ex-picker-cats" role="group" aria-label="Filtrar por tag">
                <button class="ex-cat-chip" [class.active]="!pickerTagId"
                        (click)="pickerTagId = ''">Todas</button>
                @for (tag of tags; track tag.id) {
                  <button class="ex-cat-chip" [class.active]="pickerTagId === tag.id"
                          (click)="pickerTagId = pickerTagId === tag.id ? '' : tag.id"
                          [style.--chip-color]="tag.color">
                    <span class="ex-cat-dot" [style.background]="tag.color"></span>
                    {{ tag.name }}
                  </button>
                }
              </div>
            }

            <div class="ex-picker-diffs" role="group" aria-label="Filtrar por dificultad">
              <button class="ex-diff-chip" [class.active]="!pickerDifficulty"
                      (click)="pickerDifficulty = ''">Todas</button>
              <button class="ex-diff-chip" [class.active]="pickerDifficulty === 'beginner'"
                      (click)="pickerDifficulty = 'beginner'">Básico</button>
              <button class="ex-diff-chip" [class.active]="pickerDifficulty === 'intermediate'"
                      (click)="pickerDifficulty = 'intermediate'">Intermedio</button>
              <button class="ex-diff-chip" [class.active]="pickerDifficulty === 'advanced'"
                      (click)="pickerDifficulty = 'advanced'">Avanzado</button>
            </div>

            <div class="ex-picker-meta">
              <span>{{ pickerResultCount }} {{ pickerResultCount === 1 ? 'ejercicio' : 'ejercicios' }}</span>
              @if (hasActivePickerFilters) {
                <button class="ex-picker-clear" (click)="clearPickerFilters()">Limpiar filtros</button>
              }
            </div>

            <div class="ex-picker-list">
              @if (pickerResultCount === 0) {
                <p class="ex-picker-empty">Sin resultados para estos filtros</p>
              } @else {
                @for (group of pickerGroups; track group.tag ? group.tag.id : 'none') {
                  @if (!pickerTagId) {
                    <div class="ex-picker-group-head">
                      <span class="ex-picker-group-dot" [style.background]="group.tag ? tagColor(group.tag.id) : '#3a3f6a'"></span>
                      <span class="ex-picker-group-name">{{ group.tag ? group.tag.name : 'Sin tag' }}</span>
                      <span class="ex-picker-group-count">{{ group.exercises.length }}</span>
                    </div>
                  }
                  @for (e of group.exercises; track e.id) {
                    <button class="ex-picker-item" (click)="selectPickerExercise(e)">
                      <span class="ex-picker-item-name">
                        @if (pickerTagId) {
                          <span class="ex-inline-dot" [style.background]="e.tags.length ? tagColor(e.tags[0].id) : '#3a3f6a'"></span>
                        }
                        {{ e.name }}
                      </span>
                      <span class="ex-picker-item-meta">{{ difficultyLabel(e) }}</span>
                      <span class="material-symbols-outlined ex-picker-item-icon">chevron_right</span>
                    </button>
                  }
                }
              }
            </div>
          }
        </div>
      </div>
    }

    <ng-template #loadingTpl>
      <div class="builder-page"><div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando...</p></div></div>
    </ng-template>
  `,
  styles: [`
    .builder-page {
      padding: 40px;
      max-width: 1440px;
      margin: 0 auto;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .builder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      margin-bottom: 32px;
      flex-shrink: 0;
    }
    .page-title {
      font-size: 48px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #dfe0ff;
      margin: 0;
    }
    .page-sub {
      font-size: 18px;
      color: #c6c5d4;
      margin: 4px 0 0;
    }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .btn-primary, .btn-secondary {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 24px; border-radius: 12px;
      border: none; font-weight: 700; font-size: 15px;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-primary {
      background: #0068ed; color: #f2f3ff;
      box-shadow: 0 8px 24px rgba(0,104,237,0.2);
    }
    .btn-primary:hover:not(:disabled) { transform: scale(1.03); opacity: 0.95; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-primary .fill { font-variation-settings: 'FILL' 1; }
    .btn-secondary { background: #212653; color: #c6c5d4; }
    .btn-secondary:hover { background: #2a3160; }
    .builder-body { display: flex; gap: 32px; flex: 1; min-height: 0; }

    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .loading-icon { font-size: 48px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Metadata panel */
    .metadata-panel { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
    .meta-card {
      background: #161b48;
      border-radius: 16px;
      padding: 24px;
      border: 1px solid rgba(69,70,82,0.2);
    }
    .meta-title {
      font-size: 16px;
      font-weight: 700;
      color: #dfe0ff;
      margin: 0 0 20px;
    }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .field:last-child { margin-bottom: 0; }
    .field-label {
      font-size: 11px; font-weight: 700;
      color: #908f9d; text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .field-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .field-input {
      background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 8px; padding: 10px 12px;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px; outline: none; width: 100%; box-sizing: border-box;
    }
    .field-input:focus { border-color: #bdc2ff; }
    .field-textarea { resize: vertical; min-height: 60px; }

    .summary-card { }
    .summary-row {
      display: flex; justify-content: space-between;
      padding: 8px 0; border-bottom: 1px solid rgba(69,70,82,0.15);
    }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { font-size: 13px; color: #908f9d; }
    .summary-value { font-size: 14px; font-weight: 700; color: #bdc2ff; }

    /* Main builder area */
    .builder-main { flex: 1; min-width: 0; }
    .sections-list { display: flex; flex-direction: column; gap: 16px; }

    .section-card {
      background: #161b48;
      border-radius: 16px;
      border-left: 4px solid #0068ed;
      padding: 20px;
      border: 1px solid rgba(69,70,82,0.2);
      border-left-width: 4px;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .section-handle { color: #3a3f6a; cursor: grab; display: flex; }
    .section-handle .material-symbols-outlined { font-size: 20px; }
    .section-title-group { flex: 1; display: flex; align-items: center; gap: 8px; }
    .section-badge {
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 10px; border-radius: 9999px;
      color: white;
    }
    .section-name-input {
      background: transparent; border: 1px solid transparent;
      color: #dfe0ff; font-size: 16px; font-weight: 700;
      font-family: 'Hanken Grotesk', sans-serif;
      padding: 4px 8px; border-radius: 6px; outline: none; flex: 1;
    }
    .section-name-input:focus { border-color: rgba(189,194,255,0.3); background: rgba(0,0,0,0.2); }
    .section-duration { }
    .duration-pill {
      font-size: 11px; font-weight: 700;
      padding: 4px 10px; border-radius: 9999px;
      background: rgba(0,104,237,0.15); color: #bdc2ff;
    }
    .section-actions { display: flex; gap: 4px; }
    .btn-icon {
      background: none; border: none; color: #908f9d;
      cursor: pointer; padding: 4px; display: flex; border-radius: 4px;
      transition: all 0.15s;
    }
    .btn-icon:hover { color: #dfe0ff; background: rgba(255,255,255,0.05); }
    .btn-icon-danger:hover { color: #ff8a80; background: rgba(255,138,128,0.1); }
    .btn-icon .material-symbols-outlined { font-size: 18px; }

    /* Exercises inside section */
    .section-exercises {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
      min-height: 48px;
    }
    .ex-item {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0,0,0,0.2);
      border-radius: 10px;
      padding: 8px 12px;
      transition: box-shadow 0.15s;
    }
    .ex-drag-handle {
      color: #3a3f6a;
      cursor: grab;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .ex-drag-handle .material-symbols-outlined { font-size: 18px; }
    .ex-drag-handle:hover { color: #bdc2ff; }
    .ex-order {
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(189,194,255,0.1);
      color: #bdc2ff;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .ex-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ex-body-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ex-name { color: #dfe0ff; font-size: 14px; font-weight: 600; }
    .ex-duration {
      font-size: 13px;
      font-weight: 700;
      color: #bdc2ff;
      font-variant-numeric: tabular-nums;
      min-width: 24px;
      text-align: right;
    }
    .ex-duration-unit {
      font-size: 11px;
      color: #908f9d;
    }
    .ex-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }
    .ex-notes-input {
      min-width: 120px; max-width: 200px;
      padding: 6px 10px !important; font-size: 12px !important;
    }
    .ex-notes-group {
      display: flex; align-items: center; gap: 4px;
      min-width: 0;
    }
    .ex-notes-text {
      font-size: 12px; color: #3a3f6a; cursor: pointer;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      flex: 1; min-width: 0;
    }
    .ex-notes-text.has-notes { color: #908f9d; }
    .ex-notes-edit {
      display: flex; align-items: center; gap: 4px; flex: 1;
    }
    .btn-icon-small { padding: 2px !important; }
    .btn-icon-small .material-symbols-outlined { font-size: 14px !important; }
    .btn-icon-save { color: #4caf50 !important; }
    .btn-icon-save:hover { background: rgba(76,175,80,0.1) !important; }
    .ex-empty {
      text-align: center; color: #3a3f6a; font-size: 13px;
      padding: 20px 24px; display: flex; align-items: center;
      justify-content: center; gap: 8px;
      border: 1px dashed rgba(69,70,82,0.3); border-radius: 8px;
    }
    .ex-empty .material-symbols-outlined { font-size: 18px; }

    .ex-item.dragging { opacity: 0.4; }
    .ex-item.drop-before {
      border-top: 2px solid #bdc2ff;
      margin-top: -1px;
      border-radius: 0;
      position: relative;
    }
    .section-exercises.drag-over {
      outline: 2px dashed #bdc2ff;
      outline-offset: -2px;
      border-radius: 8px;
      background: rgba(189,194,255,0.03);
    }

    /* Move to section dropdown */
    .ex-move-section {
      position: relative;
      display: flex;
      align-items: center;
    }
    .btn-move-section { color: #3a3f6a !important; }
    .btn-move-section:hover { color: #bdc2ff !important; }
    .ex-move-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 100;
      background: #1e2457;
      border: 1px solid rgba(69,70,82,0.3);
      border-radius: 10px;
      padding: 6px;
      min-width: 180px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    .ex-move-section:hover .ex-move-dropdown { display: block; }
    .ex-move-header {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      color: #908f9d; padding: 6px 10px 8px; letter-spacing: 0.05em;
    }
    .ex-move-option {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 8px 10px; border: none; border-radius: 6px;
      background: none; color: #dfe0ff; font-size: 13px; font-weight: 500;
      cursor: pointer; font-family: 'Hanken Grotesk', sans-serif;
      text-align: left; transition: background 0.15s;
    }
    .ex-move-option:hover:not(.disabled) { background: rgba(0,104,237,0.15); }
    .ex-move-option.disabled { opacity: 0.3; cursor: default; }
    .ex-move-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }

    /* Add exercise row */
    .section-add-ex {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .add-ex-variant { min-width: 140px; }
    .add-ex-select { flex: 1; min-width: 160px; }
    .add-ex-dur { width: 70px !important; }
    .add-ex-notes { flex: 1; min-width: 120px; }
    .btn-add-ex {
      display: flex; align-items: center; gap: 4px;
      background: #0068ed; color: white;
      border: none; border-radius: 8px;
      padding: 8px 14px;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-add-ex:hover:not(:disabled) { opacity: 0.9; }
    .btn-add-ex:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-add-ex .material-symbols-outlined { font-size: 16px; }
    .btn-cancel-ex {
      background: none; border: 1px solid rgba(69,70,82,0.3);
      color: #908f9d; border-radius: 8px; padding: 8px 14px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; white-space: nowrap;
    }
    .btn-cancel-ex:hover { border-color: #bdc2ff; color: #bdc2ff; }
    .section-add-toggle { margin-top: 8px; }
    .btn-add-ex-toggle {
      display: flex; align-items: center; gap: 4px;
      background: none; border: 1px dashed rgba(69,70,82,0.3);
      color: #3a3f6a; cursor: pointer; padding: 8px 14px; border-radius: 8px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; font-weight: 600;
      transition: all 0.2s;
    }
    .btn-add-ex-toggle:hover { border-color: #bdc2ff; color: #bdc2ff; }
    .btn-add-ex-toggle .material-symbols-outlined { font-size: 16px; }

    /* Add section button */
    .add-section-btn {
      width: 100%;
      background: none;
      border: 2px dashed rgba(69,70,82,0.3);
      color: #908f9d;
      cursor: pointer;
      padding: 16px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 15px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .add-section-btn:hover {
      border-color: #bdc2ff;
      color: #bdc2ff;
      background: rgba(189,194,255,0.03);
    }
    .add-section-btn .material-symbols-outlined { font-size: 20px; }
    @media (max-width: 768px) {
      .builder-page { padding: 16px !important; }
      .builder-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .page-sub { font-size: 14px !important; }
      .header-actions { flex-direction: column !important; }
      .header-actions .btn-primary, .header-actions .btn-secondary { width: 100% !important; justify-content: center !important; }
      .builder-body { flex-direction: column !important; gap: 16px !important; }
      .metadata-panel { width: 100% !important; }
      .section-header { flex-wrap: wrap !important; gap: 8px !important; }
      .section-title-group { min-width: 0 !important; flex-wrap: wrap !important; }
      .section-name-input { width: 100% !important; }
      .section-actions { width: 100% !important; justify-content: flex-end !important; }
      .section-add-ex { flex-direction: column !important; align-items: stretch !important; }
      .add-ex-select { width: 100% !important; }
      .add-ex-dur { width: 100% !important; }
      .add-ex-notes { width: 100% !important; }
      .btn-add-ex { width: 100% !important; justify-content: center !important; }
      .field-row { flex-direction: column !important; }
    }
    @media (max-width: 480px) {
      .builder-page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
      .ex-item { flex-wrap: wrap !important; }
      .ex-notes { max-width: 100% !important; }
    }

    .modal-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .ex-picker {
      background: #111644; border: 1px solid rgba(69,70,82,0.3);
      border-radius: 16px; width: 100%; max-width: 560px;
      max-height: 80vh; display: flex; flex-direction: column;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    }
    .ex-picker-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 20px 12px;
    }
    .ex-picker-title { margin: 0; font-size: 20px; font-weight: 700; color: #dfe0ff; }
    .ex-picker-close {
      background: none; border: none; color: #c6c5d4; cursor: pointer;
      display: flex; padding: 4px;
    }
    .ex-picker-close:hover { color: #dfe0ff; }
    .ex-picker-search { position: relative; margin: 0 20px 12px; }
    .ex-picker-search .material-symbols-outlined {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      color: #908f9d; font-size: 18px;
    }
    .ex-picker-search .field-input { padding-left: 34px; width: 100%; }

    .ex-picker-cats {
      display: flex; flex-wrap: wrap; gap: 6px;
      padding: 0 20px 10px;
    }
    .ex-cat-chip {
      display: inline-flex; align-items: center; gap: 6px;
      background: #161b48; border: 1px solid rgba(69,70,82,0.3);
      color: #c6c5d4; font-family: 'Hanken Grotesk', sans-serif;
      font-size: 12px; font-weight: 600; border-radius: 999px;
      padding: 5px 12px; cursor: pointer; transition: all 0.15s;
    }
    .ex-cat-chip:hover { border-color: #bdc2ff; color: #dfe0ff; }
    .ex-cat-chip.active {
      border-color: var(--chip-color, #0068ed);
      color: #dfe0ff; background: color-mix(in srgb, var(--chip-color, #0068ed) 18%, #161b48);
      box-shadow: 0 0 0 1px var(--chip-color, #0068ed);
    }
    .ex-cat-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

    .ex-picker-diffs {
      display: flex; gap: 4px; padding: 0 20px 10px;
      background: rgba(0,0,0,0.15); margin: 0 20px 12px;
      border-radius: 10px; padding: 4px;
    }
    .ex-diff-chip {
      flex: 1; padding: 6px 0; border: none; border-radius: 8px;
      background: none; color: #908f9d; font-family: 'Hanken Grotesk', sans-serif;
      font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .ex-diff-chip:hover { color: #c6c5d4; }
    .ex-diff-chip.active { background: #0068ed; color: #f2f3ff; }

    .ex-picker-meta {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 20px 8px;
    }
    .ex-picker-meta > span { font-size: 12px; color: #908f9d; font-weight: 600; }
    .ex-picker-clear {
      background: none; border: none; color: #6fb0ff; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 12px; font-weight: 700;
    }
    .ex-picker-clear:hover { text-decoration: underline; }

    .ex-picker-list { flex: 1; overflow-y: auto; padding: 0 12px 12px; }
    .ex-picker-empty { text-align: center; color: #908f9d; padding: 24px; }
    .ex-picker-group-head {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 14px 6px;
    }
    .ex-picker-group-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .ex-picker-group-name {
      flex: 1; font-size: 12px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.05em; color: #c6c5d4;
    }
    .ex-picker-group-count {
      font-size: 11px; font-weight: 700; color: #908f9d;
    }
    .ex-inline-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
    .ex-picker-item {
      display: flex; align-items: center; gap: 10px;
      width: 100%; text-align: left; padding: 12px 14px;
      background: #161b48; border: 1px solid rgba(69,70,82,0.2);
      border-radius: 10px; margin-bottom: 8px; cursor: pointer;
      color: #dfe0ff; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px;
      transition: border-color 0.15s, background 0.15s;
    }
    .ex-picker-item:hover { border-color: #bdc2ff; background: #1b2157; }
    .ex-picker-item:focus-visible { outline: 2px solid #bdc2ff; outline-offset: 1px; }
    .ex-picker-item-name { flex: 1; font-weight: 600; }
    .ex-picker-item-meta {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 3px 8px; border-radius: 999px;
      background: rgba(0,104,237,0.15); color: #6fb0ff;
    }
    .ex-picker-item-icon { color: #908f9d; font-size: 18px; }
    .ex-picker-selected {
      display: flex; align-items: center; gap: 10px;
      margin: 0 20px 12px; padding: 12px 14px;
      background: rgba(0,104,237,0.12); border: 1px solid rgba(0,104,237,0.4);
      border-radius: 10px; color: #dfe0ff; font-weight: 600; font-size: 15px;
    }
    .ex-picker-back {
      background: none; border: none; color: #6fb0ff; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 12px; font-weight: 700;
    }
    .ex-picker-back:hover { text-decoration: underline; }
    .ex-picker-config { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 14px; }
    .picker-field { display: flex; flex-direction: column; gap: 6px; }
    .picker-field span { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .ex-picker-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 6px; }
  `]
})
export class SessionBuilderComponent {
  private data = inject(DataService);
  private exerciseRepo = inject(ExerciseRepository);
  private sessionRepo = inject(SessionRepository);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private injector = inject(EnvironmentInjector);
  private reload = new Subject<void>();
  editingSession: TrainingSession | null = null;

  teams: Team[] = [];
  exercises: Exercise[] = [];
  tags: Tag[] = [];
  sections: SectionVM[] = [];
  sectionExercisesMap: Record<string, ExerciseVM[]> = {};
  exerciseNames: Record<string, string> = {};
  variantNames: Record<string, string> = {};

  formTitle = '';
  formTeam = '';
  formDate = '';
  formStart = '16:00';
  formEnd = '17:30';
  formLocation = '';
  formObjectives = '';

  sectionAddForms: Record<string, SectionAddForm> = {};
  editingNotes: Set<string> = new Set();
  autoTitle = true;

  draggedExercise: ExerciseVM | null = null;
  draggedSection: SectionVM | null = null;
  dragOverSection: string | null = null;
  dropBeforeId: string | null = null;

  sectionColors = ['#0068ed', '#00c853', '#ff9100', '#e040fb', '#00bcd4', '#ff6d00'];

  readonly vm$ = from(this.data.ensureClubLoaded()).pipe(
    filter(Boolean),
    switchMap(() => combineLatest([
      toObservable(this.data.currentClub, { injector: this.injector }).pipe(filter(Boolean)),
      this.reload.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([club]) => forkJoin({
        teams: from(this.data.getTeams()),
        exercises: from(this.exerciseRepo.findAll(club.id)),
        tags: from(this.exerciseRepo.getTags(club.id)),
      }).pipe(
        catchError(err => {
          console.error(err);
          return of({ teams: [] as Team[], exercises: [] as Exercise[], tags: [] as Tag[] });
        })
      )),
      tap(({ teams, exercises, tags }) => {
        this.teams = teams;
        this.exercises = exercises;
        this.tags = tags;
        exercises.forEach(e => this.exerciseNames[e.id] = e.name);
      }),
      switchMap(({ teams, exercises }) => {
        if (teams.length > 0 && !this.formTeam) this.formTeam = teams[0].id;
        if (!this.formDate) this.formDate = new Date().toISOString().slice(0, 10);

        const sessionId = this.route.snapshot.paramMap.get('id');
        const load$ = (sessionId && !this.editingSession)
          ? from(this.loadEditingSession(sessionId))
          : of(true);

        return load$.pipe(
          switchMap(loaded => {
            if (!loaded && this.sections.length === 0) this.initSections();
            if (!this.editingSession && !this.formTitle) this.updateDefaultTitle();
            const exerciseNames: Record<string, string> = {};
            exercises.forEach(e => exerciseNames[e.id] = e.name);
            return from(this.exerciseRepo.getVariantsByExerciseIds(exercises.map(e => e.id))).pipe(
              map(allVariants => {
                const variantNames: Record<string, string> = {};
                allVariants.forEach(v => { variantNames[v.id] = v.name; });
                this.variantNames = variantNames;
                return { teams, exercises, exerciseNames, variantNames };
              })
            );
          })
        );
      })
    ))
  );

  initSections() {
    this.sections = [];
    this.sectionExercisesMap = {};
    this.addDefaultSections();
  }

  addDefaultSections() {
    const defaults = ['Calentamiento', 'Parte Principal', 'Vuelta a la Calma'];
    for (const name of defaults) {
      const id = 'new-' + crypto.randomUUID();
      this.sections.push({ id, name, sort_order: this.sections.length + 1 });
      this.sectionExercisesMap[id] = [];
    }
  }

  private async loadEditingSession(sessionId: string): Promise<boolean> {
    const clubId = this.data.currentClub()?.id;
    if (!clubId) return false;
    const sessions = await this.sessionRepo.findAll(clubId);
    this.editingSession = sessions.find(s => s.id === sessionId) || null;
    if (!this.editingSession) return false;
    this.formTitle = this.editingSession.title;
    this.formTeam = this.editingSession.team_id;
    this.formDate = this.editingSession.date;
    this.formStart = this.editingSession.start_time;
    this.formEnd = this.editingSession.end_time;
    this.formLocation = this.editingSession.location || '';
    this.formObjectives = this.editingSession.objectives || '';

    const dbSections = await this.data.getSections(sessionId);
    const allEx = await this.data.getSessionExercises(sessionId);
    this.sections = [];
    this.sectionExercisesMap = {};
    for (const sec of dbSections) {
      this.sections.push({ id: sec.id, name: sec.name, sort_order: sec.sort_order });
      this.sectionExercisesMap[sec.id] = allEx
        .filter(e => e.section_id === sec.id)
        .map(e => ({ id: e.id, exercise_id: e.exercise_id, variant_id: e.variant_id || null, section_id: e.section_id!, duration_minutes: e.duration_minutes, notes: e.notes, order: e.order }));
    }
    if (this.sections.length === 0) this.addDefaultSections();
    return true;
  }

  getExerciseDisplayName(se: ExerciseVM): string {
    const exName = this.exerciseNames[se.exercise_id] || 'Ejercicio';
    if (se.variant_id && this.variantNames[se.variant_id]) {
      return `${exName} - ${this.variantNames[se.variant_id]}`;
    }
    return exName;
  }

  getSectionExercises(sectionId: string): ExerciseVM[] {
    return this.sectionExercisesMap[sectionId] || [];
  }

  getSectionDuration(sectionId: string): number {
    return (this.sectionExercisesMap[sectionId] || []).reduce((a, b) => a + b.duration_minutes, 0);
  }

  get totalExercises(): number {
    return Object.values(this.sectionExercisesMap).reduce((a, b) => a + b.length, 0);
  }

  get totalDuration(): number {
    return this.sections.reduce((a, sec) => a + this.getSectionDuration(sec.id), 0);
  }

  addSection() {
    const id = 'new-' + crypto.randomUUID();
    this.sections.push({ id, name: 'Nueva Sección', sort_order: this.sections.length + 1 });
    this.sectionExercisesMap[id] = [];
  }

  removeSection(sec: SectionVM) {
    if (this.sections.length <= 1) return;
    this.sections = this.sections.filter(s => s.id !== sec.id);
    delete this.sectionExercisesMap[sec.id];
  }

  moveSection(sec: SectionVM, dir: number) {
    const idx = this.sections.indexOf(sec);
    const target = idx + dir;
    if (target < 0 || target >= this.sections.length) return;
    this.sections[idx] = this.sections[target];
    this.sections[target] = sec;
    this.sections.forEach((s, i) => s.sort_order = i + 1);
  }

  moveToSection(se: ExerciseVM, fromSec: SectionVM, toSec: SectionVM) {
    if (fromSec.id === toSec.id) return;
    const srcList = this.sectionExercisesMap[fromSec.id];
    const dstList = this.sectionExercisesMap[toSec.id];
    if (!srcList || !dstList) return;
    const idx = srcList.indexOf(se);
    if (idx === -1) return;
    srcList.splice(idx, 1);
    se.section_id = toSec.id;
    dstList.push(se);
    srcList.forEach((e, i) => e.order = i + 1);
    dstList.forEach((e, i) => e.order = i + 1);
  }

  updateDefaultTitle() {
    if (!this.autoTitle) return;
    const team = this.teams.find(t => t.id === this.formTeam);
    const teamName = team?.name || '';
    const d = this.formDate ? new Date(this.formDate + 'T12:00:00') : null;
    const dateStr = d ? d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    const parts = [teamName, dateStr].filter(Boolean);
    this.formTitle = parts.join(' - ');
  }

  onTitleEdited() { this.autoTitle = false; }

  onTeamOrDateChange() { this.updateDefaultTitle(); }

  updateSectionName(sec: SectionVM) {}

  editNotes(se: ExerciseVM) { this.editingNotes.add(se.id); }

  saveNotes(se: ExerciseVM) { this.editingNotes.delete(se.id); }

  openAddForm(sec: SectionVM) {
    this.sectionAddForms[sec.id] = {
      show: true, exerciseId: '', variantId: '', variants: [], duration: 10, notes: '',
    };
  }

  closeAddForm(sec: SectionVM) {
    delete this.sectionAddForms[sec.id];
  }

  pickerOpen = signal(false);
  pickerSearch = '';
  pickerTagId = '';
  pickerDifficulty = '';
  pickerSelectedExId = signal('');
  pickerVariants = signal<ExerciseVariant[]>([]);
  pickerVariantId = '';
  pickerDuration = 10;
  pickerNotes = '';
  private pickerSectionId: string | null = null;

  openExercisePicker(sec: SectionVM) {
    this.pickerSectionId = sec.id;
    this.pickerSearch = '';
    this.pickerTagId = '';
    this.pickerDifficulty = '';
    this.pickerSelectedExId.set('');
    this.pickerVariants.set([]);
    this.pickerVariantId = '';
    this.pickerDuration = 10;
    this.pickerNotes = '';
    this.pickerOpen.set(true);
  }

  closePicker() {
    this.pickerOpen.set(false);
    this.pickerSectionId = null;
  }

  get filteredPickerExercises(): Exercise[] {
    const q = this.pickerSearch.trim().toLowerCase();
    const tagId = this.pickerTagId;
    const diff = this.pickerDifficulty;
    return this.exercises.filter(e => {
      if (tagId && !e.tags.some(t => t.id === tagId)) return false;
      if (diff && e.difficulty !== diff) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.objectives ?? '').toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q)
      );
    });
  }

  get pickerResultCount(): number {
    return this.filteredPickerExercises.length;
  }

  get hasActivePickerFilters(): boolean {
    return Boolean(this.pickerSearch.trim() || this.pickerTagId || this.pickerDifficulty);
  }

  // Agrupa los ejercicios filtrados por el primer tag (para la agrupación visual).
  // Los ejercicios sin tags van en un grupo "Sin tag" al final.
  get pickerGroups(): { tag: Tag | null; exercises: Exercise[] }[] {
    const list = this.filteredPickerExercises;
    const groups: { tag: Tag | null; exercises: Exercise[] }[] = [];
    const tagById = new Map(this.tags.map(t => [t.id, t]));
    const ordered = [...this.tags];
    ordered.forEach(tag => {
      const items = list.filter(e => e.tags.some(t => t.id === tag.id));
      if (items.length) groups.push({ tag, exercises: items });
    });
    const untagged = list.filter(e => !e.tags.some(t => tagById.has(t.id)));
    if (untagged.length) groups.push({ tag: null, exercises: untagged });
    return groups;
  }

  tagColor(id: string): string {
    return this.tags.find(t => t.id === id)?.color || '#3a3f6a';
  }

  tagName(id: string): string {
    return this.tags.find(t => t.id === id)?.name || 'Sin tag';
  }

  clearPickerFilters() {
    this.pickerSearch = '';
    this.pickerTagId = '';
    this.pickerDifficulty = '';
  }

  get selectedPickerExerciseName(): string {
    const id = this.pickerSelectedExId();
    const ex = this.exercises.find(e => e.id === id);
    return ex ? ex.name : '';
  }

  difficultyLabel(e: Exercise): string {
    const map: Record<string, string> = { beginner: 'Básico', intermediate: 'Intermedio', advanced: 'Avanzado', elite: 'Élite' };
    return map[e.difficulty] || e.difficulty || '—';
  }

  async selectPickerExercise(e: Exercise) {
    this.pickerSelectedExId.set(e.id);
    this.pickerVariantId = '';
    this.pickerVariants.set([]);
    try {
      const variants = await this.exerciseRepo.getVariants(e.id);
      this.pickerVariants.set(variants);
      if (variants.length > 0) {
        this.pickerVariantId = '';
      }
    } catch {
      this.pickerVariants.set([]);
    }
  }

  backToPickerList() {
    this.pickerSelectedExId.set('');
    this.pickerVariants.set([]);
    this.pickerVariantId = '';
  }

  confirmPickerAdd() {
    const exId = this.pickerSelectedExId();
    const secId = this.pickerSectionId;
    if (!exId || !secId) return;
    const id = 'new-' + crypto.randomUUID();
    const list = this.sectionExercisesMap[secId] || [];
    const vm: ExerciseVM = {
      id,
      exercise_id: exId,
      variant_id: this.pickerVariantId || null,
      section_id: secId,
      duration_minutes: this.pickerDuration,
      notes: this.pickerNotes || null,
      order: list.length + 1,
    };
    this.sectionExercisesMap[secId] = [...list, vm];
    this.closePicker();
  }

  addExerciseToSection(sec: SectionVM) {
    const form = this.sectionAddForms[sec.id];
    if (!form || !form.exerciseId) return;
    const id = 'new-' + crypto.randomUUID();
    const list = this.sectionExercisesMap[sec.id] || [];
    const vm: ExerciseVM = {
      id,
      exercise_id: form.exerciseId,
      variant_id: form.variantId || null,
      section_id: sec.id,
      duration_minutes: form.duration,
      notes: form.notes || null,
      order: list.length + 1,
    };
    this.sectionExercisesMap[sec.id] = [...list, vm];
    delete this.sectionAddForms[sec.id];
  }

  removeExFromSection(se: ExerciseVM) {
    const list = this.sectionExercisesMap[se.section_id] || [];
    this.sectionExercisesMap[se.section_id] = list.filter(x => x.id !== se.id);
  }

  moveExercise(sec: SectionVM, se: ExerciseVM, dir: number) {
    const list = this.sectionExercisesMap[sec.id] || [];
    const idx = list.indexOf(se);
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    list[idx] = list[target];
    list[target] = se;
    list.forEach((e, i) => e.order = i + 1);
    this.sectionExercisesMap[sec.id] = [...list];
  }

  onDragStart(se: ExerciseVM, sec: SectionVM) {
    this.draggedExercise = se;
    this.draggedSection = sec;
  }

  onDragEnd() {
    this.draggedExercise = null;
    this.draggedSection = null;
    this.dragOverSection = null;
    this.dropBeforeId = null;
  }

  onDragOver(event: DragEvent, sec: SectionVM) {
    event.preventDefault();
    this.dragOverSection = sec.id;
  }

  onDragLeave(sec: SectionVM) {
    if (this.dragOverSection === sec.id) {
      this.dragOverSection = null;
    }
  }

  onItemDragOver(event: DragEvent, sec: SectionVM, se: ExerciseVM) {
    event.preventDefault();
    this.dragOverSection = sec.id;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    this.dropBeforeId = event.clientY < midY ? se.id : null;
  }

  onItemDragLeave(se: ExerciseVM) {
    if (this.dropBeforeId === se.id) {
      this.dropBeforeId = null;
    }
  }

  onDrop(event: DragEvent, targetSec: SectionVM) {
    event.preventDefault();
    const ex = this.draggedExercise;
    const fromSec = this.draggedSection;
    if (!ex || !fromSec) return;

    const targetList = this.sectionExercisesMap[targetSec.id];
    if (!targetList) return;

    const insertBeforeIdx = this.dropBeforeId
      ? targetList.findIndex(e => e.id === this.dropBeforeId)
      : -1;

    const insertAt = insertBeforeIdx >= 0 ? insertBeforeIdx : targetList.length;

    if (fromSec.id === targetSec.id) {
      const srcList = targetList;
      const fromIdx = srcList.indexOf(ex);
      if (fromIdx === -1) return;
      srcList.splice(fromIdx, 1);
      const adjustedTarget = insertAt > fromIdx ? insertAt - 1 : insertAt;
      srcList.splice(adjustedTarget, 0, ex);
      srcList.forEach((e, i) => e.order = i + 1);
      this.sectionExercisesMap[targetSec.id] = [...srcList];
    } else {
      const srcList = this.sectionExercisesMap[fromSec.id];
      if (!srcList) return;
      const fromIdx = srcList.indexOf(ex);
      if (fromIdx === -1) return;
      srcList.splice(fromIdx, 1);
      srcList.forEach((e, i) => e.order = i + 1);
      this.sectionExercisesMap[fromSec.id] = [...srcList];

      ex.section_id = targetSec.id;
      targetList.splice(insertAt, 0, ex);
      targetList.forEach((e, i) => e.order = i + 1);
      this.sectionExercisesMap[targetSec.id] = [...targetList];
    }

    this.draggedExercise = null;
    this.draggedSection = null;
    this.dragOverSection = null;
    this.dropBeforeId = null;
  }

  async save() {
    if (!this.formTitle.trim() || !this.formDate) return;
    const clubId = this.data.currentClub()?.id;
    if (!clubId) return;

    let sessionId = this.editingSession?.id;
    if (sessionId) {
      await this.sessionRepo.update(sessionId, {
        title: this.formTitle.trim(),
        team_id: this.formTeam,
        date: this.formDate,
        start_time: this.formStart,
        end_time: this.formEnd,
        location: this.formLocation.trim() || null,
        objectives: this.formObjectives.trim() || null,
      });
    } else {
      const session = await this.sessionRepo.create({
        club_id: clubId,
        team_id: this.formTeam,
        title: this.formTitle.trim(),
        description: null,
        location: this.formLocation.trim() || null,
        date: this.formDate,
        start_time: this.formStart,
        end_time: this.formEnd,
        status: 'planned',
        notes: null,
        objectives: this.formObjectives.trim() || null,
      });
      if (session) sessionId = session.id;
    }
    if (!sessionId) return;

    const existingSections = await this.data.getSections(sessionId);
    const existingExIds = new Set<string>();
    for (const sec of this.sections) {
      const existingSec = sec.id.startsWith('new-') ? null : existingSections.find(s => s.id === sec.id);
      let sectionId: string;
      if (existingSec) {
        await this.data.updateSection(sec.id, { name: sec.name, sort_order: sec.sort_order });
        sectionId = sec.id;
      } else {
        const created = await this.data.createSection({ session_id: sessionId, name: sec.name, sort_order: sec.sort_order });
        if (!created) continue;
        sectionId = created.id;
      }
      for (const ex of this.sectionExercisesMap[sec.id] || []) {
        if (ex.id.startsWith('new-')) {
          const created = await this.data.addSessionExercise({
            session_id: sessionId,
            section_id: sectionId,
            exercise_id: ex.exercise_id,
            variant_id: (ex as any).variant_id || null,
            order: ex.order,
            duration_minutes: ex.duration_minutes,
            notes: ex.notes,
          });
          if (created) existingExIds.add(created.id);
        } else {
          await this.data.updateSessionExercise(ex.id, {
            section_id: sectionId,
            order: ex.order,
            duration_minutes: ex.duration_minutes,
            notes: ex.notes,
          });
          existingExIds.add(ex.id);
        }
      }
    }
    for (const sec of existingSections) {
      const keeps = this.sections.some(s => s.id === sec.id);
      if (!keeps) await this.data.deleteSection(sec.id);
    }
    const allExistingExs = await this.data.getSessionExercises(sessionId);
    for (const ex of allExistingExs) {
      if (!existingExIds.has(ex.id)) await this.data.removeSessionExercise(ex.id);
    }

    this.router.navigate(['/sessions', sessionId]);
  }

  cancel() {
    if (this.editingSession) {
      this.router.navigate(['/sessions', this.editingSession.id]);
    } else {
      this.router.navigate(['/sessions']);
    }
  }
}

interface SectionVM {
  id: string;
  name: string;
  sort_order: number;
}

interface ExerciseVM {
  id: string;
  exercise_id: string;
  variant_id: string | null;
  section_id: string;
  duration_minutes: number;
  notes: string | null;
  order: number;
}

interface SectionAddForm {
  show: boolean;
  exerciseId: string;
  variantId: string;
  variants: ExerciseVariant[];
  duration: number;
  notes: string;
}

interface Team { id: string; name: string; }
