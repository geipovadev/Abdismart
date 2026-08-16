---
description: Corre el ciclo completo de prospección — buscar, verificar, calificar y escribir correos — y deja un reporte. Argumento opcional: ciudad y/o nicho para esta ronda (ej. "/ronda San José fisioterapia"). Sin argumento, sigue el roadmap por defecto de perfil-cliente.md.
---

Vas a correr una ronda completa del sistema de captación de Abdismart en
`Resultado/agente/`. Antes de arrancar, leé `CLAUDE.md` de esta carpeta —
ahí están el presupuesto mensual, las reglas de "nunca" y cómo se envían los
correos.

Argumento de esta ronda (ciudad/nicho, puede venir vacío): $ARGUMENTS

## Orden de trabajo

1. **Vigilante** — invocalo primero, con el argumento de esta ronda si aplica.
   Sus hallazgos son sensibles al tiempo, por eso van antes que el resto tanto
   en la ejecución como en el reporte. Esperá su resultado. Comparte el mismo
   presupuesto mensual que el prospector — si no corrió alguna de sus cuatro
   señales por falta de remanente, seguí igual con el resto de la ronda.

2. **Prospector** — invocalo con el argumento de esta ronda (o sin nada, para que
   siga el default del roadmap de `perfil-cliente.md`). Esperá su resultado antes
   de seguir. Si no corrió nada por falta de presupuesto, andá directo al paso 5
   con esa noticia.

3. **Verificador** — invocalo con la ruta del crudo que entregó el prospector.
   Esperá su resultado. Si activó la regla del 50%, andá directo al paso 5 con esa
   noticia — no invoques al redactor para la parte normal (si el vigilante sí
   encontró urgentes, el redactor igual las trabaja).

4. **Redactor** — invocalo con la ruta de los calificados que entregó el
   verificador, Y con la ruta de `leads/urgentes.csv` si el vigilante encontró
   algo esta ronda. Esperá su resultado. Las dos listas se escriben y se suben
   a MailerLite por separado, nunca mezcladas.

## Cierre — reporte de la ronda

Escribí `reportes/YYYY-MM-DD.md` (agregar un reporte nuevo si ya corrió una ronda
hoy, no sobrescribir el anterior — usar `-2`, `-3` en el nombre si hace falta).
**Los urgentes del vigilante van primero, arriba de todo lo demás** — es lo
primero que el usuario debe ver en el parte de la mañana:

1. **Urgentes (vigilante)** — cuántos por cada una de las cuatro señales, con
   su `senal_de_urgencia` resumida cada uno (no solo el número). Link a su
   campaña en borrador de MailerLite si el redactor le escribió a alguno.
2. **Ronda normal** — qué se buscó (ciudad, nicho, argumento usado o default),
   cuántos leads crudos, cuántos calificados, cuántos descartados (y por qué).
   Si se activó la regla del 50%: decirlo y la propuesta de cambio del
   verificador. Cuántos correos se escribieron, cuántos quedaron `SIN_ANGULO`.
   Link a su campaña en borrador de MailerLite.
3. **Presupuesto** — gasto de vigilante y de prospector por separado, y
   remanente del mes después de los dos.
4. Si el link del video en la plantilla sigue pendiente de reemplazar, decirlo
   una sola vez al final, no repetirlo en cada sección.

Después de escribir el reporte, mostrale al usuario un resumen corto en el chat
(no todo el detalle, eso ya está en el reporte) y decile explícitamente si la
ronda quedó completa o se cortó a mitad de camino y por qué.
