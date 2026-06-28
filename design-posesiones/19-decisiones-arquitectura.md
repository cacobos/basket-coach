# Architecture Decision Records (ADR)

Versión 1.0

---

## ADR-001: Posesión como unidad de información

### Contexto

Necesitamos decidir cuál es la unidad fundamental de información en la aplicación.

### Decisión

La posesión será la unidad de información principal.

No el tiro, no el rebote, no la pérdida.

### Consecuencias

- Todas las estadísticas se calculan a partir de posesiones
- No hay tablas de estadísticas almacenadas
- Las acciones individuales (tiros, rebotes) son información derivada
- El modelo de datos es más simple
- Las consultas son más complejas pero más flexibles

### Alternativas consideradas

- **Modelo clásico por acciones**: Más fácil al principio, más rígido después
- **Modelo híbrido**: Inconsistencias entre posesiones y acciones

### Estado

Aceptada.

---

## ADR-002: Quinteto reconstruido dinámicamente

### Contexto

Necesitamos decidir cómo almacenar la información de qué jugadoras están en pista en cada posesión.

### Decisión

No almacenar el quinteto en cada posesión.

Almacenar únicamente:
- Quinteto inicial
- Sustituciones

El quinteto activo se reconstruye dinámicamente.

### Consecuencias

- Menos almacenamiento
- Sin inconsistencias
- Más complejidad en la reconstrucción
- Las sustituciones deben registrarse correctamente
- Posibilidad de reconstruir el quinteto para cualquier instante

### Alternativas consideradas

- **Almacenar quinteto en cada posesión**: Mucha redundancia, posibles inconsistencias
- **Almacenar solo cambios y calcular**: Elegida por coherencia

### Estado

Aceptada.

---

## ADR-003: Configuración dinámica en base de datos

### Contexto

Necesitamos decidir dónde almacenar los catálogos configurables (sistemas, tipos de ataque, resultados, etc.).

### Decisión

Todos los catálogos se almacenan en tablas de base de datos.

Nunca en código.

Cada equipo tiene sus propios catálogos.

### Consecuencias

- Los administradores pueden añadir/configurar sin desplegar
- Cada equipo se personaliza
- Mayor complejidad inicial
- Necesario un motor de caché
- Las consultas requieren joins con catálogos

### Alternativas consideradas

- **ENUMs en PostgreSQL**: Rígidos, requieren migraciones
- **Constantes en TypeScript**: Difícil de cambiar sin desplegar
- **Archivos de configuración**: Menos flexibles

### Estado

Aceptada.

---

## ADR-004: Angular Signals para estado

### Contexto

Necesitamos decidir qué tecnología usar para la gestión de estado en Angular.

### Decisión

Usar Angular Signals para toda la gestión de estado.

No usar NgRx, Akita, NGXS ni otras librerías.

### Consecuencias

- Menos dependencias externas
- API nativa de Angular
- Reactividad integrada
- Mejor rendimiento con OnPush
- Sin middleware complejo
- Menos boilerplate que NgRx

### Alternativas consideradas

- **NgRx**: Mucho boilerplate, sobreingeniería para este proyecto
- **Akita**: Buena opción pero dependencia externa
- **BehaviorSubjects + RxJS**: Válido, pero Signals es más moderno

### Estado

Aceptada.

---

## ADR-005: Arquitectura por capas

### Contexto

Necesitamos decidir la estructura de comunicación entre componentes y base de datos.

### Decisión

Arquitectura estricta por capas:

```text
Component → Store → Service → Repository → Supabase
```

Cada capa tiene una responsabilidad única.

### Consecuencias

- Separación clara de responsabilidades
- Testeable por capas
- Fácil cambiar de backend
- Más archivos que en una arquitectura plana
- Mayor consistencia entre desarrolladores

### Alternativas consideradas

- **Componentes accediendo directamente a Supabase**: Rápido inicialmente, insostenible después
- **Service directo a Supabase**: Mejor pero menos testeable

### Estado

Aceptada.

---

## ADR-006: Standalone Components

### Contexto

Necesitamos decidir el módulo de Angular a utilizar.

### Decisión

Todos los componentes serán Standalone Components.

No se usará NgModules.

### Consecuencias

- Menos archivos de configuración
- Lazy loading más simple
- Dependencias explícitas
- Compatibilidad con futuras versiones de Angular
- Eliminación de NgModules

### Alternativas consideradas

- **NgModule tradicional**: Más verboso, legacy
- **Híbrido**: Inconsistente

### Estado

Aceptada.

---

## ADR-007: Tiempo por rangos

### Contexto

Necesitamos decidir cómo almacenar la información temporal de las posesiones.

### Decisión

No almacenar segundos exactos.

Almacenar rangos: 0-8, 9-16, 17-24 segundos.

### Consecuencias

- Menos presión en la velocidad de captura
- Suficiente valor estadístico
- Evita errores por sincronización
- Análisis temporal válido
- No requiere sincronización con vídeo

### Alternativas consideradas

- **Segundos exactos**: Más preciso, pero difícil de capturar
- **Sin tiempo**: Menos información analítica

### Estado

Aceptada.

---

## ADR-008: Supabase como backend

### Contexto

Necesitamos decidir la plataforma backend.

### Decisión

Usar Supabase como plataforma backend única.

Proporciona:
- PostgreSQL
- Autenticación
- Almacenamiento
- Edge Functions
- Realtime
- API REST automática

### Consecuencias

- Menos servicios que gestionar
- SQL directo sin ORM
- RLS para seguridad
- Tiempo real nativo
- Límites de plan gratuito
- Vendor lock-in (mitigado por capa repository)

### Alternativas consideradas

- **Firebase**: Similar pero NoSQL, menos adecuado para relaciones
- **Backend propio**: Más control, más trabajo
- **Parse**: Menos maduro

### Estado

Aceptada.

---

## ADR-009: Estadísticas siempre derivadas

### Contexto

Necesitamos decidir si almacenar estadísticas calculadas o calcularlas siempre a partir de datos fuente.

### Decisión

Nunca almacenar estadísticas calculadas.

Todas las métricas se calculan dinámicamente a partir de las posesiones.

### Consecuencias

- Única fuente de verdad
- Sin inconsistencias
- Consultas más lentas en grandes volúmenes
- Posible uso de vistas materializadas en el futuro
- Las estadísticas siempre están actualizadas

### Alternativas consideradas

- **Tablas de agregados**: Más rápidas, posibles inconsistencias
- **Caché con invalidación**: Más complejo

### Estado

Aceptada.

---

## ADR-010: Repositories sin lógica de negocio

### Contexto

Necesitamos decidir qué responsabilidad tienen los repositories.

### Decisión

Los repositories únicamente acceden a la base de datos.

No contienen:
- Validaciones
- Reglas de negocio
- Transformaciones
- Cálculos

### Consecuencias

- Repositories simples y testeables
- Lógica de negocio centralizada en servicios
- Fácil cambiar de backend
- Más archivos (repositorio + servicio)

### Alternativas consideradas

- **Repositories con lógica**: Más mezcla de responsabilidades
- **Sin repositories**: Menos testable

### Estado

Aceptada.

---

## ADR-011: Nombres en español (dominio)

### Contexto

Necesitamos decidir el idioma de la aplicación.

### Decisión

La interfaz de usuario estará en español.

Los nombres de tablas, columnas y código en inglés (convención técnica).

### Consecuencias

- UX en español para entrenadores hispanohablantes
- Código en inglés para mantener estándares
- Traducciones futuras con i18n
- Las URLs y API responden en español (para el usuario)

### Estado

Aceptada.

---

## ADR-012: Sin ENUMs en PostgreSQL para negocio

### Contexto

Necesitamos decidir si usar ENUMs de PostgreSQL para campos como tipo de ataque, sistema, etc.

### Decisión

No usar ENUMs de PostgreSQL para lógica de negocio configurable.

Usar tablas de catálogos con foreign keys.

### Consecuencias

- Los catálogos son dinámicos
- No requiere migraciones para añadir valores
- Las consultas requieren joins
- Más tablas en la base de datos

### Alternativas consideradas

- **ENUMs PostgreSQL**: Rígidos, requieren migraciones
- **CHECK constraints**: Similar a ENUMs
- **Texto libre**: Sin integridad referencial

### Estado

Aceptada.

---

## Próximo documento

[20-futuras-mejoras.md](20-futuras-mejoras.md)
