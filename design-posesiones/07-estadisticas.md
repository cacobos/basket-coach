# Motor de Estadísticas y Análisis

Versión 1.0

---

## 1. Objetivo

El objetivo de este documento es definir el sistema de estadísticas de la aplicación.

La filosofía del sistema será:

> **No mostrar datos. Mostrar respuestas.**

Todas las estadísticas deberán obtenerse automáticamente a partir de las posesiones registradas.

Nunca se almacenarán estadísticas en la base de datos.

---

## 2. Filosofía

Existen dos tipos de información.

### Estadística descriptiva

Responde a:

> ¿Qué ha pasado?

Ejemplos:
- 18 pérdidas
- 43 rebotes
- 8 triples

### Estadística analítica

Responde a:

> ¿Por qué ha pasado?

Ejemplos:
- Perdemos muchos balones cuando jugamos Horns
- El quinteto pequeño anota más
- Contra zonas generamos pocas ventajas
- El 70% de nuestros puntos llegan en transición

La aplicación estará enfocada principalmente en este segundo nivel.

---

## 3. Dashboard principal

Al abrir un partido se mostrará un resumen con los indicadores más relevantes.

### Indicadores

- Posesiones ofensivas
- Posesiones defensivas
- PPP ofensivo
- PPP defensivo
- Offensive Rating
- Defensive Rating
- Balance de posesiones
- Diferencial de puntos
- Ritmo estimado

---

## 4. Estadísticas ofensivas

Calcular automáticamente:

### Producción

- Posesiones
- Puntos
- PPP
- % T2
- % T3
- % pérdidas
- % faltas recibidas
- % posesiones con rebote ofensivo
- % posesiones terminadas en 0-8 s
- % posesiones terminadas en 9-16 s
- % posesiones terminadas en 17-24 s

---

## 5. Estadísticas defensivas

Las mismas métricas desde el punto de vista del rival.

Ejemplo:
- PPP recibido
- Tipos de ataque recibidos
- Sistemas recibidos
- Finalizadoras rivales
- Generadoras rivales
- Puntos concedidos

---

## 6. Análisis por tipo de ataque

| Tipo | Posesiones | PPP | % Uso |
|-------|-----------:|----:|------:|
| Contraataque | | | |
| Transición | | | |
| Estático | | | |
| Rebote ofensivo | | | |
| Saque | | | |

---

## 7. Análisis por sistema

Uno de los informes principales.

| Sistema | Uso | PPP | T2 | T3 | Pérdidas |
|----------|----:|----:|----:|----:|---------:|

Ordenable.

Filtrable.

---

## 8. Análisis por quinteto

| Quinteto | Minutos | PPP | DRtg | +/- |
|-----------|--------:|----:|-----:|----:|

El quinteto se reconstruye automáticamente.

---

## 9. Análisis por jugadora

Cada jugadora tendrá una ficha propia.

### Producción

- Posesiones finalizadas
- Puntos
- PPP
- T2
- T3
- Pérdidas
- Faltas recibidas

### Generación

Nueva métrica.

No solo asistencias.

Sino:

**Generaciones de ventaja.**

Ejemplo:
1. La base genera una ventaja
2. La pívot anota
3. La base suma una generación

---

## 10. Ranking de generadoras

| Jugadora | Generaciones | PPP generado |
|-----------|-------------:|-------------:|

Esta será una de las métricas diferenciales de la aplicación.

---

## 11. Análisis temporal

Agrupar por:
- Cuarto
- Mitad
- Partido completo
- Prórroga

---

## 12. Análisis por rango temporal

Utilizando el campo:
- 0-8
- 9-16
- 17-24

| Rango | PPP |
|--------|----:|
| 0-8 | |
| 9-16 | |
| 17-24 | |

---

## 13. Análisis por tags

Ejemplo.

Tag: **Spain**

Mostrar:
- PPP
- Uso
- Resultados
- Jugadoras
- Rivales

---

## 14. Filtros

Todas las estadísticas deberán poder combinar filtros.

Ejemplo:

```text
Temporada → Senior → Contraataque → Horns → Cuarto 3 → Jugadora: Marta
```

Sin límite de filtros.

---

## 15. Comparativas

La aplicación deberá permitir comparar.

### Partido vs partido

Jornada 3 vs Jornada 7

### Temporada

Mostrar evolución.

### Rivales

¿Cómo jugamos contra cada rival?

### Jugadoras

Comparar producción.

### Quintetos

Comparar rendimiento.

---

## 16. Tendencias

Mostrar evolución.

Ejemplos:
- PPP últimos diez partidos
- Uso de Horns
- Pérdidas
- Offensive Rating
- Defensive Rating

Todos representados mediante gráficos.

---

## 17. Alertas inteligentes

La aplicación podrá detectar automáticamente anomalías.

Ejemplos:
- El PPP en transición ha bajado un 18% respecto a la media
- El quinteto habitual está concediendo más puntos
- Se pierde más balón contra presión
- El porcentaje de ataques estáticos ha aumentado significativamente
- El uso de un sistema ha caído respecto a los últimos cinco partidos

Las alertas no sustituyen al entrenador.

Su función es llamar la atención sobre comportamientos relevantes.

---

## 18. Preguntas rápidas

En lugar de navegar por decenas de tablas, el usuario podrá seleccionar preguntas predefinidas.

Ejemplos:
- ¿Cómo conseguimos más puntos?
- ¿Dónde perdemos más balones?
- ¿Qué sistema es más eficiente?
- ¿Qué jugadora genera más ventajas?
- ¿Qué quinteto funciona mejor?
- ¿Qué ocurre después de un rebote ofensivo?
- ¿Qué recibimos tras canasta rival?
- ¿Qué tipo de ataque utiliza más el rival?
- ¿Qué sistemas generan más tiros liberados?
- ¿Qué jugadora finaliza mejor en transición?

La aplicación construirá automáticamente la consulta.

---

## 19. Constructor de consultas

Para usuarios avanzados.

Ejemplo:

```text
Mostrar → PPP → Donde → Sistema = Horns → Y → Ataque = Estático → Y → Periodo = 4
```

El usuario nunca escribirá SQL.

Todo se construirá mediante filtros visuales.

---

## 20. Dashboards personalizables

Cada entrenador podrá crear paneles propios.

### Dashboard Partido

- PPP
- Offensive Rating
- Defensive Rating
- Sistemas
- Tipos de ataque

### Dashboard Entrenador

- Evolución semanal
- Tendencias
- Alertas

### Dashboard Scouting

- Sistemas rivales
- Jugadora principal
- Tipos de defensa
- Finalizaciones

---

## 21. Exportación

Todos los informes podrán exportarse.

Formatos soportados:
- PDF
- Excel
- CSV
- PNG

Las exportaciones respetarán:
- Filtros
- Ordenación
- Configuración visual

---

## 22. KPIs configurables

Cada entrenador podrá elegir qué indicadores quiere visualizar.

Ejemplos:
- PPP
- eFG%
- Offensive Rating
- Defensive Rating
- % pérdidas
- % rebote ofensivo
- Generaciones
- Faltas recibidas

El dashboard mostrará únicamente los KPIs seleccionados.

---

## 23. Arquitectura

Las estadísticas nunca se almacenan.

Flujo:

```text
Supabase → Repositories → StatisticsService → Signals → Dashboard → Gráficos
```

Toda la lógica residirá en `StatisticsService`.

---

## 24. Rendimiento

Objetivos:
- Dashboard <300 ms
- Consultas reutilizables
- Caché de configuración
- Vistas materializadas cuando sea necesario
- Funciones SQL para agregaciones complejas

Siempre existirá una única fuente de verdad: las posesiones.

---

## 25. Integración con IA

El motor de estadísticas será la base del asistente inteligente.

Ejemplos:
- ¿Qué sistema produce mejor PPP?
- ¿Contra qué defensa sufrimos más?
- ¿Qué jugadora genera más ventajas jugando con Marta?
- ¿Qué quinteto mejora el Defensive Rating?
- ¿Qué ocurre cuando jugamos Horns en el último cuarto?

La IA consumirá una capa de análisis, nunca accederá directamente a la base de datos.

---

## 26. Métricas derivadas

La aplicación permitirá definir métricas personalizadas.

Ejemplos.

### Índice de agresividad

```text
(faltas recibidas + rebotes ofensivos) / posesiones
```

### Índice de fluidez

```text
generaciones / pérdidas
```

### Índice de eficacia en transición

```text
puntos transición / posesiones transición
```

El entrenador podrá crear nuevas métricas mediante un editor visual.

---

## 27. Comparativas históricas

Será posible comparar:
- Partido vs partido
- Rival vs rival
- Primera vuelta vs segunda vuelta
- Temporada actual vs temporadas anteriores
- Antes y después de una lesión
- Antes y después de un cambio táctico

---

## 28. Rankings

La aplicación generará rankings automáticamente.

### Sistemas

- Mayor PPP
- Mayor uso
- Menor porcentaje de pérdidas

### Jugadoras

- Más puntos
- Mejor PPP
- Más generaciones
- Más eficiencia

### Quintetos

- Mejor Offensive Rating
- Mejor Defensive Rating
- Mejor diferencial

---

## 29. Visualizaciones

El motor deberá soportar distintos tipos de representación:
- Tarjetas KPI
- Tablas
- Barras
- Líneas temporales
- Radar
- Heatmaps (futuro)
- Sankey (flujo de ataques)
- Árboles de decisión (IA futura)

---

## 30. Decisions de arquitectura

Se consideran definitivas:
- Nunca almacenar estadísticas calculadas
- Toda estadística se obtiene desde las posesiones
- El concepto de "Generadora" será una métrica propia de la plataforma
- Todo informe admite filtros combinables
- Los dashboards son completamente personalizables
- El sistema responde preguntas, no solo muestra números
- Toda métrica debe poder reutilizarse por IA, dashboards y exportaciones

---

## Próximo documento

[08-api-servicios.md](08-api-servicios.md)
