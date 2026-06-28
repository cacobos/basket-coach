# Especificación de Desarrollo para OpenCode

Versión 1.0

---

## 1. Objetivo

Este documento define las normas obligatorias que OpenCode deberá seguir durante el desarrollo de toda la aplicación.

No son recomendaciones.

Son restricciones arquitectónicas.

OpenCode nunca deberá proponer una solución que contradiga este documento.

---

## 2. Contexto del proyecto

La aplicación ya existe.

Está desarrollada con:
- Angular (última versión estable)
- Standalone Components
- Angular Signals
- Supabase
- PostgreSQL

El objetivo es convertirla en una plataforma profesional para entrenadores de baloncesto.

Los módulos actuales y futuros compartirán la misma arquitectura.

---

## 3. Filosofía general

Antes de escribir código, OpenCode deberá preguntarse:

> ¿Esta solución seguirá siendo válida cuando la aplicación tenga 500 equipos, 500.000 partidos y millones de posesiones?

Si la respuesta es no, deberá replantear la solución.

Siempre se priorizará:
- Escalabilidad
- Reutilización
- Mantenibilidad
- Claridad

Nunca la rapidez de implementación.

---

## 4. Reglas obligatorias

### 4.1 Arquitectura

Siempre utilizar arquitectura por dominios.

Nunca organizar el código por `components/`, `services/`, `models/` a nivel raíz.

Siempre:

```text
features/
shared/
core/
```

### 4.2 Angular

Obligatorio:
- Standalone Components
- Standalone Pipes
- Standalone Directives
- Signals
- Lazy Loading
- OnPush Change Detection

Nunca utilizar NgModules.

### 4.3 Estado

Toda la gestión de estado utilizará Signals.

No utilizar:
- NgRx
- Akita
- NGXS

Salvo autorización expresa.

### 4.4 Componentes

Separación estricta.

**Smart Components:**
- Responsables de cargar datos
- Se comunican con Stores
- Ubicación: `features/*/pages/`

**Presentational Components:**
- Responsables únicamente de mostrar información
- Nunca accederán a Supabase
- Nunca llamarán servicios
- Reciben datos mediante @Input
- Emiten eventos mediante @Output
- Ubicación: `shared/components/` o `features/*/components/`

### 4.5 Comunicación

Siempre:

```text
Component → Store → Service → Repository → Supabase
```

Nunca:

```text
Component → Supabase
```

### 4.6 Repositories

Los repositories únicamente accederán a la base de datos.

No contendrán:
- validaciones
- reglas
- cálculos
- transformación de datos de negocio

### 4.7 Services

Toda la lógica deberá implementarse aquí.

Ejemplos:
- Validaciones
- Cálculo del quinteto
- Numeración de posesiones
- Estadísticas
- Reglas de captura

### 4.8 Configuración

Nunca escribir listas fijas en el código.

**Incorrecto:**

```typescript
const attackTypes = ['Contraataque', 'Transición', 'Estático'];
```

**Correcto:**

```typescript
configurationService.getAttackTypes();
```

Toda la configuración procederá de la base de datos.

### 4.9 Formularios

Nunca crear formularios rígidos.

Siempre deberán construirse utilizando el Motor de Configuración.

Los campos visibles dependerán de la configuración del equipo.

### 4.10 Modelo de datos

La tabla principal será `possessions`.

Nunca almacenar:
- estadísticas
- porcentajes
- quintetos
- rankings

Todo deberá calcularse.

### 4.11 Cambios

Nunca guardar el quinteto completo en cada posesión.

Solo:
- quinteto inicial
- sustituciones

El quinteto deberá reconstruirse dinámicamente.

### 4.12 Rendimiento

Evitar:
- consultas repetidas
- renderizados innecesarios
- cargas duplicadas

Utilizar:
- caché
- Signals
- trackBy
- computed()
- memoización cuando proceda

### 4.13 Catálogos

Todos los catálogos serán dinámicos.

Ejemplos:
- sistemas
- tags
- resultados
- tipos de ataque
- tipos de defensa

Nunca utilizar ENUM de PostgreSQL para lógica de negocio.

### 4.14 Código

Priorizar:
- funciones pequeñas
- nombres claros
- responsabilidad única

Evitar funciones de cientos de líneas.

### 4.15 Componentes reutilizables

Antes de crear un componente nuevo, comprobar si puede reutilizarse.

**Ejemplo:**

No crear: `MatchPlayerSelector`

Crear: `PlayerSelectorComponent`

Utilizable por toda la aplicación.

### 4.16 Interfaces

Toda entidad tendrá una interfaz TypeScript.

Nunca utilizar `any`.

### 4.17 Tipado

Utilizar tipado estricto.

No desactivar `strict` en tsconfig.json.

### 4.18 Errores

Nunca lanzar errores directamente a la interfaz.

Los servicios devolverán objetos de resultado.

```typescript
interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 4.19 SQL

Las consultas complejas deberán implementarse mediante:
- Views
- Functions
- RPC de Supabase

No construir SQL complejo desde Angular.

### 4.20 Seguridad

Toda validación crítica deberá existir también en PostgreSQL.

Nunca confiar únicamente en el cliente.

### 4.21 Auditoría

Las operaciones importantes deberán registrar:
- usuario
- fecha
- acción
- datos anteriores
- datos nuevos

### 4.22 Testing

Todo código nuevo deberá incluir pruebas.

Como mínimo:
- Unitarias
- Integración para flujos críticos

### 4.23 Documentación

Todo componente importante deberá incluir:
- descripción
- responsabilidades
- dependencias

---

## 5. Qué NO debe hacer OpenCode

Nunca:
- Duplicar lógica
- Hardcodear datos
- Acoplar Angular con Supabase
- Crear componentes gigantes
- Saltarse el Motor de Configuración
- Almacenar estadísticas calculadas
- Romper la arquitectura por dominios

---

## 6. Qué debe proponer OpenCode

Siempre que detecte una mejora arquitectónica deberá:
1. Explicar el problema
2. Proponer la solución
3. Indicar ventajas e inconvenientes
4. Esperar confirmación antes de realizar cambios disruptivos

---

## 7. Definición de calidad

Se considera que una funcionalidad está bien implementada cuando:
- Respeta toda la arquitectura
- Es reutilizable
- Es configurable
- Está documentada
- Está probada
- No genera deuda técnica
- Puede mantenerse durante años sin refactorizaciones importantes

---

## 8. Instrucciones específicas para el módulo de partidos

OpenCode deberá asumir que:
- La posesión es la unidad de información principal
- El tiempo se registra por rangos (0-8, 9-16 y 17-24 segundos)
- El quinteto se reconstruye mediante sustituciones
- Todos los catálogos son configurables
- El historial de posesiones es editable
- Todo cambio importante queda auditado

---

## 9. Instrucciones específicas para futuras funcionalidades

La implementación deberá dejar preparada la aplicación para incorporar sin cambios de arquitectura:
- Vídeo sincronizado
- IA
- Scouting rival
- Dashboards personalizados
- Constructor de métricas
- Compartición entre entrenadores
- Aplicación móvil
- Modo offline
- Sincronización diferida

---

## 10. Regla de oro

Antes de implementar cualquier funcionalidad, OpenCode deberá preguntarse:

> ¿Esta solución podrá reutilizarse en al menos otros dos módulos de la aplicación?

Si la respuesta es **sí**, deberá implementarse como un componente, servicio o motor reutilizable.

Si la respuesta es **no**, deberá justificarse por qué esa funcionalidad pertenece exclusivamente a ese dominio.

---

## 11. Convenciones de nombres

### Archivos

```
kebab-case para archivos
match-list.page.ts
possession-form.component.ts
match.service.ts
```

### Clases

```
PascalCase para clases
MatchListPage
PossessionFormComponent
MatchService
```

### Variables y métodos

```
camelCase para variables y métodos
getActiveLineup()
matchId
possessionCount
```

### Signals

```
nombreSignal para variables signal internas
readonly para señales expuestas
```

---

## 12. Estructura de commits

Cada commit deberá:
- Ser atómico (una única responsabilidad)
- Usar prefijo: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Incluir referencia al documento de especificación si aplica

Ejemplos:
```
feat: add possession registration form
fix: recalculate lineup after substitution
docs: update estadisticas.md with KPI definitions
```

---

## 13. Fin del documento

Este documento deberá considerarse la guía oficial de desarrollo del proyecto y tendrá prioridad sobre cualquier decisión de implementación que no haya sido aprobada explícitamente por el propietario de la aplicación.

---

## Próximo documento

[11-motor-video.md](11-motor-video.md)
