# CLAUDE.md — Agente de prospección Abdismart

Esta carpeta (`Resultado/agente/`) es la casa de un sistema de prospección continua.
Léase esto completo antes de correr `/ronda` o cualquiera de sus piezas sueltas.

## Qué es Abdismart

Ver `/Users/geinerporras/Documents/Abdi/CLAUDE.md` (raíz del workspace) para el
producto, el tono de marca y las reglas completas. En una línea: Abdismart crea y
mantiene la presencia digital de negocios de salud (odontologías, consultorios,
clínicas) — web, agente de atención con IA y automatizaciones de agenda. Campaña
activa: clínicas odontológicas de San José y Heredia, Costa Rica.

## Cliente ideal

Fuente única de verdad: [`perfil-cliente.md`](./perfil-cliente.md) — señales de
calificación, señales de descarte, dónde buscarlos, los cinco arranques de búsqueda
y la tabla de dolores que resuelve Abdismart. No se duplica acá. No se edita sin que
el usuario lo pida explícitamente.

## Presupuesto

**$10 USD por mes, total, en créditos de Apify.** No es por ronda — se acumula.

Antes de correr cualquier actor de Apify: sumar la columna `gasto` de
[`memoria/bitacora.md`](./memoria/bitacora.md) para las rondas del mes en curso,
restar de $10, y comparar ese remanente contra el costo estimado de la búsqueda
nueva. Si el estimado no cabe en el remanente, **no correr** — anotarlo en la
bitácora y decirlo en el reporte de la ronda.

Al correr, el tope de seguridad (`maxTotalChargeUsd`) es el menor entre: el doble
del estimado, o el remanente exacto del mes.

## Envío de correos

- Remitente único: `hola@abdismart.com`, dominio `abdismart.com`.
- Todo envío pasa por **MailerLite** (grupo + campos personalizados `asunto`/`cuerpo`
  por suscriptor + campaña).
- El agente arma la campaña **en borrador**. Nunca la envía. Enviar es un clic del
  usuario, siempre, sin excepción.
- Plantilla base del correo: [`correos/plantilla-abdismart.html`](./correos/plantilla-abdismart.html).
- Reglas de tono y estructura completas: `.claude/skills/escribir-correos/SKILL.md`.

## Nunca

- Nunca manda un correo real por su cuenta. Enviar es decisión y clic del usuario.
- Nunca inventa correo, teléfono o dato de negocio. Lo que no se encuentra queda
  literalmente `sin dato`. Nunca genera correos por patrón (nombre.apellido@dominio).
- Nunca borra ni sobrescribe archivos existentes en `leads/`, `correos/` o
  `memoria/`. Solo agrega (nuevas filas, nuevos archivos con fecha).
- Si una ronda trae menos del 50% de contactos que califican (pasan el filtro de
  categoría + descarte de `perfil-cliente.md`), no insiste con más búsquedas de la
  misma ronda: lo anota en `memoria/bitacora.md` y lo dice en el reporte, con una
  propuesta concreta de qué cambiar.
- Si el gasto estimado de una búsqueda se pasa del presupuesto mensual que queda,
  no corre — se detiene y lo avisa.
- Nunca contacta a alguien que ya está en `memoria/ya-contactados.csv` o en
  `memoria/no-contactar.csv` sin que el usuario lo pida explícitamente para ese caso.
- Los hallazgos del vigilante (`leads/urgentes.csv`) nunca se mezclan con la
  prospección normal, ni entre sí en el mismo grupo de MailerLite, ni reciben
  el correo estándar — se escriben con el ángulo de la señal encontrada.
- Las señales de urgencia que son proxy (posible negocio nuevo, Instagram
  activo) siempre llevan su coletilla de "no confirmado" — no se redactan como
  si fueran un hecho verificado.

## Piezas del sistema

- `.claude/skills/` — manuales de trabajo (`sacar-leads`, `enriquecer-leads`,
  `escribir-correos`, `vigilar-urgencias`).
- `.claude/agents/` — los cuatro empleados (`prospector`, `verificador`,
  `redactor`, `vigilante`).
- `.claude/commands/ronda.md` — el botón que los llama en orden (vigilante
  primero, sus hallazgos son sensibles al tiempo).
- `leads/`, `correos/`, `reportes/` — dónde aterriza el trabajo de cada ronda, un
  archivo por fecha. `leads/urgentes.csv` es aparte, solo del vigilante.
- `memoria/` — lo que evita que el agente sea amnésico: a quién ya se contactó, a
  quién nunca contactar, y la bitácora de gasto/resultado por ronda (vigilante y
  prospector comparten presupuesto pero se registran en líneas separadas).
