# API, Servicios y Arquitectura Backend

Versión 1.0

---

## 1. Objetivo

Este documento define la arquitectura software que utilizará la aplicación para comunicar Angular con Supabase.

Su objetivo es separar completamente:
- Presentación
- Estado
- Lógica de negocio
- Acceso a datos

De esta forma cualquier cambio futuro (Firebase, API propia, PostgreSQL, etc.) podrá realizarse sin modificar la interfaz.

---

## 2. Principios

Toda operación seguirá siempre el mismo flujo:

```text
Componente → Store → Service → Repository → Supabase
```

Nunca un componente accederá directamente a Supabase.

---

## 3. Capas

### UI

Componentes Angular.

Únicamente muestran información.

Nunca contienen lógica de negocio.

### Store

Responsable del estado.

Utilizar Angular Signals.

Ejemplos:
- Partido activo
- Quinteto actual
- Posesión actual
- Convocatoria

### Services

Responsables de aplicar reglas de negocio.

Ejemplo:

Guardar una posesión.

Antes de guardar:
1. validar
2. completar información
3. reconstruir quinteto
4. generar número

### Repository

Únicamente realiza consultas a Supabase.

No contiene lógica.

---

## 4. Organización

```text
features/
  matches/
    services/
    repositories/
    store/
    models/
    pages/
    components/
```

---

## 5. Repositories

Habrá un repository por agregado.

### MatchRepository

Responsabilidades:
- crear partido
- actualizar partido
- eliminar partido
- obtener partido

### PossessionRepository

Responsabilidades:
- insertar posesión
- actualizar posesión
- eliminar (soft delete)
- obtener posesiones

### ConfigurationRepository

Responsable de todos los catálogos configurables:
- sistemas
- tags
- tipos de ataque
- resultados

### StatisticsRepository

Obtiene información agregada.

Nunca modifica datos.

### SubstitutionRepository

Responsabilidades:
- insertar cambio
- obtener cambios por partido
- eliminar cambio

### SquadRepository

Responsabilidades:
- gestionar convocatoria
- establecer quinteto inicial

---

## 6. Servicios

Los servicios contienen las reglas de negocio.

### MatchService

Funciones:
- startMatch
- finishMatch
- changePeriod
- closeMatch

### PossessionService

Funciones:
- createPossession
- validatePossession
- save
- edit
- delete
- undoLast

### LineupService

Responsable de reconstruir el quinteto.

Entradas:
- quinteto inicial
- cambios

Salida:
- Quinteto activo

### StatisticsService

Responsable de calcular:
- PPP
- Offensive Rating
- Defensive Rating
- estadísticas por jugadora
- estadísticas por sistema
- estadísticas por quinteto

### ConfigurationService

Expone todos los catálogos.

Ejemplo:
- getAttackTypes()
- getSystems()
- getResults()
- getTags()

Nunca consulta directamente la base desde un componente.

---

## 7. Interfaces TypeScript

### Match

```typescript
export interface Match {
  id: string;
  teamId: string;
  seasonId: string;
  competitionId?: string;
  rival: string;
  round?: string;
  location?: string;
  date: string;
  status: 'created' | 'in_progress' | 'finished' | 'closed';
  currentPeriod: number;
  scoreOwn: number;
  scoreRival: number;
  startTime?: string;
  endTime?: string;
}
```

### Possession

```typescript
export interface Possession {
  id: string;
  matchId: string;
  number: number;
  period: number;
  side: 'own' | 'rival';
  initTypeId: string;
  attackTypeId: string;
  systemId?: string;
  resultId: string;
  finisherId?: string;
  creatorId?: string;
  timeBucket: '0-8' | '9-16' | '17-24';
  points: number;
  notes?: string;
  tags?: string[];
  deleted?: boolean;
}
```

### Substitution

```typescript
export interface Substitution {
  id: string;
  matchId: string;
  playerOut: string;
  playerIn: string;
  period: number;
  orderInPeriod: number;
}
```

### SquadMember

```typescript
export interface SquadMember {
  id: string;
  matchId: string;
  playerId: string;
  starter: boolean;
}
```

### Player

```typescript
export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position?: string;
  active: boolean;
}
```

### Team

```typescript
export interface Team {
  id: string;
  name: string;
  category?: string;
  logoUrl?: string;
  active: boolean;
}
```

### Season

```typescript
export interface Season {
  id: string;
  teamId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
}
```

### Competition

```typescript
export interface Competition {
  id: string;
  name: string;
  teamId: string;
  seasonId: string;
}
```

---

## 8. Signals

Cada Store expondrá Signals de solo lectura.

```typescript
readonly match = signal<Match | null>(null);
readonly possessions = signal<Possession[]>([]);
readonly substitutions = signal<Substitution[]>([]);
readonly squad = signal<SquadMember[]>([]);
readonly lineup = signal<Player[]>([]);
readonly activeLineup = signal<Player[]>([]);
readonly score = signal({ own: 0, rival: 0 });
readonly loading = signal(false);
readonly error = signal<string | null>(null);
```

---

## 9. Métodos públicos

El resto de la aplicación nunca accederá directamente a los repositories.

Siempre utilizará servicios.

Ejemplos:
- matchService.startMatch(matchId)
- matchService.finishMatch(matchId)
- possessionService.save(data)
- possessionService.undoLast(matchId)
- statisticsService.getDashboard(matchId)
- statisticsService.getPlayerStats(playerId, seasonId)
- configurationService.getSystems()
- lineupService.getActiveLineup(matchId, period, possessionNumber)

---

## 10. Sincronización

Cada inserción en Supabase actualizará automáticamente los Signals.

```text
Guardar → Supabase → Respuesta → Actualizar Signal → Actualizar interfaz
```

Nunca refrescar la página.

---

## 11. Caché

Los catálogos deberán mantenerse en memoria.

Ejemplos:
- sistemas
- tags
- resultados
- tipos de ataque
- tipos de inicio

Solo volverán a descargarse cuando exista una modificación.

---

## 12. ServiceResult

Toda operación devolverá un objeto uniforme.

```typescript
export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
```

Nunca lanzar errores directamente a la interfaz.

---

## 13. Ejemplo de servicio completo

```typescript
import { Injectable, inject } from '@angular/core';
import { PossessionRepository } from '../repositories/possession.repository';
import { MatchStore } from '../store/match.store';
import { LineupService } from './lineup.service';
import type { Possession } from '../models/possession.model';
import type { ServiceResult } from '@shared/models/service-result.model';

@Injectable({ providedIn: 'root' })
export class PossessionService {
  private readonly repo = inject(PossessionRepository);
  private readonly store = inject(MatchStore);
  private readonly lineupService = inject(LineupService);

  async save(data: Omit<Possession, 'id' | 'number'>): Promise<ServiceResult<Possession>> {
    const error = this.validate(data);
    if (error) return { success: false, error };

    try {
      const matchId = this.store.match()?.id;
      if (!matchId) return { success: false, error: 'No hay partido activo' };

      const lastPossession = await this.repo.findLastByMatch(matchId);
      const number = (lastPossession?.number ?? 0) + 1;

      const possession = await this.repo.create({
        ...data,
        matchId,
        number,
      });

      this.store.addPossession(possession);

      const score = this.store.score();
      this.store.setScore({
        own: data.side === 'own' ? score.own + data.points : score.own,
        rival: data.side === 'rival' ? score.rival + data.points : score.rival,
      });

      return { success: true, data: possession };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async undoLast(matchId: string): Promise<ServiceResult<void>> {
    try {
      const last = await this.repo.findLastByMatch(matchId);
      if (!last) return { success: false, error: 'No hay posesiones que deshacer' };

      await this.repo.softDelete(last.id);
      this.store.removePossession(last.id);

      const score = this.store.score();
      this.store.setScore({
        own: last.side === 'own' ? Math.max(0, score.own - last.points) : score.own,
        rival: last.side === 'rival' ? Math.max(0, score.rival - last.points) : score.rival,
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  private validate(data: Omit<Possession, 'id' | 'number'>): string | null {
    if (!data.matchId) return 'Falta el partido';
    if (!data.side) return 'Falta el lado';
    if (!data.attackTypeId) return 'Falta el tipo de ataque';
    if (!data.resultId) return 'Falta el resultado';
    if (!data.timeBucket) return 'Falta el rango temporal';
    if (data.points < 0 || data.points > 4) return 'Puntos inválidos';
    return null;
  }
}
```

---

## 14. Transacciones

Las operaciones críticas utilizarán transacciones.

Ejemplos:
- Crear partido + convocatoria
- Registrar cambio
- Eliminar partido
- Duplicar partido

```typescript
async function createMatchWithSquad(data: CreateMatchData): Promise<ServiceResult<Match>> {
  const { data: match, error } = await supabase.rpc('create_match_with_squad', {
    match_data: data.match,
    squad_players: data.squad,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data: match };
}
```

---

## 15. Tiempo real

La arquitectura permitirá utilizar Realtime de Supabase.

Casos de uso:
- Dos entrenadores analizando el mismo partido
- Un ayudante registrando mientras otro revisa estadísticas
- Sincronización instantánea entre tablet y ordenador

```typescript
setupRealtimeSubscription(matchId: string): void {
  supabase
    .channel(`match:${matchId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'possessions', filter: `match_id=eq.${matchId}` },
      (payload) => {
        this.store.addPossession(payload.new as Possession);
      }
    )
    .subscribe();
}
```

---

## 16. Auditoría

Todas las modificaciones importantes quedarán registradas.

Ejemplo:
- Usuario
- Fecha
- Acción
- Valores anteriores
- Valores nuevos

---

## 17. Seguridad

Toda validación importante deberá realizarse también en la base de datos.

Nunca confiar únicamente en Angular.

Las políticas RLS de Supabase serán la última línea de defensa.

---

## 18. Testing

Los servicios deberán poder probarse sin acceder a Supabase.

Los repositories serán fácilmente mockeables.

```typescript
// Ejemplo de mock para tests
class MockPossessionRepository implements PossessionRepository {
  async create(data: any): Promise<any> {
    return { id: 'test-id', ...data };
  }
  // ...
}
```

---

## 19. Extensibilidad

El objetivo es que nuevos módulos reutilicen exactamente esta arquitectura.

Ejemplos:
- Entrenamientos
- Ejercicios
- Pizarra táctica
- IA
- Scouting

---

## 20. Decisiones definitivas

- Arquitectura por capas
- Repositories sin lógica
- Services con lógica
- Stores con Signals
- Componentes sin acceso a Supabase
- Toda comunicación desacoplada
- ServiceResult como respuesta estándar
- Caché de catálogos en memoria

---

## Próximo documento

[09-roadmap.md](09-roadmap.md)
