# Testing y Calidad

Versión 1.0

---

## 1. Objetivo

Definir la estrategia de testing para garantizar la calidad del proyecto durante todo el desarrollo.

---

## 2. Pirámide de testing

```text
        ╱╲
       ╱ E2E ╲
      ╱────────╲
     ╱          ╲
    ╱ Integración ╲
   ╱────────────────╲
  ╱                  ╲
 ╱   Unit tests (80%)  ╲
╱────────────────────────╲
```

---

## 3. Tipos de prueba

### Unitarias

- Services
- Repositories (mockeando Supabase)
- Store / Signals
- Utility functions
- Validaciones

### Integración

- Service + Repository
- Componente + Store
- Flujos completos de feature

### E2E

- Registro completo de partido
- Navegación entre pantallas
- Exportación de datos

---

## 4. Herramientas

| Herramienta | Propósito |
|-------------|-----------|
| Vitest | Framework de testing (unitario + integración) |
| Playwright | E2E testing |
| c8 / istanbul | Cobertura de código |
| MSW | Mock de API (futuro) |

---

## 5. Configuración de Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/main.ts',
        'src/environments/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

---

## 6. Test de servicios

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PossessionService } from './possession.service';
import { MatchStore } from '../store/match.store';

describe('PossessionService', () => {
  let service: PossessionService;
  let store: MatchStore;
  let mockRepo: MockPossessionRepository;

  beforeEach(() => {
    store = new MatchStore();
    mockRepo = new MockPossessionRepository();
    service = new PossessionService(mockRepo as any, store);
  });

  describe('save', () => {
    it('should save a valid possession', async () => {
      store.setMatch({ id: 'match-1', /* ... */ } as any);

      const result = await service.save({
        matchId: 'match-1',
        side: 'own',
        attackTypeId: 'atk-1',
        resultId: 'res-1',
        timeBucket: '0-8',
        points: 2,
      } as any);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(store.possessions().length).toBe(1);
    });

    it('should reject invalid possessions', async () => {
      const result = await service.save({
        matchId: 'match-1',
        side: 'own',
        attackTypeId: '',
        resultId: 'res-1',
        timeBucket: '0-8',
        points: 2,
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(store.possessions().length).toBe(0);
    });

    it('should require an active match', async () => {
      const result = await service.save({
        matchId: '',
        side: 'own',
        attackTypeId: 'atk-1',
        resultId: 'res-1',
        timeBucket: '0-8',
        points: 2,
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No hay partido activo');
    });
  });

  describe('undoLast', () => {
    it('should remove the last possession', async () => {
      store.setMatch({ id: 'match-1' } as any);
      store.addPossession({
        id: 'pos-1',
        matchId: 'match-1',
        side: 'own',
        points: 2,
        number: 1,
      } as any);

      const result = await service.undoLast('match-1');

      expect(result.success).toBe(true);
      expect(store.possessions().length).toBe(0);
    });
  });
});

class MockPossessionRepository {
  private possessions: any[] = [];

  async findLastByMatch(matchId: string): Promise<any | null> {
    return this.possessions[this.possessions.length - 1] ?? null;
  }

  async create(data: any): Promise<any> {
    const possession = { id: `pos-${Date.now()}`, ...data };
    this.possessions.push(possession);
    return possession;
  }

  async softDelete(id: string): Promise<void> {
    this.possessions = this.possessions.filter(p => p.id !== id);
  }
}
```

---

## 7. Test de Store

```typescript
import { describe, it, expect } from 'vitest';
import { MatchStore } from './match.store';

describe('MatchStore', () => {
  let store: MatchStore;

  beforeEach(() => {
    store = new MatchStore();
  });

  it('should start with empty state', () => {
    expect(store.match()).toBeNull();
    expect(store.possessions()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('should set match', () => {
    const match = { id: '1', rival: 'Badajoz' } as any;
    store.setMatch(match);
    expect(store.match()).toEqual(match);
  });

  it('should add possession', () => {
    const possession = { id: '1', side: 'own', points: 2 } as any;
    store.addPossession(possession);
    expect(store.possessions().length).toBe(1);
  });

  it('should compute score correctly', () => {
    store.addPossession({ id: '1', side: 'own', points: 2 } as any);
    store.addPossession({ id: '2', side: 'own', points: 3 } as any);
    store.addPossession({ id: '3', side: 'rival', points: 2 } as any);

    expect(store.score().own).toBe(5);
    expect(store.score().rival).toBe(2);
  });

  it('should compute PPP correctly', () => {
    store.addPossession({ id: '1', side: 'own', points: 2 } as any);
    store.addPossession({ id: '2', side: 'own', points: 3 } as any);
    store.addPossession({ id: '3', side: 'own', points: 0 } as any);

    expect(store.ppp()).toBeCloseTo(1.67, 2);
  });

  it('should undo last possession', () => {
    store.addPossession({ id: '1', side: 'own', points: 2 } as any);
    store.addPossession({ id: '2', side: 'own', points: 3 } as any);
    store.undoLastPossession();

    expect(store.possessions().length).toBe(1);
    expect(store.possessions()[0].id).toBe('1');
  });

  it('should reset to initial state', () => {
    store.setMatch({ id: '1' } as any);
    store.addPossession({ id: '1' } as any);
    store.setLoading(true);

    store.reset();

    expect(store.match()).toBeNull();
    expect(store.possessions()).toEqual([]);
    expect(store.loading()).toBe(false);
  });
});
```

---

## 8. Test de componentes

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { KpiCardComponent } from './kpi-card.component';

describe('KpiCardComponent', () => {
  it('should display label and value', async () => {
    await render(KpiCardComponent, {
      inputs: {
        label: 'PPP',
        value: 1.24,
      },
    });

    expect(screen.getByText('PPP')).toBeDefined();
    expect(screen.getByText('1.24')).toBeDefined();
  });

  it('should show trend arrow when trend is provided', async () => {
    await render(KpiCardComponent, {
      inputs: {
        label: 'PPP',
        value: 1.24,
        trend: 'up',
        trendValue: '+0.05',
      },
    });

    expect(screen.getByText('▲')).toBeDefined();
    expect(screen.getByText('+0.05')).toBeDefined();
  });

  it('should not show trend if not provided', async () => {
    const { container } = await render(KpiCardComponent, {
      inputs: {
        label: 'PPP',
        value: 1.24,
      },
    });

    expect(container.querySelector('.kpi-card__trend')).toBeNull();
  });
});
```

---

## 9. Test de integración

```typescript
import { describe, it, expect } from 'vitest';
import { MatchService } from './match.service';
import { MatchStore } from '../store/match.store';

describe('MatchService integration', () => {
  let service: MatchService;
  let store: MatchStore;

  beforeEach(() => {
    store = new MatchStore();
    // Usar repositorios mock
    service = new MatchService(
      new MockMatchRepository(),
      new MockPossessionRepository(),
      new MockSubstitutionRepository(),
      store
    );
  });

  it('should load match with possessions', async () => {
    const result = await service.loadMatch('match-1');

    expect(result.success).toBe(true);
    expect(store.match()).toBeDefined();
    expect(store.possessions().length).toBeGreaterThan(0);
    expect(store.loading()).toBe(false);
  });

  it('should return error for non-existent match', async () => {
    const result = await service.loadMatch('non-existent');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

---

## 10. Test E2E (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Registro de partido', () => {
  test('debe registrar un partido completo', async ({ page }) => {
    await page.goto('/matches/new');

    // Crear partido
    await page.fill('[data-testid="rival-input"]', 'Badajoz');
    await page.fill('[data-testid="date-input"]', '2026-03-15');
    await page.click('[data-testid="create-match"]');

    // Configurar quinteto inicial
    await page.click('[data-testid="player-4"]');
    await page.click('[data-testid="player-5"]');
    await page.click('[data-testid="player-7"]');
    await page.click('[data-testid="player-8"]');
    await page.click('[data-testid="player-12"]');
    await page.click('[data-testid="start-match"]');

    // Registrar posesiones
    await page.click('[data-testid="side-own"]');
    await page.click('[data-testid="attack-contraataque"]');
    await page.click('[data-testid="player-4"]');
    await page.click('[data-testid="time-0-8"]');
    await page.click('[data-testid="result-t2-plus"]');
    await page.click('[data-testid="save-possession"]');

    // Verificar que la posesión se registró
    await expect(page.locator('[data-testid="possession-list"]'))
      .toContainText('Q1-01');
  });
});
```

---

## 11. Cobertura mínima

| Módulo | Cobertura requerida |
|--------|---------------------|
| Services | 90% |
| Stores | 95% |
| Repositories | 80% |
| Components | 75% |
| Utils | 100% |
| **Global** | **80%** |

---

## 12. Estrategia por fase

### Fase 1-3 (MVP)

- Unit tests de servicios y stores
- Integración de flujos críticos
- 70% cobertura global

### Fase 4-6 (Estabilización)

- Tests de componentes
- Tests E2E de flujos principales
- 80% cobertura global

### Fase 7+ (Madurez)

- Tests E2E completos
- Tests de regresión automatizados
- 85%+ cobertura global

---

## 13. CI/CD

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test -- --coverage
      - run: npm run lint
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

---

## 14. Pruebas de regresión

Cada PR debe pasar:
1. `npm run lint` (sin errores)
2. `npm run test` (todos los tests pasan)
3. `npm run build` (build exitoso)
4. Cobertura no inferior a la rama principal

---

## Próximo documento

[17-seguridad.md](17-seguridad.md)
