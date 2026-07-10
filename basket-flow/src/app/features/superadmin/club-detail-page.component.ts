import { Component, inject, signal } from '@angular/core';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, forkJoin, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { NotificationService } from '../../core/services/notification.service';

const ROLES = ['club_admin', 'team_admin', 'coach'] as const;

@Component({
  selector: 'app-sa-club-detail',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, FormsModule],
  template: `
    <button class="btn-back" (click)="router.navigate(['/superadmin/clubs'])">← Volver</button>
    <div *ngIf="vm$ | async as vm">
      <h1 class="sa-page-title">{{ vm.club?.name }}</h1>
      <div class="detail-grid">
        <section class="card">
          <h3>Información</h3>
          <p>Slug: {{ vm.club?.slug }}</p>
          <p>Descripción: {{ vm.club?.description || '—' }}</p>
          <p>Creado: {{ vm.club?.created_at?.slice(0,10) }}</p>
          <div class="toggle-row">
            <label class="toggle-label">
              <input type="checkbox" [checked]="vm.club?.family_can_upload_documents" (change)="toggleFamilyUpload(vm.club?.id, $event)" />
              <span class="toggle-slider"></span>
              Familias pueden subir documentos
            </label>
          </div>
        </section>
        <section class="card">
          <h3>Suscripción</h3>
          <div *ngIf="vm.plans.length > 0">
            <select class="field-input" [ngModel]="vm.selectedPlan" (ngModelChange)="updatePlan($event, vm)">
              <option *ngFor="let p of vm.plans" [value]="p.id">{{ p.name }} ({{ p.price_monthly }}€/mes)</option>
            </select>
          </div>
          <p *ngIf="vm.currentPlan">Plan actual: {{ vm.currentPlan }}</p>
        </section>
        <section class="card card-members">
          <h3>Miembros ({{ vm.members.length }})</h3>
          <div class="member-item" *ngFor="let m of vm.members">
            <span>{{ m.profiles?.full_name || m.user_id?.slice(0,8) }}</span>
            <select class="role-select" [ngModel]="m.role" (ngModelChange)="changeRole($event, m, vm)">
              <option *ngFor="let r of roles" [value]="r">{{ r }}</option>
            </select>
            <button class="btn-remove" (click)="removeMember(m, vm)">✕</button>
          </div>
          <div class="add-section" *ngIf="vm.nonMembers.length > 0">
            <h4>Añadir miembro</h4>
            <div class="add-row">
              <select class="field-input" [(ngModel)]="newMemberId">
                <option value="" disabled>Seleccionar usuario…</option>
                <option *ngFor="let u of vm.nonMembers" [value]="u.id">{{ u.email }} {{ u.full_name ? '— ' + u.full_name : '' }}</option>
              </select>
              <select class="field-input role-select-sm" [(ngModel)]="newMemberRole">
                <option *ngFor="let r of roles" [value]="r">{{ r }}</option>
              </select>
              <button class="btn-add" (click)="addMember(vm)">Añadir</button>
            </div>
          </div>
          <p class="empty-msg" *ngIf="vm.nonMembers.length === 0">No hay más usuarios disponibles.</p>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .sa-page-title { font-size: 32px; font-weight: 800; color: #dfe0ff; margin: 0 0 24px; }
    .btn-back { background: none; border: none; color: #bdc2ff; cursor: pointer; font-size: 14px; margin-bottom: 16px; padding: 0; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .card { background: #161b48; border-radius: 16px; padding: 24px; border: 1px solid rgba(69,70,82,0.2); }
    .card h3 { font-size: 16px; font-weight: 700; color: #dfe0ff; margin: 0 0 16px; }
    .card p { font-size: 14px; color: #c6c5d4; margin: 0 0 8px; }
    .card-members { grid-column: 1 / -1; }
    .field-input { background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff; border-radius: 8px; padding: 10px 12px; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none; width: 100%; box-sizing: border-box; }
    .member-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(69,70,82,0.1); font-size: 14px; color: #c6c5d4; }
    .member-item span:first-child { flex: 1; }
    .role-select { background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff; border-radius: 6px; padding: 4px 8px; font-size: 12px; font-family: 'Hanken Grotesk', sans-serif; cursor: pointer; }
    .role-select option { background: #161b48; }
    .btn-remove { background: none; border: none; color: #f44336; cursor: pointer; font-size: 14px; padding: 4px; opacity: 0.5; }
    .btn-remove:hover { opacity: 1; }
    .add-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(69,70,82,0.2); }
    .add-section h4 { font-size: 13px; font-weight: 700; color: #908f9d; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }
    .add-row { display: flex; gap: 8px; align-items: center; }
    .add-row .field-input { flex: 1; }
    .role-select-sm { width: 120px; }
    .btn-add { background: #0068ed; color: white; border: none; border-radius: 8px; padding: 10px 16px; font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
    .btn-add:hover { opacity: 0.9; }
    .empty-msg { font-size: 13px; color: #908f9d; margin: 12px 0 0; }
    .toggle-row { margin-top: 12px; }
    .toggle-label { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #c6c5d4; cursor: pointer; }
    .toggle-label input { display: none; }
    .toggle-slider {
      width: 36px; height: 20px; background: rgba(255,255,255,0.15); border-radius: 10px;
      position: relative; transition: background 0.2s; flex-shrink: 0;
    }
    .toggle-slider::after {
      content: ''; position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px; background: #dfe0ff; border-radius: 50%;
      transition: transform 0.2s;
    }
    .toggle-label input:checked + .toggle-slider { background: #0068ed; }
    .toggle-label input:checked + .toggle-slider::after { transform: translateX(16px); }
  `]
})
export class SuperadminClubDetailPage {
  protected router = inject(Router);
  private route = inject(ActivatedRoute);
  private supabase = inject(SupabaseService);
  private notification = inject(NotificationService);
  private refresh$ = new BehaviorSubject<void>(undefined);

  readonly roles = ROLES;
  readonly newMemberId = signal('');
  readonly newMemberRole = signal('coach');

  vm$ = this.refresh$.pipe(
    switchMap(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) return of(null);
      return forkJoin({
        club: from(this.supabase.client.from('clubs').select('*').eq('id', id).single()).pipe(map(r => r.data)),
        plans: from(this.supabase.client.from('subscription_plans').select('*').eq('is_active', true).order('sort_order')).pipe(map(r => (r.data as any[]) || [])),
        members: from(this.supabase.client.from('club_members').select('*, profiles(*)').eq('club_id', id)).pipe(map(r => (r.data as any[]) || [])),
        subscription: from(this.supabase.client.from('club_subscriptions').select('*, subscription_plans(name)').eq('club_id', id).maybeSingle()).pipe(map(r => r.data)),
        allProfiles: from(this.supabase.client.from('profiles').select('id, email, full_name').order('email')).pipe(map(r => (r.data as any[]) || [])),
      });
    }),
    map(result => {
      if (!result) return null;
      const sub = result.subscription as any;
      const memberIds = new Set(result.members.map(m => m.user_id));
      const nonMembers = result.allProfiles.filter(p => !memberIds.has(p.id));
      return {
        club: result.club,
        plans: result.plans,
        members: result.members,
        selectedPlan: sub?.plan_id || '',
        currentPlan: sub?.subscription_plans?.name || 'Free',
        nonMembers,
      };
    })
  );

  async updatePlan(selectedPlan: string, vm: any) {
    if (!vm?.club || !selectedPlan) return;
    const existing = await this.supabase.client
      .from('club_subscriptions')
      .select('id')
      .eq('club_id', vm.club.id)
      .maybeSingle();
    if (existing.data) {
      await this.supabase.client
        .from('club_subscriptions')
        .update({ plan_id: selectedPlan, updated_at: new Date().toISOString() })
        .eq('id', existing.data.id);
    } else {
      await this.supabase.client
        .from('club_subscriptions')
        .insert({ club_id: vm.club.id, plan_id: selectedPlan });
    }
    this.refresh$.next();
  }

  async addMember(vm: any) {
    const userId = this.newMemberId();
    const role = this.newMemberRole();
    if (!userId || !vm?.club) return;
    await this.supabase.client
      .from('club_members')
      .insert({ club_id: vm.club.id, user_id: userId, role });
    this.newMemberId.set('');
    this.refresh$.next();
  }

  async removeMember(member: any, vm: any) {
    if (!vm?.club) return;
    if (member.role === 'club_admin') {
      const adminCount = vm.members.filter((m: any) => m.role === 'club_admin').length;
      if (adminCount <= 1) {
        this.notification.show('Debe haber al menos un club_admin en el club');
        return;
      }
    }
    await this.supabase.client
      .from('club_members')
      .delete()
      .eq('id', member.id);
    this.refresh$.next();
  }

  async toggleFamilyUpload(clubId: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    await this.supabase.client.from('clubs').update({ family_can_upload_documents: checked }).eq('id', clubId);
    this.refresh$.next();
  }

  async changeRole(role: string, member: any, vm: any) {
    if (!vm?.club) return;
    if (member.role === 'club_admin' && role !== 'club_admin') {
      const adminCount = vm.members.filter((m: any) => m.role === 'club_admin').length;
      if (adminCount <= 1) {
        this.notification.show('Debe haber al menos un club_admin en el club');
        return;
      }
    }
    await this.supabase.client
      .from('club_members')
      .update({ role })
      .eq('id', member.id);
    this.refresh$.next();
  }
}
