import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import type { TrainingSession, SessionSection, SessionExercise, Exercise, Team } from '../../core/models/models';

@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  template: `
    <div class="detail-page" *ngIf="session">
      <header class="detail-header">
        <button class="btn-back" (click)="goBack()">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div class="detail-header-info">
          <h1 class="page-title">{{ session.title }}</h1>
          <div class="detail-meta">
            <span class="meta-chip">{{ session.date }}</span>
            <span class="meta-chip">{{ session.start_time.slice(0,5) }} - {{ session.end_time.slice(0,5) }}</span>
            <span class="meta-chip" *ngIf="teamName">{{ teamName }}</span>
            <span class="meta-chip" *ngIf="session.location">{{ session.location }}</span>
            <span class="session-status" [class]="session.status">{{ statusLabel(session.status) }}</span>
          </div>
          <p class="detail-objectives" *ngIf="session.objectives">{{ session.objectives }}</p>
        </div>
        <div class="detail-header-actions">
          <button class="btn-secondary" (click)="exportPDF()">
            <span class="material-symbols-outlined">picture_as_pdf</span>
            Exportar PDF
          </button>
          <button class="btn-secondary" (click)="editSession()">
            <span class="material-symbols-outlined">edit</span>
            Editar
          </button>
        </div>
      </header>

      <div class="detail-body">
        <aside class="sections-nav">
          <h3 class="nav-title">Secciones</h3>
          <div class="nav-list">
            <button class="nav-item" *ngFor="let sec of sections; let si = index"
              (click)="scrollToSection(si)">
              <span class="nav-badge" [style.background]="sectionColors[si % sectionColors.length]">{{ sec.name }}</span>
              <span class="nav-duration">{{ getSectionDuration(sec.id) }} min</span>
            </button>
          </div>
          <div class="nav-summary">
            <div class="nav-summary-row">
              <span>Ejercicios</span>
              <strong>{{ totalExercises }}</strong>
            </div>
            <div class="nav-summary-row">
              <span>Duración</span>
              <strong>{{ totalDuration }} min</strong>
            </div>
          </div>
        </aside>

        <main class="detail-main">
          <div class="sections-list">
            <div class="section-card" *ngFor="let sec of sections; let si = index"
              [id]="'section-' + si"
              draggable="true"
              (dragstart)="onSectionDragStart($event, si)"
              (dragover)="onSectionDragOver($event, si)"
              (dragend)="onSectionDragEnd()"
              (drop)="onSectionDrop($event, si)"
              [class.drag-over]="dragOverSectionIdx === si"
              [style.border-left-color]="sectionColors[si % sectionColors.length]">
              <div class="section-header">
                <div class="section-handle" (mousedown)="$event.stopPropagation()">
                  <span class="material-symbols-outlined">drag_indicator</span>
                </div>
                <div class="section-title-group">
                  <span class="section-badge" [style.background]="sectionColors[si % sectionColors.length]">{{ sec.name }}</span>
                  <input class="section-name-input" [(ngModel)]="sec.name" (blur)="updateSectionName(sec)" placeholder="Nombre de la sección"/>
                </div>
                <div class="section-header-actions">
                  <span class="duration-pill">{{ getSectionDuration(sec.id) }} min</span>
                  <button class="btn-icon" (click)="moveSection(sec, -1)" *ngIf="si > 0" title="Mover arriba">
                    <span class="material-symbols-outlined">keyboard_arrow_up</span>
                  </button>
                  <button class="btn-icon" (click)="moveSection(sec, 1)" *ngIf="si < sections.length - 1" title="Mover abajo">
                    <span class="material-symbols-outlined">keyboard_arrow_down</span>
                  </button>
                  <button class="btn-icon btn-icon-danger" (click)="promptRemoveSection(sec)" *ngIf="sections.length > 1" title="Eliminar sección">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

              <div class="section-exercises"
                (dragover)="onExDragOver($event, sec.id)"
                (drop)="onExDrop($event, sec.id)"
                [class.ex-drop-target]="dragExTargetSection === sec.id">
                <div class="ex-item" *ngFor="let se of getSectionExercises(sec.id); let ei = index"
                  draggable="true"
                  (dragstart)="onExDragStart($event, se, sec.id)"
                  (dragover)="onExDragOverItem($event, ei)"
                  (drop)="onExDropOnItem($event, sec.id, ei)"
                  [class.drag-over-top]="dragOverExIdx === ei && dragExTargetSection === sec.id && dragExPosition === 'before'"
                  [class.drag-over-bottom]="dragOverExIdx === ei && dragExTargetSection === sec.id && dragExPosition === 'after'">
                  <div class="ex-drag-handle" (mousedown)="$event.stopPropagation()">
                    <span class="material-symbols-outlined">drag_indicator</span>
                  </div>
                  <div class="ex-order">{{ ei + 1 }}</div>
                  <div class="ex-info">
                    <div class="ex-name-row">
                      <span class="ex-name">{{ exerciseNames[se.exercise_id] || 'Ejercicio' }}</span>
                      <span class="ex-duration">{{ se.duration_minutes }} min</span>
                    </div>
                    <div class="ex-tags-row" *ngIf="getExerciseTags(se.exercise_id).length">
                      <span class="mini-tag" *ngFor="let t of getExerciseTags(se.exercise_id)">{{ t }}</span>
                    </div>
                    <input class="ex-notes field-input" [(ngModel)]="se.notes" (blur)="updateExNotes(se)" placeholder="Notas opcionales..."/>
                  </div>
                  <button class="btn-icon btn-icon-danger" (click)="promptRemoveEx(se)">
                    <span class="material-symbols-outlined">remove_circle</span>
                  </button>
                </div>
                <div class="ex-empty" *ngIf="getSectionExercises(sec.id).length === 0">
                  <span class="material-symbols-outlined">fitness_center</span>
                  <span>Sin ejercicios — añade desde abajo</span>
                </div>
              </div>

              <div class="section-add-ex">
                <button class="btn-select-ex" (click)="openExercisePicker(sec)">
                  <span class="material-symbols-outlined">search</span>
                  {{ addExExerciseId && getExercise(addExExerciseId) ? getExercise(addExExerciseId)!.name : 'Seleccionar ejercicio...' }}
                </button>
                <input class="field-input add-ex-dur" type="number" [(ngModel)]="addExDuration" min="1" max="120" placeholder="min"/>
                <input class="field-input add-ex-notes" [(ngModel)]="addExNotes" placeholder="Notas..."/>
                <button class="btn-add-ex" (click)="addExerciseToSection(sec)" [disabled]="!addExExerciseId || addingExercise">
                  <span class="material-symbols-outlined" *ngIf="!addingExercise">add</span>
                  <span class="material-symbols-outlined loading-icon-sm" *ngIf="addingExercise">sync</span>
                  Añadir
                </button>
              </div>
            </div>

            <button class="add-section-btn" (click)="addSection()" [disabled]="savingSection">
              <span class="material-symbols-outlined loading-icon-sm" *ngIf="savingSection">sync</span>
              <span class="material-symbols-outlined" *ngIf="!savingSection">add</span>
              {{ savingSection ? 'Añadiendo...' : 'Añadir Sección' }}
            </button>
          </div>
        </main>
      </div>
    </div>

    <div class="page" *ngIf="!session && !loading">
      <p class="empty-state">Sesión no encontrada.</p>
    </div>

    <div class="page" *ngIf="loading">
      <div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando sesión...</p></div>
    </div>

    <!-- Confirm modal -->
    <div class="modal-overlay" *ngIf="showConfirm" (click)="cancelConfirm()">
      <div class="modal-card confirm-card" (click)="$event.stopPropagation()">
        <div class="confirm-icon">
          <span class="material-symbols-outlined">help</span>
        </div>
        <h3 class="confirm-title">{{ confirmTitle }}</h3>
        <p class="confirm-message">{{ confirmMessage }}</p>
        <div class="confirm-actions">
          <button class="btn-cancel" (click)="cancelConfirm()">Cancelar</button>
          <button class="btn-danger" (click)="executeConfirm()">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Edit modal -->
    <div class="modal-overlay" *ngIf="showEditForm" (click)="showEditForm = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h3 class="modal-title">Editar Sesión</h3>
        <div class="modal-body">
          <label class="field"><span>Título</span><input class="field-input" [(ngModel)]="formTitle" placeholder="Shooting Drills"/></label>
          <label class="field"><span>Equipo</span>
            <select class="field-input" [(ngModel)]="formTeam">
              <option *ngFor="let t of teams" [value]="t.id">{{ t.name }}</option>
            </select>
          </label>
          <label class="field"><span>Fecha</span><input class="field-input" type="date" [(ngModel)]="formDate"/></label>
          <div class="field-row">
            <label class="field flex-1"><span>Hora inicio</span><input class="field-input" type="time" [(ngModel)]="formStart"/></label>
            <label class="field flex-1"><span>Hora fin</span><input class="field-input" type="time" [(ngModel)]="formEnd"/></label>
          </div>
          <label class="field"><span>Ubicación</span><input class="field-input" [(ngModel)]="formLocation" placeholder="Gimnasio Principal"/></label>
          <label class="field"><span>Objetivos</span><textarea class="field-input field-textarea" [(ngModel)]="formObjectives" rows="2" placeholder="Mejorar transición ofensiva..."></textarea></label>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" (click)="showEditForm = false">Cancelar</button>
          <button class="btn-save" (click)="saveEdit()">Guardar Cambios</button>
        </div>
      </div>
    </div>

    <!-- Exercise picker modal -->
    <div class="modal-overlay" *ngIf="showExercisePicker" (click)="showExercisePicker = false">
      <div class="modal-card picker-card" (click)="$event.stopPropagation()">
        <div class="picker-header">
          <h3 class="modal-title">Seleccionar Ejercicio</h3>
          <button class="btn-close-modal" (click)="showExercisePicker = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="picker-filters">
          <div class="picker-search-wrap">
            <span class="material-symbols-outlined search-icon">search</span>
            <input class="field-input picker-search" [(ngModel)]="pickerSearch" placeholder="Buscar por nombre o tag..."/>
          </div>
          <div class="picker-tags">
            <button class="tag-filter-btn" [class.active]="!pickerTag" (click)="pickerTag = ''">Todos</button>
            <button class="tag-filter-btn" *ngFor="let t of collectAllTags()" [class.active]="pickerTag === t" (click)="pickerTag = pickerTag === t ? '' : t">{{ t }}</button>
          </div>
        </div>
        <div class="picker-list">
          <div class="picker-item" *ngFor="let ex of filteredPickerExercises" (click)="selectPickerExercise(ex)">
            <div class="picker-item-info">
              <span class="picker-item-name">{{ ex.name }}</span>
              <div class="picker-item-tags" *ngIf="(ex.tags || []).length">
                <span class="mini-tag" *ngFor="let t of ex.tags">{{ t }}</span>
              </div>
            </div>
            <div class="picker-item-meta">
              <span class="picker-dur">{{ ex.duration_minutes || '?' }} min</span>
            </div>
          </div>
          <div class="picker-empty" *ngIf="filteredPickerExercises.length === 0">
            <span class="material-symbols-outlined">search_off</span>
            <span>No se encontraron ejercicios</span>
          </div>
        </div>
      </div>
    </div>


  `,
  styles: [`
    .page { padding: 40px; max-width: 1440px; margin: 0 auto; }
    .detail-page { padding: 40px; max-width: 1440px; margin: 0 auto; min-height: 100vh; }
    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .loading-icon { font-size: 48px; animation: spin 1s linear infinite; }
    .loading-icon-sm { font-size: 16px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state p, .loading-state p { margin: 0; font-size: 16px; }

    .btn-back {
      background: #212653; border: none; color: #c6c5d4;
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; transition: all 0.15s;
    }
    .btn-back:hover { background: #2a3160; color: #dfe0ff; }

    .detail-header {
      display: flex; gap: 20px; align-items: flex-start;
      margin-bottom: 32px;
    }
    .detail-header-info { flex: 1; min-width: 0; }
    .page-title {
      font-size: 48px; font-weight: 800; letter-spacing: -0.02em;
      color: #dfe0ff; margin: 0 0 12px;
    }
    .detail-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .meta-chip {
      font-size: 12px; color: #c6c5d4;
      background: rgba(189,194,255,0.08);
      padding: 4px 12px; border-radius: 9999px;
    }
    .detail-objectives { font-size: 15px; color: #908f9d; margin: 8px 0 0; }
    .detail-header-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .btn-secondary {
      display: flex; align-items: center; gap: 6px;
      background: #212653; color: #c6c5d4;
      padding: 10px 18px; border-radius: 10px;
      border: none; font-weight: 600; font-size: 14px;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-secondary:hover { background: #2a3160; color: #dfe0ff; }
    .btn-secondary .material-symbols-outlined { font-size: 18px; }

    .session-status {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 12px; border-radius: 9999px;
    }
    .session-status.completed { background: rgba(0,200,83,0.15); color: #69f0ae; }
    .session-status.draft { background: rgba(255,255,255,0.05); color: #908f9d; }
    .session-status.cancelled { background: rgba(255,138,128,0.15); color: #ff8a80; }
    .session-status.planned { background: rgba(0,104,237,0.15); color: #bdc2ff; }

    .detail-body { display: flex; gap: 32px; }
    .sections-nav { width: 220px; flex-shrink: 0; }
    .nav-title {
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: #908f9d; margin: 0 0 12px;
    }
    .nav-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
    .nav-item {
      display: flex; align-items: center; gap: 8px;
      background: none; border: none; color: #c6c5d4;
      padding: 8px 12px; border-radius: 8px;
      cursor: pointer; font-family: 'Hanken Grotesk', sans-serif;
      font-size: 13px; text-align: left; transition: all 0.15s;
    }
    .nav-item:hover { background: rgba(255,255,255,0.03); color: #dfe0ff; }
    .nav-badge {
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      padding: 3px 8px; border-radius: 9999px; color: white;
    }
    .nav-duration { margin-left: auto; font-size: 11px; color: #908f9d; }
    .nav-summary {
      background: #161b48; border-radius: 12px;
      padding: 12px 16px; border: 1px solid rgba(69,70,82,0.2);
    }
    .nav-summary-row {
      display: flex; justify-content: space-between;
      font-size: 13px; color: #908f9d; padding: 6px 0;
    }
    .nav-summary-row strong { color: #bdc2ff; }

    .detail-main { flex: 1; min-width: 0; }
    .sections-list { display: flex; flex-direction: column; gap: 16px; }

    .section-card {
      background: #161b48;
      border-radius: 16px;
      border-left: 4px solid #0068ed;
      padding: 20px;
      border: 1px solid rgba(69,70,82,0.2);
      border-left-width: 4px;
      transition: opacity 0.15s, border-color 0.15s;
    }
    .section-card.drag-over { border-color: #bdc2ff; opacity: 0.7; }
    .section-card:not(.drag-over):hover { border-color: rgba(69,70,82,0.4); }
    .section-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    }
    .section-handle { color: #3a3f6a; cursor: grab; display: flex; flex-shrink: 0; }
    .section-handle:active { cursor: grabbing; }
    .section-handle .material-symbols-outlined { font-size: 20px; }
    .section-title-group { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
    .section-badge {
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 10px; border-radius: 9999px; color: white; flex-shrink: 0;
    }
    .section-name-input {
      background: transparent; border: 1px solid transparent;
      color: #dfe0ff; font-size: 16px; font-weight: 700;
      font-family: 'Hanken Grotesk', sans-serif;
      padding: 4px 8px; border-radius: 6px; outline: none; flex: 1; min-width: 0;
    }
    .section-name-input:focus { border-color: rgba(189,194,255,0.3); background: rgba(0,0,0,0.2); }
    .section-header-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .duration-pill {
      font-size: 11px; font-weight: 700;
      padding: 4px 10px; border-radius: 9999px;
      background: rgba(0,104,237,0.15); color: #bdc2ff;
    }
    .btn-icon {
      background: none; border: none; color: #908f9d;
      cursor: pointer; padding: 4px; display: flex; border-radius: 4px;
      transition: all 0.15s;
    }
    .btn-icon:hover { color: #dfe0ff; background: rgba(255,255,255,0.05); }
    .btn-icon-danger:hover { color: #ff8a80; background: rgba(255,138,128,0.1); }
    .btn-icon .material-symbols-outlined { font-size: 18px; }

    .section-exercises {
      display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;
      min-height: 40px; transition: background 0.15s; border-radius: 8px;
    }
    .section-exercises.ex-drop-target { background: rgba(189,194,255,0.05); }
    .ex-item {
      display: flex; align-items: center; gap: 8px;
      background: rgba(0,0,0,0.2);
      border-radius: 10px; padding: 8px 10px;
      transition: box-shadow 0.15s, margin 0.15s;
      position: relative;
    }
    .ex-item.drag-over-top { box-shadow: 0 -2px 0 0 #bdc2ff; }
    .ex-item.drag-over-bottom { box-shadow: 0 2px 0 0 #bdc2ff; }
    .ex-drag-handle { color: #3a3f6a; cursor: grab; display: flex; flex-shrink: 0; }
    .ex-drag-handle:active { cursor: grabbing; }
    .ex-drag-handle .material-symbols-outlined { font-size: 16px; }
    .ex-order {
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(189,194,255,0.1);
      color: #bdc2ff;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .ex-info { flex: 1; min-width: 0; }
    .ex-name-row { display: flex; align-items: center; gap: 10px; }
    .ex-name { color: #dfe0ff; font-size: 14px; font-weight: 600; }
    .ex-duration { font-size: 12px; color: #908f9d; flex-shrink: 0; }
    .ex-notes {
      width: 100%; max-width: 400px; box-sizing: border-box;
      margin-top: 4px;
      padding: 6px 10px !important; font-size: 12px !important;
    }
    .ex-empty {
      text-align: center; color: #3a3f6a; font-size: 13px;
      padding: 24px; display: flex; align-items: center;
      justify-content: center; gap: 8px;
    }
    .ex-empty .material-symbols-outlined { font-size: 18px; }

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

    .add-section-btn {
      width: 100%; background: none;
      border: 2px dashed rgba(69,70,82,0.3);
      color: #908f9d; cursor: pointer; padding: 16px;
      border-radius: 16px; display: flex; align-items: center;
      gap: 8px; justify-content: center;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 15px; font-weight: 600;
      transition: all 0.2s;
    }
    .add-section-btn:hover:not(:disabled) { border-color: #bdc2ff; color: #bdc2ff; background: rgba(189,194,255,0.03); }
    .add-section-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .add-section-btn .material-symbols-outlined { font-size: 20px; }

    .field-input {
      background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 8px; padding: 10px 12px;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px; outline: none; box-sizing: border-box;
    }
    .field-input:focus { border-color: #bdc2ff; }

    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 20px;
    }
    .modal-card {
      background: #161b48; border-radius: 16px; padding: 32px;
      width: 100%; max-width: 480px; border: 1px solid rgba(69,70,82,0.3);
      max-height: 90vh; overflow-y: auto;
    }
    .confirm-card { max-width: 400px; text-align: center; padding: 40px 32px; }
    .confirm-icon {
      width: 56px; height: 56px; border-radius: 50%;
      background: rgba(255,138,128,0.12);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
    }
    .confirm-icon .material-symbols-outlined { font-size: 28px; color: #ff8a80; }
    .confirm-title {
      font-size: 20px; font-weight: 700; color: #dfe0ff;
      margin: 0 0 8px;
    }
    .confirm-message {
      font-size: 14px; color: #908f9d;
      margin: 0 0 28px; line-height: 1.5;
    }
    .confirm-actions { display: flex; gap: 12px; justify-content: center; }
    .btn-danger {
      padding: 10px 24px; border-radius: 8px; border: none;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px; font-weight: 600; cursor: pointer;
      background: #d32f2f; color: white;
      transition: opacity 0.15s;
    }
    .btn-danger:hover { opacity: 0.85; }

    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0 0 20px; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field span { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .field-textarea { resize: vertical; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel, .btn-save {
      padding: 10px 20px; border-radius: 8px; border: none;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-cancel { background: #212653; color: #c6c5d4; }
    .btn-save { background: #0068ed; color: white; }
    .btn-save:hover { opacity: 0.9; }

    .ex-tags-row { display: flex; gap: 4px; flex-wrap: wrap; margin: 4px 0 6px; }
    .mini-tag {
      font-size: 10px; font-weight: 700; color: #bdc2ff;
      background: rgba(0,104,237,0.12);
      padding: 2px 8px; border-radius: 9999px;
    }

    .section-add-ex { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .btn-select-ex {
      flex: 1; min-width: 160px;
      display: flex; align-items: center; gap: 6px;
      background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #908f9d; border-radius: 8px; padding: 10px 12px;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px; cursor: pointer; transition: all 0.15s;
      text-align: left;
    }
    .btn-select-ex:hover { border-color: #bdc2ff; color: #dfe0ff; }
    .btn-select-ex .material-symbols-outlined { font-size: 18px; }
    .add-ex-dur { width: 70px !important; }
    .add-ex-notes { flex: 1; min-width: 120px; }

    .picker-card { max-width: 560px; max-height: 85vh; display: flex; flex-direction: column; padding: 24px; }
    .picker-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .picker-header .modal-title { margin: 0; }
    .btn-close-modal {
      background: none; border: none; color: #908f9d; cursor: pointer; padding: 4px; border-radius: 6px;
    }
    .btn-close-modal:hover { color: #dfe0ff; background: rgba(255,255,255,0.05); }
    .btn-close-modal .material-symbols-outlined { font-size: 22px; }
    .picker-filters { margin-bottom: 16px; }
    .picker-search-wrap { position: relative; margin-bottom: 10px; }
    .picker-search { width: 100%; padding-left: 36px !important; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 18px; color: #3a3f6a; pointer-events: none; }
    .picker-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag-filter-btn {
      background: rgba(189,194,255,0.06); border: 1px solid transparent;
      color: #908f9d; padding: 4px 12px; border-radius: 9999px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .tag-filter-btn:hover { border-color: rgba(189,194,255,0.2); color: #c6c5d4; }
    .tag-filter-btn.active { background: rgba(0,104,237,0.15); color: #bdc2ff; border-color: rgba(0,104,237,0.3); }
    .picker-list { overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .picker-item {
      display: flex; align-items: center; gap: 12px;
      background: rgba(0,0,0,0.15); border-radius: 10px; padding: 12px;
      cursor: pointer; transition: all 0.15s;
    }
    .picker-item:hover { background: rgba(0,0,0,0.25); }
    .picker-item-info { flex: 1; min-width: 0; }
    .picker-item-name { font-size: 14px; font-weight: 600; color: #dfe0ff; display: block; margin-bottom: 4px; }
    .picker-item-tags { display: flex; gap: 4px; flex-wrap: wrap; }
    .picker-item-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
    .picker-dur { font-size: 12px; font-weight: 700; color: #bdc2ff; }
    .picker-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 32px; color: #3a3f6a; text-align: center;
    }
    .picker-empty .material-symbols-outlined { font-size: 32px; }


    @media (max-width: 768px) {
      .detail-page { padding: 16px !important; }
      .detail-header { flex-direction: column !important; gap: 16px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .detail-header-actions { width: 100% !important; }
      .detail-header-actions .btn-secondary { flex: 1 !important; justify-content: center !important; }
      .detail-body { flex-direction: column !important; gap: 16px !important; }
      .sections-nav { width: 100% !important; }
      .nav-list { flex-direction: row !important; flex-wrap: wrap !important; }
      .nav-item { flex: 1 !important; min-width: 120px !important; }
      .section-header { flex-wrap: wrap !important; gap: 8px !important; }
      .section-title-group { min-width: 0 !important; flex-wrap: wrap !important; }
      .section-name-input { width: 100% !important; }
      .section-header-actions { width: 100% !important; justify-content: flex-end !important; }
      .section-add-ex { flex-direction: column !important; align-items: stretch !important; }
      .btn-select-ex { width: 100% !important; }
      .add-ex-dur { width: 100% !important; }
      .add-ex-notes { width: 100% !important; }
      .modal-card { margin: 10px !important; padding: 20px !important; }
      .field-row { flex-direction: column !important; }
      .picker-card { margin: 10px !important; max-height: 90vh !important; }
    }
    @media (max-width: 480px) {
      .detail-page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
      .ex-item { flex-wrap: wrap !important; }
      .ex-duration { margin-left: auto !important; }
      .ex-notes { max-width: 100% !important; }
    }
  `]
})
export class SessionDetailComponent implements OnInit {
  private data = inject(DataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private notification = inject(NotificationService);

  session: TrainingSession | null = null;
  sections: SessionSection[] = [];
  sectionExercises: Record<string, SessionExercise[]> = {};
  exercises: Exercise[] = [];
  teams: Team[] = [];
  exerciseNames: Record<string, string> = {};
  loading = true;

  showEditForm = false;
  formTitle = '';
  formTeam = '';
  formDate = '';
  formStart = '16:00';
  formEnd = '17:30';
  formLocation = '';
  formObjectives = '';

  addExExerciseId = '';
  addExDuration = 10;
  addExNotes = '';

  savingSection = false;
  addingExercise = false;

  showExercisePicker = false;
  pickerSearch = '';
  pickerTag = '';
  pickerTargetSection: SessionSection | null = null;



  // Confirm modal state
  showConfirm = false;
  confirmTitle = '';
  confirmMessage = '';
  private confirmAction: (() => Promise<void>) | null = null;

  dragOverSectionIdx = -1;
  dragExTargetSection = '';
  dragExSourceSection = '';
  dragExId = '';
  dragOverExIdx = -1;
  dragExPosition: 'before' | 'after' = 'after';

  sectionColors = ['#0068ed', '#00c853', '#ff9100', '#e040fb', '#00bcd4', '#ff6d00'];

  get teamName(): string {
    if (!this.session) return '';
    const team = this.teams.find(t => t.id === this.session!.team_id);
    return team?.name || '';
  }

  get totalExercises(): number {
    return Object.values(this.sectionExercises).reduce((a, b) => a + b.length, 0);
  }

  get totalDuration(): number {
    return this.sections.reduce((a, sec) => a + this.getSectionDuration(sec.id), 0);
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'completed': return 'Completado';
      case 'draft': return 'Borrador';
      case 'cancelled': return 'Cancelado';
      default: return 'Programado';
    }
  }

  async ngOnInit() {
    while (!this.data.currentClub()) {
      await new Promise(r => setTimeout(r, 50));
    }
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }
    await this.load(id);
    this.cdr.detectChanges();
  }

  async load(sessionId: string) {
    this.loading = true;
    try {
      this.teams = await this.data.getTeams();
      this.exercises = await this.data.getExercises();
      this.exercises.forEach(e => this.exerciseNames[e.id] = e.name);

      const sessions = await this.data.getSessions();
      this.session = sessions.find(s => s.id === sessionId) || null;

      if (this.session) {
        this.sections = await this.data.getSections(sessionId);
        const allEx = await this.data.getSessionExercises(sessionId);
        this.sectionExercises = {};
        for (const sec of this.sections) {
          this.sectionExercises[sec.id] = allEx.filter(e => e.section_id === sec.id);
        }
      }
    } catch (e) {
      this.notification.show(e instanceof Error ? e.message : String(e));
    }
    this.loading = false;
  }

  protected getExercise(id: string): Exercise | undefined {
    return this.exercises.find(e => e.id === id);
  }

  protected getExerciseTags(id: string): string[] {
    return this.getExercise(id)?.tags || [];
  }

  protected escHtml(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  private async urlToDataUrl(url: string): Promise<string> {
    try {
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) return '';
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }

  protected collectAllTags(): string[] {
    const set = new Set<string>();
    for (const ex of this.exercises) {
      for (const tag of ex.tags || []) set.add(tag);
    }
    return Array.from(set).sort();
  }

  get filteredPickerExercises(): Exercise[] {
    let list = this.exercises;
    const q = this.pickerSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(e => e.name.toLowerCase().includes(q) || (e.tags || []).some(t => t.toLowerCase().includes(q)));
    }
    if (this.pickerTag) {
      list = list.filter(e => (e.tags || []).includes(this.pickerTag));
    }
    return list;
  }

  async exportPDF() {
    if (!this.session) return;

    const html2canvas = (await import('html2canvas')).default;
    const { default: jsPDF } = await import('jspdf');

    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:0;top:0;width:800px;background:#fff;font-family:system-ui,sans-serif;z-index:-1;';

    const sectionColors = ['#0068ed', '#00c853', '#ff9100', '#e040fb', '#00bcd4', '#ff6d00'];

    const dateStr = this.formatDate(this.session.date);
    const timeStr = `${this.session.start_time.slice(0,5)} - ${this.session.end_time.slice(0,5)}`;
    const team = this.teams.find(t => t.id === this.session!.team_id)?.name || '';

    const diagramCache = new Map<string, string>();
    for (const ex of this.exercises) {
      const diagrams = ex.diagrams || [];
      const url = diagrams.length > 0 ? diagrams[0].url : (ex.diagram_url || '');
      if (url && !diagramCache.has(url)) {
        const dataUrl = await this.urlToDataUrl(url);
        diagramCache.set(url, dataUrl);
      }
    }

    const E = this.escHtml.bind(this);
    const img = (url: string) => {
      const dataUrl = diagramCache.get(url);
      return dataUrl
        ? `<img src="${dataUrl}" alt="" style="max-width:100%;max-height:130px;object-fit:contain;display:block;" />`
        : `<span style="font-size:11px;color:#999;">[Diagrama]</span>`;
    };

    let html = '';
    html += `<div style="padding:24px 28px;color:#1a1a2e;font-size:14px;line-height:1.5;">`;
    html += `<div style="border-bottom:3px solid #0068ed;padding-bottom:18px;margin-bottom:24px;">`;
    html += `<h1 style="font-size:28px;font-weight:800;color:#111;margin:0 0 10px;letter-spacing:-0.02em;">${E(this.session.title)}</h1>`;
    html += `<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#666;">`;
    html += `<span>${E(dateStr)}</span>`;
    html += `<span>${E(timeStr)}</span>`;
    if (team) html += `<span>${E(team)}</span>`;
    if (this.session.location) html += `<span>${E(this.session.location)}</span>`;
    html += `</div>`;
    if (this.session.objectives) {
      html += `<p style="font-size:13px;color:#444;margin:12px 0 0;line-height:1.5;"><strong>Objetivos:</strong> ${E(this.session.objectives)}</p>`;
    }
    html += `</div>`;

    for (let si = 0; si < this.sections.length; si++) {
      const sec = this.sections[si];
      const color = sectionColors[si % sectionColors.length];
      const dur = this.getSectionDuration(sec.id);
      const exs = this.sectionExercises[sec.id] || [];

      html += `<div style="margin-bottom:22px;">`;
      html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">`;
      html += `<span style="display:inline-block;background:${color};color:white;padding:4px 14px;border-radius:9999px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">${E(sec.name)}</span>`;
      html += `<span style="font-size:12px;color:#888;">${dur} min</span>`;
      html += `</div>`;

      if (exs.length === 0) {
        html += `<div style="border:1px dashed #ddd;border-radius:8px;padding:16px;text-align:center;color:#aaa;font-size:13px;">Sin ejercicios</div>`;
      } else {
        for (const se of exs) {
          const ex = this.getExercise(se.exercise_id);
          const exName = ex?.name || 'Ejercicio';
          const exDesc = ex?.description || '';
          const exObjectives = ex?.objectives || '';
          const diagrams = ex?.diagrams || [];
          const diagramUrl = diagrams.length > 0 ? diagrams[0].url : (ex?.diagram_url || '');
          const notes = se.notes || '';
          const exDur = se.duration_minutes;

          html += `<div style="border:1px solid #e8e8f0;border-radius:10px;margin-bottom:10px;overflow:hidden;background:#fafaff;">`;

          if (diagramUrl && diagramCache.get(diagramUrl)) {
            html += `<div style="display:flex;min-height:100px;">`;
            html += `<div style="width:33%;min-height:100px;background:#f0f0f8;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;border-right:1px solid #e8e8f0;">`;
            html += img(diagramUrl);
            html += `</div>`;
            html += `<div style="width:67%;padding:14px 16px;box-sizing:border-box;">`;
          } else {
            html += `<div style="padding:14px 16px;">`;
          }

          html += `<h3 style="margin:0 0 4px;font-size:15px;font-weight:700;color:#1a1a2e;">${E(exName)}</h3>`;
          html += `<div style="font-size:12px;color:#888;margin-bottom:6px;">`;
          html += `<span>${exDur} min</span>`;
          html += `</div>`;
          if (exDesc) html += `<p style="margin:0 0 4px;font-size:12px;color:#444;line-height:1.5;">${E(exDesc)}</p>`;
          if (exObjectives) html += `<p style="margin:0 0 4px;font-size:11px;color:#666;line-height:1.4;"><strong>Objetivos:</strong> ${E(exObjectives)}</p>`;
          if (notes) html += `<p style="margin:0 0 2px;font-size:11px;color:#888;line-height:1.4;font-style:italic;">Notas: ${E(notes)}</p>`;

          html += `</div>`;
          if (diagramUrl && diagramCache.get(diagramUrl)) html += `</div>`;
          html += `</div>`;
        }
      }

      html += `</div>`;
    }

    const footerDate = new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' });
    html += `<div style="border-top:1px solid #e8e8f0;padding-top:12px;margin-top:8px;font-size:11px;color:#aaa;text-align:center;">Generado por Basket Coach - ${footerDate}</div>`;
    html += `</div>`;

    el.innerHTML = html;
    document.body.appendChild(el);

    try {
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(el, {
        scale: 1,
        logging: false,
      });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas vacío — html2canvas no pudo renderizar');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      const imgAspect = canvas.width / canvas.height;
      const pdfW = usableW;
      const pdfH = pdfW / imgAspect;

      const ratio = canvas.width / pdfW;
      let srcY = 0;
      let pageNum = 0;

      while (srcY < canvas.height - 2) {
        const remainingPx = canvas.height - srcY;
        const slicePx = Math.min(remainingPx, Math.round(usableH * ratio));
        if (slicePx < 20) break;

        if (pageNum > 0) doc.addPage();

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = slicePx;
        const ctx = pageCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92);

        doc.addImage(pageImgData, 'JPEG', margin, margin, pdfW, slicePx / ratio);

        srcY += slicePx;
        pageNum++;
      }

      const safeName = this.session.title.replace(/[/\\:*?"<>|]/g, '_');
      doc.save(`${safeName}.pdf`);
    } catch (err) {
      this.notification.show(err instanceof Error ? err.message : String(err));
    } finally {
      document.body.removeChild(el);
    }
  }

  protected formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ── Exercise Picker Modal ──

  openExercisePicker(sec: SessionSection) {
    this.pickerTargetSection = sec;
    this.pickerSearch = '';
    this.pickerTag = '';
    this.showExercisePicker = true;
  }

  selectPickerExercise(ex: Exercise) {
    this.addExExerciseId = ex.id;
    this.addExDuration = ex.duration_minutes || 10;
    this.addExNotes = '';
    this.showExercisePicker = false;
    this.cdr.detectChanges();
  }  goBack() {
    this.router.navigate(['/sessions']);
  }

  scrollToSection(index: number) {
    const el = document.getElementById('section-' + index);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  editSession() {
    if (!this.session) return;
    this.formTitle = this.session.title;
    this.formTeam = this.session.team_id;
    this.formDate = this.session.date;
    this.formStart = this.session.start_time;
    this.formEnd = this.session.end_time;
    this.formLocation = this.session.location || '';
    this.formObjectives = this.session.objectives || '';
    this.showEditForm = true;
  }

  async saveEdit() {
    if (!this.session || !this.formTitle.trim() || !this.formDate) return;
    await this.data.updateSession(this.session.id, {
      title: this.formTitle.trim(),
      team_id: this.formTeam,
      date: this.formDate,
      start_time: this.formStart,
      end_time: this.formEnd,
      location: this.formLocation.trim() || null,
      objectives: this.formObjectives.trim() || null,
    });
    this.session.title = this.formTitle.trim();
    this.session.objectives = this.formObjectives.trim() || null;
    this.showEditForm = false;
    await this.load(this.session.id);
    this.cdr.detectChanges();
  }

  getSectionExercises(sectionId: string): SessionExercise[] {
    return this.sectionExercises[sectionId] || [];
  }

  getSectionDuration(sectionId: string): number {
    return (this.sectionExercises[sectionId] || []).reduce((a, b) => a + b.duration_minutes, 0);
  }

  async addSection() {
    if (!this.session || this.savingSection) return;
    this.savingSection = true;
    try {
      const order = this.sections.length + 1;
      const sec = await this.data.createSection({ session_id: this.session.id, name: 'Nueva Sección', sort_order: order });
      if (sec) {
        this.sections.push(sec);
        this.sectionExercises[sec.id] = [];
        this.cdr.detectChanges();
      }
    } finally {
      this.savingSection = false;
      this.cdr.detectChanges();
    }
  }

  promptRemoveSection(sec: SessionSection) {
    this.confirmTitle = 'Eliminar sección';
    this.confirmMessage = `¿Estás seguro de eliminar la sección "${sec.name}"? Los ejercicios que contiene también se eliminarán.`;
    this.confirmAction = async () => {
      await this.data.deleteSection(sec.id);
      this.sections = this.sections.filter(s => s.id !== sec.id);
      delete this.sectionExercises[sec.id];
      await this.updateSectionOrders();
      this.cdr.detectChanges();
    };
    this.showConfirm = true;
  }

  async updateSectionName(sec: SessionSection) {
    await this.data.updateSection(sec.id, { name: sec.name });
  }

  async moveSection(sec: SessionSection, dir: number) {
    const idx = this.sections.indexOf(sec);
    const target = idx + dir;
    if (target < 0 || target >= this.sections.length) return;
    this.sections[idx] = this.sections[target];
    this.sections[target] = sec;
    await this.updateSectionOrders();
  }

  promptRemoveEx(se: SessionExercise) {
    const exName = this.exerciseNames[se.exercise_id] || 'este ejercicio';
    this.confirmTitle = 'Quitar ejercicio';
    this.confirmMessage = `¿Estás seguro de quitar "${exName}" de la sesión?`;
    this.confirmAction = async () => {
      await this.data.removeSessionExercise(se.id);
      for (const key of Object.keys(this.sectionExercises)) {
        this.sectionExercises[key] = this.sectionExercises[key].filter(x => x.id !== se.id);
      }
      await this.persistExerciseOrders(se.section_id!);
      this.cdr.detectChanges();
    };
    this.showConfirm = true;
  }

  cancelConfirm() {
    this.showConfirm = false;
    this.confirmAction = null;
  }

  async executeConfirm() {
    if (!this.confirmAction) return;
    this.showConfirm = false;
    const action = this.confirmAction;
    this.confirmAction = null;
    await action();
  }

  async addExerciseToSection(sec: SessionSection) {
    if (!this.addExExerciseId || !this.session || this.addingExercise) return;
    this.addingExercise = true;
    try {
      const exs = this.sectionExercises[sec.id] || [];
      const newSe = await this.data.addSessionExercise({
        session_id: this.session.id,
        section_id: sec.id,
        exercise_id: this.addExExerciseId,
        order: exs.length + 1,
        duration_minutes: this.addExDuration,
        notes: this.addExNotes || null,
      });
      if (newSe) {
        this.sectionExercises[sec.id] = [...exs, newSe];
        this.addExExerciseId = '';
        this.addExNotes = '';
        this.addExDuration = 10;
        this.cdr.detectChanges();
      }
    } finally {
      this.addingExercise = false;
      this.cdr.detectChanges();
    }
  }

  async updateExNotes(se: SessionExercise) {
    await this.data.updateSessionExercise(se.id, { notes: se.notes });
  }

  // Section drag & drop
  onSectionDragStart(e: DragEvent, idx: number) {
    e.dataTransfer?.setData('text/plain', String(idx));
    e.dataTransfer!.effectAllowed = 'move';
    this.dragOverSectionIdx = -1;
  }

  onSectionDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    this.dragOverSectionIdx = idx;
  }

  onSectionDragEnd() {
    this.dragOverSectionIdx = -1;
  }

  async onSectionDrop(e: DragEvent, targetIdx: number) {
    e.preventDefault();
    this.dragOverSectionIdx = -1;
    const srcIdx = parseInt(e.dataTransfer?.getData('text/plain') || '', 10);
    if (isNaN(srcIdx) || srcIdx === targetIdx) return;

    const [moved] = this.sections.splice(srcIdx, 1);
    this.sections.splice(targetIdx, 0, moved);
    await this.updateSectionOrders();
  }

  async updateSectionOrders() {
    for (let i = 0; i < this.sections.length; i++) {
      await this.data.updateSection(this.sections[i].id, { sort_order: i + 1 });
      this.sections[i].sort_order = i + 1;
    }
    this.cdr.detectChanges();
  }

  // Exercise drag & drop
  onExDragStart(e: DragEvent, se: SessionExercise, sectionId: string) {
    e.dataTransfer?.setData('text/plain', JSON.stringify({ id: se.id, sectionId }));
    e.dataTransfer!.effectAllowed = 'move';
    this.dragExSourceSection = sectionId;
    this.dragExId = se.id;
    this.dragExTargetSection = '';
    this.dragOverExIdx = -1;
  }

  onExDragOver(e: DragEvent, sectionId: string) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    this.dragExTargetSection = sectionId;
  }

  onExDragOverItem(e: DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    this.dragOverExIdx = idx;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    this.dragExPosition = e.clientY < mid ? 'before' : 'after';
  }

  async onExDrop(e: DragEvent, targetSectionId: string) {
    e.preventDefault();
    this.dragExTargetSection = '';
    this.dragOverExIdx = -1;
    const raw = e.dataTransfer?.getData('text/plain');
    if (!raw) return;
    const { id: exId, sectionId: srcSectionId } = JSON.parse(raw);
    if (srcSectionId === targetSectionId) {
      await this.reorderExercisesInSection(targetSectionId, exId);
    } else {
      await this.moveExerciseBetweenSections(exId, srcSectionId, targetSectionId);
    }
  }

  async onExDropOnItem(e: DragEvent, targetSectionId: string, targetIdx: number) {
    e.preventDefault();
    this.dragExTargetSection = '';
    this.dragOverExIdx = -1;
    const raw = e.dataTransfer?.getData('text/plain');
    if (!raw) return;
    const { id: exId, sectionId: srcSectionId } = JSON.parse(raw);
    if (srcSectionId === targetSectionId) {
      await this.reorderExercisesInSection(targetSectionId, exId, targetIdx);
    } else {
      await this.moveExerciseBetweenSections(exId, srcSectionId, targetSectionId, targetIdx);
    }
  }

  async reorderExercisesInSection(sectionId: string, exId: string, targetIdx?: number) {
    const exs = [...(this.sectionExercises[sectionId] || [])];
    const srcIdx = exs.findIndex(e => e.id === exId);
    if (srcIdx === -1) return;
    const [moved] = exs.splice(srcIdx, 1);
    const insertIdx = targetIdx !== undefined ? (targetIdx > srcIdx ? targetIdx - 1 : targetIdx) : exs.length;
    exs.splice(insertIdx, 0, moved);
    this.sectionExercises[sectionId] = exs;
    await this.persistExerciseOrders(sectionId);
  }

  async moveExerciseBetweenSections(exId: string, srcSectionId: string, targetSectionId: string, targetIdx?: number) {
    const se = this.sectionExercises[srcSectionId]?.find(e => e.id === exId);
    if (!se) return;
    this.sectionExercises[srcSectionId] = (this.sectionExercises[srcSectionId] || []).filter(e => e.id !== exId);
    const targetExs = [...(this.sectionExercises[targetSectionId] || [])];
    const insertIdx = targetIdx !== undefined ? Math.min(targetIdx, targetExs.length) : targetExs.length;
    targetExs.splice(insertIdx, 0, { ...se, section_id: targetSectionId });
    this.sectionExercises[targetSectionId] = targetExs;
    await this.data.updateSessionExercise(exId, { section_id: targetSectionId });
    await this.persistExerciseOrders(srcSectionId);
    await this.persistExerciseOrders(targetSectionId);
  }

  async persistExerciseOrders(sectionId: string) {
    const exs = this.sectionExercises[sectionId] || [];
    for (let i = 0; i < exs.length; i++) {
      await this.data.updateSessionExercise(exs[i].id, { order: i + 1 });
      exs[i].order = i + 1;
    }
    this.cdr.detectChanges();
  }
}
