import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';

@Injectable({ providedIn: 'root' })
export class MatchSeedService {
  private supabase = inject(SupabaseService);

  async seedMatch(clubId: string, teamId: string): Promise<{ matchId: string; error?: string }> {
    await this.supabase.client.rpc('seed_match_catalogs', { p_club_id: clubId });

    const [players, initTypes, attackTypes, results] = await Promise.all([
      this.supabase.client.from('players').select('id').eq('club_id', clubId).limit(12),
      this.supabase.client.from('catalog_init_types').select('id').eq('club_id', clubId),
      this.supabase.client.from('catalog_attack_types').select('id').eq('club_id', clubId),
      this.supabase.client.from('catalog_results').select('id, points').eq('club_id', clubId),
    ]);

    if (!players.data?.length) return { matchId: '', error: 'No hay jugadores en el club' };
    if (!initTypes.data?.length) return { matchId: '', error: 'No hay catálogos. Ejecuta seed_match_catalogs' };

    const playerIds = players.data.map(p => p.id);
    const initIds = initTypes.data.map(i => i.id);
    const attackIds = attackTypes.data!.map(a => a.id);
    const resultList = results.data!;

    const rivals = ['CB Molins', 'CB Santfeliuenc', 'FC Barcelona B', 'Joventut B', 'CB L\'Hospitalet'];
    const rival = rivals[Math.floor(Math.random() * rivals.length)];

    const { data: match, error: matchErr } = await this.supabase.client
      .from('matches')
      .insert({
        club_id: clubId,
        team_id: teamId,
        rival,
        competition: 'Liga Regular',
        round: String(Math.floor(Math.random() * 30) + 1),
        location: 'Pabellón Municipal',
        date: new Date().toISOString().slice(0, 10),
        status: 'finished',
        current_period: 4,
        score_own: 0,
        score_rival: 0,
      })
      .select()
      .single();

    if (matchErr || !match) return { matchId: '', error: matchErr?.message };
    const matchId = match.id;

    for (let i = 0; i < Math.min(10, playerIds.length); i++) {
      await this.supabase.client.from('match_squads').insert({
        match_id: matchId,
        player_id: playerIds[i],
        starter: i < 5,
      });
    }

    type Side = 'own' | 'rival';
    const sides: Side[] = ['own', 'rival'];
    let number = 0;

    for (const side of sides) {
      for (let period = 1; period <= 4; period++) {
        const count = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
          number++;
          const result = resultList[Math.floor(Math.random() * resultList.length)];
          const buckets: ('0-8' | '9-16' | '17-24')[] = ['0-8', '9-16', '17-24'];

          await this.supabase.client.from('possessions').insert({
            match_id: matchId,
            period,
            number,
            side,
            init_type_id: initIds[Math.floor(Math.random() * initIds.length)],
            attack_type_id: attackIds[Math.floor(Math.random() * attackIds.length)],
            result_id: result.id,
            points: result.points,
            time_bucket: buckets[Math.floor(Math.random() * buckets.length)],
            finisher_id: side === 'own' && result.points > 0
              ? playerIds[Math.floor(Math.random() * Math.min(5, playerIds.length))]
              : null,
          });
        }
      }
    }

    await this.supabase.client
      .from('matches')
      .update({
        score_own: (await this.supabase.client.rpc('get_match_stats', { p_match_id: matchId, p_side: 'own' })).data?.find((r: any) => r.metric === 'points')?.value ?? 0,
        score_rival: (await this.supabase.client.rpc('get_match_stats', { p_match_id: matchId, p_side: 'rival' })).data?.find((r: any) => r.metric === 'points')?.value ?? 0,
      })
      .eq('id', matchId);

    return { matchId };
  }
}
