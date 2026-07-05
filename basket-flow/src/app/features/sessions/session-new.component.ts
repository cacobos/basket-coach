import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { SessionRepository } from '../../core/repositories/session.repository';

@Component({
  selector: 'app-session-new',
  standalone: true,
  template: '',
})
export class SessionNewComponent {
  constructor() {
    const data = inject(DataService);
    const sessionRepo = inject(SessionRepository);
    const router = inject(Router);
    (async () => {
      while (!data.currentClub()) {
        await new Promise(r => setTimeout(r, 50));
      }
      const clubId = data.currentClub()?.id;
      if (!clubId) {
        router.navigate(['/sessions'], { replaceUrl: true });
        return;
      }
      const teams = await data.getTeams();
      const session = await sessionRepo.create({
        club_id: clubId,
        team_id: teams[0]?.id || '',
        title: 'Nueva sesión',
        description: null,
        location: null,
        date: new Date().toISOString().slice(0, 10),
        start_time: '16:00',
        end_time: '17:30',
        status: 'draft',
        notes: null,
        objectives: null,
      });
      if (session) {
        router.navigate(['/sessions', session.id, 'builder'], { replaceUrl: true });
      } else {
        router.navigate(['/sessions'], { replaceUrl: true });
      }
    })();
  }
}
