import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { PermissionService, type Role, type Permission } from '../../core/services/permission.service';

@Component({
  selector: 'app-sa-permissions',
  standalone: true,
  imports: [NgFor],
  template: `
    <h1 class="sa-page-title">Permisos por Rol</h1>
    <p class="sa-page-sub">Configura qué puede hacer cada nivel de membresía en los clubs.</p>

    <div class="perm-table-wrap">
      <table class="perm-table">
        <thead>
          <tr>
            <th class="perm-col-label">Permiso</th>
            <th class="perm-col-role" *ngFor="let r of roles">
              <span class="role-badge role-{{ r }}">{{ r }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of allPermissions">
            <td class="perm-col-label">{{ getLabel(p) }}</td>
            <td class="perm-col-role" *ngFor="let r of roles">
              <label class="toggle-wrap">
                <input type="checkbox" class="toggle-input"
                  [checked]="isGranted(r, p)"
                  (change)="toggle(r, p, $event)" />
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .sa-page-title { font-size: 32px; font-weight: 800; color: #dfe0ff; margin: 0 0 8px; }
    .sa-page-sub { font-size: 14px; color: #908f9d; margin: 0 0 32px; }
    .perm-table-wrap { overflow-x: auto; }
    .perm-table { width: 100%; border-collapse: collapse; min-width: 500px; }
    .perm-table th, .perm-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid rgba(69,70,82,0.15); }
    .perm-table thead th { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #908f9d; padding-bottom: 16px; }
    .perm-col-label { color: #c6c5d4; font-size: 14px; min-width: 240px; }
    .perm-col-role { text-align: center; min-width: 100px; }
    .role-badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; }
    .role-club_admin { background: rgba(0,104,237,0.15); color: #b0c6ff; }
    .role-team_admin { background: rgba(105,240,174,0.1); color: #69f0ae; }
    .role-coach { background: rgba(255,255,255,0.05); color: #c6c5d4; }
    .toggle-wrap { display: inline-flex; align-items: center; cursor: pointer; position: relative; }
    .toggle-input { position: absolute; opacity: 0; width: 0; height: 0; }
    .toggle-track {
      width: 36px; height: 20px; border-radius: 9999px;
      background: #333768; transition: background 0.2s;
      position: relative; display: inline-block;
    }
    .toggle-input:checked + .toggle-track { background: #0068ed; }
    .toggle-thumb {
      position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #dfe0ff; transition: transform 0.2s;
    }
    .toggle-input:checked + .toggle-track .toggle-thumb { transform: translateX(16px); }
  `]
})
export class SuperadminPermissionsPage {
  private permService = inject(PermissionService);

  roles = this.permService.getRoles();
  allPermissions = this.permService.getAllPermissions();
  cache = this.permService.cache;

  getLabel(p: Permission): string {
    return this.permService.getPermissionLabel(p);
  }

  isGranted(role: Role, permission: Permission): boolean {
    return this.cache()[`${role}:${permission}`] ?? false;
  }

  async toggle(role: Role, permission: Permission, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    await this.permService.updatePermission(role, permission, checked);
  }
}
