# Roadmap de Desarrollo

Versión 1.0

---

## 1. Objetivo

Este documento define el orden recomendado de desarrollo de la aplicación.

El objetivo es construir una base sólida antes de implementar funcionalidades avanzadas.

Cada fase deberá finalizar con una versión completamente funcional y desplegable.

La prioridad será siempre:
1. Arquitectura
2. Flujo de trabajo
3. Funcionalidades
4. Optimización

Nunca al revés.

---

## 2. MVP

El objetivo del MVP no es tener muchas funcionalidades.

El objetivo es que un entrenador pueda analizar un partido completo de principio a fin.

El MVP deberá permitir:
- Gestión de equipos
- Gestión de jugadoras
- Configuración de catálogos
- Crear partido
- Convocatoria
- Quinteto inicial
- Registrar cambios
- Registrar posesiones ofensivas
- Registrar posesiones defensivas
- Consultar estadísticas básicas
- Editar posesiones
- Exportar datos

Cuando estas funcionalidades estén terminadas, la aplicación ya será utilizable.

---

## 3. Fase 1 - Infraestructura

### Objetivos

Crear toda la arquitectura del proyecto.

### Angular

- Standalone Components
- Signals
- Arquitectura por dominios
- Lazy Loading
- Shared Components

### Supabase

- Modelo de datos
- RLS
- Autenticación
- Repositories

### Configuración

- Motor de configuración
- Catálogos
- CRUD reutilizable

### Resultado esperado

Proyecto listo para crecer.

---

## 4. Fase 2 - Gestión del equipo

### Funcionalidades

- Equipos
- Jugadoras
- Convocatorias
- Temporadas
- Competiciones
- Rivales

### Resultado esperado

Toda la información previa al partido estará disponible.

---

## 5. Fase 3 - Registro del partido

Esta es la fase más importante.

### Funcionalidades

- Crear partido
- Quinteto inicial
- Cambios
- Marcador
- Periodos
- Historial
- Registro de posesiones
- Edición
- Eliminación lógica

### Criterio de aceptación

Debe poder registrarse un partido completo sin errores.

---

## 6. Fase 4 - Estadísticas

Una vez que existan datos suficientes.

### Implementar

- PPP
- Offensive Rating
- Defensive Rating
- Estadísticas por sistema
- Estadísticas por jugadora
- Estadísticas por quinteto
- Estadísticas por periodo

### Resultado

Primer dashboard funcional.

---

## 7. Fase 5 - Dashboards

### Dashboard Partido

- Marcador
- PPP
- Sistemas
- Ataques
- Quintetos

### Dashboard Temporada

- Evolución
- Comparativas
- Tendencias

### Dashboard Jugadora

- Producción
- Generación
- Historial

---

## 8. Fase 6 - Exportaciones

### Implementar

- PDF
- Excel
- CSV
- Imagen

Cada exportación respetará filtros y configuración del entrenador.

---

## 9. Fase 7 - Vídeo

### Funcionalidades

- Reproducir vídeo
- Avanzar / Retroceder
- Asociar posesiones a un instante del vídeo
- Abrir automáticamente el clip de una posesión

No será obligatorio para el MVP.

---

## 10. Fase 8 - Scouting

Nuevo módulo.

Permitirá registrar:
- Sistemas rivales
- Tendencias
- Jugadoras rivales
- Defensas
- Fortalezas
- Debilidades

Compartirá el mismo motor de captura.

---

## 11. Fase 9 - IA

### Funcionalidades

El usuario podrá preguntar:
- ¿Qué sistema es más eficiente?
- ¿Qué quinteto funciona mejor?
- ¿Cómo atacamos las zonas?
- ¿Quién genera más ventajas?
- ¿Qué ocurre tras rebote ofensivo?

La IA responderá utilizando exclusivamente los datos registrados.

---

## 12. Fase 10 - Compartición

### Permitir

- Compartir equipos
- Compartir entrenadores
- Compartir estadísticas
- Compartir configuraciones
- Compartir plantillas

---

## 13. Fase 11 - Comunidad

Crear una biblioteca pública.

Ejemplos:
- Sistemas compartidos
- Etiquetas
- Plantillas
- Dashboards
- Informes

Los entrenadores podrán importar configuraciones creadas por otros usuarios.

---

## 14. Fase 12 - Automatización

### Implementar

- Alertas
- Informes automáticos
- Correos
- Resúmenes post partido
- Comparativas automáticas

---

## 15. Backlog priorizado

### Prioridad Muy Alta

- Registro de posesiones
- Cambios
- Configuración
- Estadísticas básicas

### Prioridad Alta

- Dashboards
- Exportaciones
- Filtros
- Comparativas

### Prioridad Media

- Vídeo
- Scouting
- Compartición

### Prioridad Baja

- IA avanzada
- Automatizaciones
- Comunidad

---

## 16. Hitos

| Hito | Descripción | Fase |
|------|-------------|------|
| Hito 1 | Registrar un partido completo | Fase 3 |
| Hito 2 | Consultar estadísticas | Fase 4 |
| Hito 3 | Analizar una temporada | Fase 5 |
| Hito 4 | Sincronización con vídeo | Fase 7 |
| Hito 5 | Primer asistente IA | Fase 9 |
| Hito 6 | Producto comercializable | Fase 12 |

---

## 17. Riesgos

| Riesgo | Descripción | Mitigación |
|--------|-------------|------------|
| R1 | Intentar desarrollar demasiadas funcionalidades al mismo tiempo | Seguir estrictamente el roadmap |
| R2 | Acoplar la lógica de negocio a Angular | Mantener la arquitectura por capas |
| R3 | Crear componentes específicos para cada módulo | Priorizar siempre componentes reutilizables |
| R4 | Añadir estadísticas almacenadas | Todas las métricas deberán calcularse dinámicamente |

---

## 18. Definición de terminado (Definition of Done)

Una funcionalidad se considerará terminada únicamente cuando:

- Esté implementada
- Tenga pruebas
- Sea responsive
- Esté documentada
- Respete la arquitectura
- Sea reutilizable
- No introduzca deuda técnica

---

## 19. Métricas del proyecto

| Métrica | Objetivo |
|---------|----------|
| Cobertura de pruebas | >80% |
| Tiempo de carga | <2 s |
| Registro de una posesión | <5 s |
| Dashboard | <300 ms |
| Sin duplicación de lógica | 100% |

---

## 20. Visión a largo plazo

El objetivo final no es crear una aplicación para registrar estadísticas.

El objetivo es construir una plataforma integral para entrenadores de baloncesto que centralice:

- Gestión de equipos
- Entrenamientos
- Ejercicios
- Partidos
- Scouting
- Pizarra táctica
- Estadísticas
- Vídeo
- Inteligencia artificial

Todos los módulos compartirán la misma arquitectura y el mismo modelo de datos, permitiendo que la información fluya entre ellos de forma natural.

---

## Próximo documento

[10-opencode-prompt.md](10-opencode-prompt.md)
