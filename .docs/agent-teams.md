# Orquestar equipos de sesiones de Claude Code

> **Fuente**: https://code.claude.com/docs/es/agent-teams
> **Capturado**: 2026-03-05
> **Propósito**: Referencia local para el Orquestador y agentes del proyecto BBB Meeting Management System. Evita consultar la URL externa en cada sesión.

---

Coordina múltiples instancias de Claude Code trabajando juntas como un equipo, con tareas compartidas, mensajería entre agentes y gestión centralizada.

> **EXPERIMENTAL**: Los equipos de agentes son experimentales y están deshabilitados por defecto. Habilítelos agregando `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` a su `settings.json` o entorno. Los equipos de agentes tienen [limitaciones conocidas](#limitaciones) alrededor de la reanudación de sesiones, coordinación de tareas y comportamiento de apagado.

Los equipos de agentes le permiten coordinar múltiples instancias de Claude Code trabajando juntas. Una sesión actúa como el **líder del equipo**, coordinando el trabajo, asignando tareas y sintetizando resultados. Los compañeros de equipo trabajan de forma independiente, cada uno en su propia ventana de contexto, y se comunican directamente entre sí.

A diferencia de los **subagents**, que se ejecutan dentro de una única sesión y solo pueden informar al agente principal, también puede interactuar directamente con compañeros de equipo individuales sin pasar por el líder.

---

## Cuándo usar equipos de agentes

Los equipos de agentes son más efectivos para tareas donde la exploración paralela agrega valor real. Los casos de uso más sólidos son:

- **Investigación y revisión**: múltiples compañeros de equipo pueden investigar diferentes aspectos de un problema simultáneamente, luego compartir y desafiar los hallazgos de cada uno
- **Nuevos módulos o características**: los compañeros de equipo pueden poseer cada uno una pieza separada sin pisarse mutuamente
- **Depuración con hipótesis competidoras**: los compañeros de equipo prueban diferentes teorías en paralelo y convergen en la respuesta más rápidamente
- **Coordinación entre capas**: cambios que abarcan frontend, backend y pruebas, cada uno propiedad de un compañero de equipo diferente

Los equipos de agentes agregan sobrecarga de coordinación y usan significativamente más tokens que una única sesión. Funcionan mejor cuando los compañeros de equipo pueden operar de forma independiente. Para tareas secuenciales, ediciones del mismo archivo o trabajo con muchas dependencias, una única sesión o subagents son más efectivos.

### Comparar con subagents

|                     | Subagents                                                       | Equipos de agentes                                                  |
| :------------------ | :-------------------------------------------------------------- | :------------------------------------------------------------------ |
| **Contexto**        | Ventana de contexto propia; los resultados regresan al llamador | Ventana de contexto propia; completamente independiente             |
| **Comunicación**    | Informar resultados solo al agente principal                    | Los compañeros de equipo se envían mensajes directamente            |
| **Coordinación**    | El agente principal gestiona todo el trabajo                    | Lista de tareas compartida con auto-coordinación                    |
| **Mejor para**      | Tareas enfocadas donde solo importa el resultado                | Trabajo complejo que requiere discusión y colaboración              |
| **Costo de tokens** | Menor: resultados resumidos de vuelta al contexto principal     | Mayor: cada compañero de equipo es una instancia separada de Claude |

Use subagents cuando necesite trabajadores rápidos y enfocados que informen de vuelta. Use equipos de agentes cuando los compañeros de equipo necesiten compartir hallazgos, desafiarse mutuamente y coordinarse por su cuenta.

---

## Habilitar equipos de agentes

Los equipos de agentes están deshabilitados por defecto. Habilítelos configurando la variable de entorno `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` a `1`, ya sea en su entorno de shell o a través de `settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

---

## Iniciar su primer equipo de agentes

Después de habilitar los equipos de agentes, dígale a Claude que cree un equipo de agentes y describa la tarea y la estructura del equipo que desea en lenguaje natural. Claude crea el equipo, genera compañeros de equipo y coordina el trabajo según su indicación.

Este ejemplo funciona bien porque los tres roles son independientes y pueden explorar el problema sin esperar el uno al otro:

```text
Estoy diseñando una herramienta CLI que ayuda a los desarrolladores a rastrear comentarios TODO en
su base de código. Crea un equipo de agentes para explorar esto desde diferentes ángulos: un
compañero de equipo en UX, uno en arquitectura técnica, uno jugando al abogado del diablo.
```

A partir de ahí, Claude crea un equipo con una lista de tareas compartida, genera compañeros de equipo para cada perspectiva, los tiene explorar el problema, sintetiza hallazgos e intenta limpiar el equipo cuando termina.

La terminal del líder enumera todos los compañeros de equipo y en qué están trabajando. Use `Shift+Down` para ciclar a través de compañeros de equipo y enviarles mensajes directamente. Después del último compañero de equipo, `Shift+Down` vuelve al líder.

---

## Controlar su equipo de agentes

Dígale al líder lo que desea en lenguaje natural. Maneja la coordinación del equipo, asignación de tareas y delegación según sus instrucciones.

### Elegir un modo de visualización

Los equipos de agentes admiten dos modos de visualización:

- **En proceso (in-process)**: todos los compañeros de equipo se ejecutan dentro de su terminal principal. Use `Shift+Down` para ciclar a través de compañeros de equipo y escriba para enviarles mensajes directamente. Funciona en cualquier terminal, sin configuración adicional requerida.
- **Paneles divididos (split panes)**: cada compañero de equipo obtiene su propio panel. Puede ver la salida de todos a la vez y hacer clic en un panel para interactuar directamente. Requiere tmux o iTerm2.

> **Nota**: `tmux` tiene limitaciones conocidas en ciertos sistemas operativos y tradicionalmente funciona mejor en macOS. Usar `tmux -CC` en iTerm2 es el punto de entrada sugerido en `tmux`.

El valor predeterminado es `"auto"`, que usa paneles divididos si ya está ejecutándose dentro de una sesión de tmux, y en proceso de lo contrario. La configuración `"tmux"` habilita el modo de panel dividido y detecta automáticamente si usar tmux o iTerm2 según su terminal. Para anular, configure `teammateMode` en su `settings.json`:

```json
{
  "teammateMode": "in-process"
}
```

Para forzar el modo en proceso para una única sesión, páselo como una bandera:

```bash
claude --teammate-mode in-process
```

El modo de panel dividido requiere tmux o iTerm2 con la CLI `it2`. Para instalar manualmente:

- **tmux**: instale a través del gestor de paquetes de su sistema.
- **iTerm2**: instale la CLI `it2`, luego habilite la API de Python en **iTerm2 → Settings → General → Magic → Enable Python API**.

### Especificar compañeros de equipo y modelos

Claude decide el número de compañeros de equipo a generar según su tarea, o puede especificar exactamente lo que desea:

```text
Crea un equipo con 4 compañeros de equipo para refactorizar estos módulos en paralelo.
Usa Sonnet para cada compañero de equipo.
```

### Requerir aprobación de plan para compañeros de equipo

Para tareas complejas o riesgosas, puede requerir que los compañeros de equipo planifiquen antes de implementar. El compañero de equipo trabaja en modo de plan de solo lectura hasta que el líder apruebe su enfoque:

```text
Genera un compañero de equipo arquitecto para refactorizar el módulo de autenticación.
Requiere aprobación de plan antes de que hagan cambios.
```

Cuando un compañero de equipo termina de planificar, envía una solicitud de aprobación de plan al líder. El líder revisa el plan y lo aprueba o lo rechaza con retroalimentación. Si se rechaza, el compañero de equipo permanece en modo de plan, revisa según la retroalimentación y reenvía. Una vez aprobado, el compañero de equipo sale del modo de plan y comienza la implementación.

El líder toma decisiones de aprobación de forma autónoma. Para influir en el juicio del líder, dé criterios en su indicación, como "solo aprueba planes que incluyan cobertura de pruebas" o "rechaza planes que modifiquen el esquema de la base de datos".

### Hablar con compañeros de equipo directamente

Cada compañero de equipo es una sesión completa e independiente de Claude Code. Puede enviar un mensaje a cualquier compañero de equipo directamente para dar instrucciones adicionales, hacer preguntas de seguimiento o redirigir su enfoque.

- **Modo en proceso**: use `Shift+Down` para ciclar a través de compañeros de equipo, luego escriba para enviarles un mensaje. Presione `Enter` para ver la sesión de un compañero de equipo, luego `Escape` para interrumpir su turno actual. Presione `Ctrl+T` para alternar la lista de tareas.
- **Modo de panel dividido**: haga clic en el panel de un compañero de equipo para interactuar directamente con su sesión. Cada compañero de equipo tiene una vista completa de su propia terminal.

### Asignar y reclamar tareas

La lista de tareas compartida coordina el trabajo en todo el equipo. El líder crea tareas y los compañeros de equipo las trabajan. Las tareas tienen tres estados: **pendiente**, **en progreso** y **completada**. Las tareas también pueden depender de otras tareas: una tarea pendiente con dependencias sin resolver no puede ser reclamada hasta que esas dependencias se completen.

El líder puede asignar tareas explícitamente, o los compañeros de equipo pueden auto-reclamar:

- **El líder asigna**: dígale al líder qué tarea dar a qué compañero de equipo
- **Auto-reclamar**: después de terminar una tarea, un compañero de equipo recoge la siguiente tarea sin asignar y sin bloquear por su cuenta

El reclamo de tareas usa **bloqueo de archivos** para prevenir condiciones de carrera cuando múltiples compañeros de equipo intentan reclamar la misma tarea simultáneamente.

### Apagar compañeros de equipo

Para terminar gracefully la sesión de un compañero de equipo:

```text
Pídele al compañero de equipo investigador que se apague
```

El líder envía una solicitud de apagado. El compañero de equipo puede aprobar, saliendo gracefully, o rechazar con una explicación.

### Limpiar el equipo

Cuando haya terminado, pídele al líder que limpie:

```text
Limpia el equipo
```

Esto elimina los recursos compartidos del equipo. Cuando el líder ejecuta la limpieza, verifica si hay compañeros de equipo activos y falla si alguno aún se está ejecutando, así que apáguelos primero.

> **IMPORTANTE**: Siempre use el líder para limpiar. Los compañeros de equipo no deben ejecutar la limpieza porque su contexto de equipo puede no resolverse correctamente, dejando potencialmente recursos en un estado inconsistente.

### Aplicar puertas de calidad con hooks

Use hooks para aplicar reglas cuando los compañeros de equipo terminen el trabajo o las tareas se completen:

- **`TeammateIdle`**: se ejecuta cuando un compañero de equipo está a punto de quedarse inactivo. Salga con código 2 para enviar retroalimentación y mantener al compañero de equipo trabajando.
- **`TaskCompleted`**: se ejecuta cuando una tarea está siendo marcada como completada. Salga con código 2 para prevenir la finalización y enviar retroalimentación.

---

## Cómo funcionan los equipos de agentes

### Cómo Claude inicia equipos de agentes

Hay dos formas en que los equipos de agentes se inician:

- **Usted solicita un equipo**: dé a Claude una tarea que se beneficie del trabajo paralelo y solicite explícitamente un equipo de agentes. Claude crea uno según sus instrucciones.
- **Claude propone un equipo**: si Claude determina que su tarea se beneficiaría del trabajo paralelo, puede sugerir crear un equipo. Usted confirma antes de que proceda.

En ambos casos, usted mantiene el control. Claude no creará un equipo sin su aprobación.

### Arquitectura

Un equipo de agentes consiste en:

| Componente               | Rol                                                                                                      |
| :----------------------- | :------------------------------------------------------------------------------------------------------- |
| **Líder del equipo**     | La sesión principal de Claude Code que crea el equipo, genera compañeros de equipo y coordina el trabajo |
| **Compañeros de equipo** | Instancias separadas de Claude Code que cada una trabaja en tareas asignadas                             |
| **Lista de tareas**      | Lista compartida de elementos de trabajo que los compañeros de equipo reclaman y completan               |
| **Buzón (Mailbox)**      | Sistema de mensajería para comunicación entre agentes                                                    |

Los mensajes de compañeros de equipo llegan al líder automáticamente.

El sistema gestiona las dependencias de tareas automáticamente. Cuando un compañero de equipo completa una tarea de la que otras tareas dependen, las tareas bloqueadas se desbloquean sin intervención manual.

Los equipos y tareas se almacenan localmente:

- **Configuración del equipo**: `~/.claude/teams/{team-name}/config.json`
- **Lista de tareas**: `~/.claude/tasks/{team-name}/`

La configuración del equipo contiene un array `members` con el nombre de cada compañero de equipo, ID de agente y tipo de agente. Los compañeros de equipo pueden leer este archivo para descubrir otros miembros del equipo.

### Permisos

Los compañeros de equipo comienzan con la configuración de permisos del líder. Si el líder se ejecuta con `--dangerously-skip-permissions`, todos los compañeros de equipo también lo hacen. Después de generar, puede cambiar modos de compañeros de equipo individuales, pero no puede establecer modos por compañero de equipo en el momento de la generación.

### Contexto y comunicación

Cada compañero de equipo tiene su propia ventana de contexto. Cuando se genera, un compañero de equipo carga el mismo contexto de proyecto que una sesión regular: `CLAUDE.md`, servidores MCP y skills. También recibe la indicación de generación del líder. **El historial de conversación del líder NO se transfiere.**

**Cómo los compañeros de equipo comparten información:**

- **Entrega automática de mensajes**: cuando los compañeros de equipo envían mensajes, se entregan automáticamente a los destinatarios. El líder no necesita sondear actualizaciones.
- **Notificaciones de inactividad**: cuando un compañero de equipo termina y se detiene, notifica automáticamente al líder.
- **Lista de tareas compartida**: todos los agentes pueden ver el estado de la tarea y reclamar trabajo disponible.

**Mensajería de compañeros de equipo:**

- **`message`**: enviar un mensaje a un compañero de equipo específico
- **`broadcast`**: enviar a todos los compañeros de equipo simultáneamente. Use con moderación, ya que los costos escalan con el tamaño del equipo.

### Uso de tokens

Los equipos de agentes usan significativamente más tokens que una única sesión. Cada compañero de equipo tiene su propia ventana de contexto, y el uso de tokens escala con el número de compañeros de equipo activos. Para investigación, revisión y trabajo de nuevas características, los tokens adicionales generalmente valen la pena. Para tareas rutinarias, una única sesión es más rentable.

---

## Ejemplos de casos de uso

### Ejecutar una revisión de código paralela

Un único revisor tiende a gravitar hacia un tipo de problema a la vez. Dividir criterios de revisión en dominios independientes significa que la seguridad, el rendimiento y la cobertura de pruebas reciben atención exhaustiva simultáneamente:

```text
Crea un equipo de agentes para revisar la PR #142. Genera tres revisores:
- Uno enfocado en implicaciones de seguridad
- Uno verificando impacto de rendimiento
- Uno validando cobertura de pruebas
Que cada uno revise e informe hallazgos.
```

Cada revisor trabaja desde la misma PR pero aplica un filtro diferente. El líder sintetiza hallazgos en los tres después de que terminen.

### Investigar con hipótesis competidoras

Cuando la causa raíz es poco clara, un único agente tiende a encontrar una explicación plausible y dejar de buscar. La indicación lucha contra esto haciendo que los compañeros de equipo sean explícitamente adversarios:

```text
Los usuarios reportan que la aplicación se cierra después de un mensaje en lugar de mantenerse conectada.
Genera 5 compañeros de equipo de agentes para investigar diferentes hipótesis. Haz que se hablen
entre sí para intentar refutar las teorías de cada uno, como un
debate científico. Actualiza el documento de hallazgos con cualquier consenso que emerja.
```

La estructura de debate es el mecanismo clave. La investigación secuencial sufre de anclaje: una vez que una teoría se explora, la investigación posterior está sesgada hacia ella. Con múltiples investigadores independientes intentando activamente refutar mutuamente, la teoría que sobrevive es mucho más probable que sea la causa raíz real.

---

## Mejores prácticas

### Dar a los compañeros de equipo suficiente contexto

Los compañeros de equipo cargan contexto de proyecto automáticamente (incluyendo `CLAUDE.md`, servidores MCP y skills), pero **no heredan el historial de conversación del líder**. Incluya detalles específicos de la tarea en la indicación de generación:

```text
Genera un compañero de equipo revisor de seguridad con la indicación: "Revisa el módulo de autenticación
en src/auth/ para vulnerabilidades de seguridad. Enfócate en manejo de tokens, gestión de
sesiones y validación de entrada. La aplicación usa tokens JWT almacenados en
cookies httpOnly. Reporta cualquier problema con calificaciones de severidad."
```

### Elegir un tamaño de equipo apropiado

No hay límite duro en el número de compañeros de equipo, pero se aplican restricciones prácticas:

- **Los costos de tokens escalan linealmente**: cada compañero de equipo tiene su propia ventana de contexto y consume tokens independientemente.
- **La sobrecarga de coordinación aumenta**: más compañeros de equipo significa más comunicación, coordinación de tareas y potencial para conflictos.
- **Rendimientos decrecientes**: más allá de cierto punto, compañeros de equipo adicionales no aceleran el trabajo proporcionalmente.

Comience con **3-5 compañeros de equipo** para la mayoría de flujos de trabajo. Tener **5-6 tareas por compañero de equipo** mantiene a todos productivos sin cambio de contexto excesivo. Si tiene 15 tareas independientes, 3 compañeros de equipo es un buen punto de partida.

Tres compañeros de equipo enfocados a menudo superan a cinco dispersos.

### Dimensionar tareas apropiadamente

- **Demasiado pequeñas**: la sobrecarga de coordinación excede el beneficio
- **Demasiado grandes**: los compañeros de equipo trabajan demasiado tiempo sin check-ins, aumentando el riesgo de esfuerzo desperdiciado
- **Justo bien**: unidades auto-contenidas que producen un entregable claro, como una función, un archivo de prueba o una revisión

> **Tip**: El líder divide el trabajo en tareas y las asigna a los compañeros de equipo automáticamente. Si no está creando suficientes tareas, pídele que divida el trabajo en piezas más pequeñas. Tener 5-6 tareas por compañero de equipo mantiene a todos productivos y permite al líder reasignar trabajo si alguien se queda atrapado.

### Esperar a que los compañeros de equipo terminen

A veces el líder comienza a implementar tareas por sí mismo en lugar de esperar a los compañeros de equipo. Si nota esto:

```text
Espera a que tus compañeros de equipo completen sus tareas antes de proceder
```

### Comenzar con investigación y revisión

Si es nuevo en equipos de agentes, comience con tareas que tengan límites claros y no requieran escribir código: revisar una PR, investigar una biblioteca o investigar un error.

### Evitar conflictos de archivos

Dos compañeros de equipo editando el mismo archivo lleva a sobrescrituras. Divida el trabajo para que cada compañero de equipo posea un conjunto diferente de archivos.

### Monitorear y dirigir

Verifique el progreso de los compañeros de equipo, redirija enfoques que no estén funcionando y sintetice hallazgos a medida que lleguen. Dejar un equipo sin supervisión durante demasiado tiempo aumenta el riesgo de esfuerzo desperdiciado.

---

## Solución de problemas

### Los compañeros de equipo no aparecen

Si los compañeros de equipo no aparecen después de pedirle a Claude que cree un equipo:

- En modo en proceso, los compañeros de equipo pueden ya estar ejecutándose pero no ser visibles. Presione `Shift+Down` para ciclar a través de compañeros de equipo activos.
- Verifique que la tarea fue lo suficientemente compleja para justificar un equipo. Claude decide si generar compañeros de equipo según la tarea.
- Si solicitó paneles divididos, asegúrese de que tmux esté instalado:
  ```bash
  which tmux
  ```
- Para iTerm2, verifique que la CLI `it2` esté instalada y la API de Python esté habilitada.

### Demasiadas solicitudes de permiso

Las solicitudes de permiso de compañeros de equipo suben al líder, lo que puede crear fricción. Pre-apruebe operaciones comunes en su configuración de permisos antes de generar compañeros de equipo para reducir interrupciones.

### Los compañeros de equipo se detienen en errores

Los compañeros de equipo pueden detenerse después de encontrar errores en lugar de recuperarse. Verifique su salida usando `Shift+Down` en modo en proceso o haciendo clic en el panel en modo dividido, luego:

- Deles instrucciones adicionales directamente
- Genere un compañero de equipo de reemplazo para continuar el trabajo

### El líder se apaga antes de que el trabajo esté hecho

El líder puede decidir que el equipo está terminado antes de que todas las tareas estén realmente completas. Si esto sucede, dígale que continúe. También puede decirle al líder que espere a que los compañeros de equipo terminen antes de proceder.

### Sesiones de tmux huérfanas

Si una sesión de tmux persiste después de que el equipo termina, puede no haber sido completamente limpiada:

```bash
tmux ls
tmux kill-session -t <session-name>
```

---

## Limitaciones

Los equipos de agentes son experimentales. Limitaciones actuales:

- **Sin reanudación de sesión con compañeros de equipo en proceso**: `/resume` y `/rewind` no restauran compañeros de equipo en proceso. Después de reanudar una sesión, el líder puede intentar enviar mensajes a compañeros de equipo que ya no existen. Dígale al líder que genere nuevos compañeros de equipo.
- **El estado de la tarea puede retrasarse**: los compañeros de equipo a veces no marcan las tareas como completadas, lo que bloquea tareas dependientes. Verifique si el trabajo está realmente hecho y actualice el estado manualmente o dígale al líder que empuje al compañero de equipo.
- **El apagado puede ser lento**: los compañeros de equipo terminan su solicitud actual o llamada de herramienta antes de apagarse.
- **Un equipo por sesión**: un líder solo puede gestionar un equipo a la vez. Limpie el equipo actual antes de comenzar uno nuevo.
- **Sin equipos anidados**: los compañeros de equipo no pueden generar sus propios equipos o compañeros de equipo. Solo el líder puede gestionar el equipo.
- **El líder es fijo**: la sesión que crea el equipo es el líder de por vida. No puede promover un compañero de equipo a líder o transferir liderazgo.
- **Permisos establecidos en la generación**: todos los compañeros de equipo comienzan con el modo de permiso del líder. Puede cambiar modos individuales después, pero no puede establecer modos por compañero de equipo en el momento de la generación.
- **Los paneles divididos requieren tmux o iTerm2**: el modo en proceso predeterminado funciona en cualquier terminal. El modo de panel dividido no es compatible con la terminal integrada de VS Code, Windows Terminal o Ghostty.

> **Tip**: `CLAUDE.md` funciona normalmente: los compañeros de equipo leen archivos `CLAUDE.md` de su directorio de trabajo. Use esto para proporcionar orientación específica del proyecto a todos los compañeros de equipo.

---

## Próximos pasos

- **Delegación ligera**: subagents generan agentes auxiliares para investigación o verificación dentro de su sesión, mejor para tareas que no necesitan coordinación entre agentes
- **Sesiones paralelas manuales**: Git worktrees le permiten ejecutar múltiples sesiones de Claude Code usted mismo sin coordinación de equipo automatizada
