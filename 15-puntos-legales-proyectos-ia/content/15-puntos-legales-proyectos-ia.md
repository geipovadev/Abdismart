---
title: "Lo legal que la IA no te avisa"
description: "Los 15 puntos legales que conviene cerrar antes de publicar una web, app o agente creado con IA, con un prompt para revisarlos en tu propio código."
category: "guias"
tags: [legal, privacidad, datos-personales, inteligencia-artificial, latinoamerica]
reading_time: "34 min"
---

## Publicaste rápido. Lo legal quedó en silencio

La IA te escribe el formulario, la base de datos y el cobro en una tarde. Lo que no hace es levantar la mano cuando ese formulario pide la cédula sin decir para qué, cuando la analítica se carga antes de que nadie acepte nada, o cuando la suscripción se renueva sin aviso.

No es mala fe de la herramienta. Es que nadie se lo pidió.

Estos son los 15 puntos que más riesgo evitan, elegidos con tres filtros: que apliquen en Latinoamérica, que se puedan revisar en el código, y que un negocio pequeño los pueda cerrar sin un departamento legal. El más importante va al final, y es el único que la IA no puede hacer por ti.

> **Esto no es asesoría legal.** Es una lista de revisión técnica. Sirve para llegar donde un abogado con el trabajo sucio ya hecho, no para reemplazarlo. Las leyes cambian y los reglamentos cambian más seguido todavía.

---

## Los 15 puntos, de un vistazo

| Punto | Qué evita | Dónde se revisa |
|---|---|---|
| **1. Política de privacidad** | Recoger datos sin base ni aviso | Textos legales y enlaces del pie |
| **2. Términos y condiciones** | Reglas del servicio sin acordar | Textos legales y registro |
| **3. Solo los datos necesarios** | Guardar información que no usas | Campos de cada formulario |
| **4. Plazo de conservación** | Datos acumulados para siempre | Base de datos y tareas de limpieza |
| **5. Ver, corregir y borrar** | Pedidos que no puedes atender | Panel, correo de contacto y proceso |
| **6. Consentimiento con registro** | No poder demostrar que aceptaron | Casilla, tabla y fecha |
| **7. Permiso aparte para marketing** | Correos no solicitados | Formulario y lista de envíos |
| **8. Analítica después del consentimiento** | Rastreo sin permiso | Scripts, píxeles y orden de carga |
| **9. Lista de proveedores** | Transferencias no declaradas | Integraciones y política |
| **10. Datos que no entrenan modelos** | Uso no autorizado de información | Configuración de la API de IA |
| **11. Precio final** | Cargos sorpresa | Página de pago |
| **12. Aviso de renovación** | Cobros que nadie esperaba | Correos automáticos |
| **13. Cancelar fácil** | Retener gente a la fuerza | Flujo de baja |
| **14. Licencias** | Imágenes, fuentes y código ajeno | Assets y dependencias |
| **15. Revisión de un abogado** | Todo lo anterior mal aplicado | Fuera del código |

---

## El prompt completo: cópialo y pégalo en tu proyecto

Esto es lo que quieres si viniste directo al grano: una sola pasada por los 15 puntos. Pégalo en Claude Code, Cursor, Codex o el asistente que uses dentro del proyecto. Está escrito en tres fases para que no toque nada sin que lo apruebes.

Después, cada punto de abajo trae **su propio prompt**, más corto, para cuando quieras arreglar uno solo.

```text
Actúa como revisor de cumplimiento legal y privacidad para productos digitales en Latinoamérica. Trabajas sobre mi proyecto, que fue creado en buena parte con IA.

Antes de empezar, pídeme lo que te falte: en qué país está registrado el negocio, en qué países viven las personas que lo usan, si hay cobros o suscripciones, y si se tratan datos sensibles (salud, menores, finanzas, biometría).

Trabaja en tres fases. Detente al final de cada una y espera mi aprobación.

FASE 1 - INVENTARIO. Sin modificar nada, recorre el proyecto y respóndeme con evidencia concreta (archivo y línea):
1. Qué datos personales se piden, en qué formularios y en qué campos.
2. Dónde se guardan, con qué nombre de tabla y por cuánto tiempo.
3. A qué terceros salen esos datos: base de datos, modelo de IA, pagos, correo, analítica, hosting, webhooks.
4. Qué scripts de analítica, píxeles o anuncios se cargan, y en qué momento de la carga.
5. Qué textos legales existen hoy y desde dónde se enlazan.
6. Si hay precios, suscripciones, renovación automática o flujo de cancelación.
7. Qué imágenes, fuentes, iconos, plantillas y dependencias se usan, y bajo qué licencia.

FASE 2 - DIAGNOSTICO. Evalúa estos 15 puntos. Para cada uno dame: cumple / incompleto / no cumple, la evidencia que lo respalda, el riesgo en una frase y qué falta exactamente.
1. Hay política de privacidad y dice qué datos se piden, para qué, con qué base legal, por cuánto tiempo y quién responde.
2. Hay términos y condiciones del servicio.
3. Cada campo que se pide tiene un uso real. Lo que no se usa, se quita.
4. Cada tipo de dato tiene un plazo de conservación definido y una forma de borrarlo al vencer.
5. La persona puede ver, corregir y borrar sus datos, y existe un canal y un plazo para pedirlo.
6. La casilla de términos no viene marcada, y se guarda quién aceptó, qué versión y cuándo.
7. El permiso para marketing es una casilla aparte de la del servicio, y se puede retirar.
8. Ninguna analítica, píxel ni anuncio se carga antes de que la persona acepte las cookies. Rechazar es tan fácil como aceptar.
9. La política nombra los proveedores que reciben datos y los países donde están.
10. Los datos de las personas no se usan para entrenar modelos sin permiso. Revisa la configuración real de la API de IA que uso.
11. El precio que se muestra es el final, con impuestos y cargos incluidos.
12. Antes de cada renovación automática sale un aviso con fecha y monto.
13. Cancelar toma los mismos pasos que suscribirse, desde el mismo lugar, sin hablar con nadie.
14. Cada imagen, fuente, icono, plantilla y dependencia tiene licencia que permite este uso, y los avisos requeridos están incluidos.
15. Queda una lista de lo que un abogado del país debe revisar antes de lanzar.

FASE 3 - PLAN Y CAMBIOS. Ordena los hallazgos por riesgo real, no por facilidad. Propón los cambios de código y los borradores de texto, de uno en uno, y dime cómo compruebo cada uno después de aplicarlo.

Reglas que no se rompen:
- No inventes leyes, artículos, plazos ni multas. Si no estás seguro, dilo y márcalo como "confirmar con abogado".
- No toques producción. Trabaja en una rama aparte y muéstrame el cambio antes de aplicarlo.
- Los textos legales que redactes son borradores. Deben describir solo lo que mi proyecto hace de verdad, no lo que sería ideal.
- No copies la política de privacidad de otra empresa.
- Si un punto no aplica a mi proyecto, dilo y explica por qué, en vez de agregarme algo que no uso.
- Escribe en español claro, sin tecnicismos innecesarios, pensando en que lo va a leer un cliente y no un programador.
```

Si tu asistente no puede leer el proyecto completo, córtalo: pega la Fase 1 sola, dale los archivos de los formularios y la base de datos, y sigue desde ahí. O sáltate este prompt y ve punto por punto, con los de abajo.

Lo que viene es el detalle de cada uno: por qué importa, cómo lo revisas con tus propios ojos y el prompt para resolverlo.

---

## 1. 📄 Política de privacidad

Si pides un correo, ya tratas datos personales. La política es el documento donde explicas qué pides, para qué, con qué base legal, cuánto tiempo lo guardas y a quién le reclama la persona si algo sale mal.

Una política copiada de otra empresa es peor que no tenerla: describe un negocio que no es el tuyo, y eso se nota en el primer reclamo.

### Cómo revisarlo

1. Abre tu formulario y haz la lista de lo que pide. Cada campo tiene que aparecer en la política.
2. Verifica que diga quién es el responsable, con nombre legal y un correo que alguien lea.
3. Confirma que se enlace desde el pie de página y desde el formulario mismo, antes de enviar.

### Prompt para tu IA

```text
Revisa mi proyecto y haz la lista de todos los datos personales que pide, con el archivo y el campo donde se piden. Con esa lista redacta un borrador de política de privacidad que describa solo lo que mi proyecto hace de verdad: qué datos, para qué, por cuánto tiempo y quién responde. No copies el texto de otra empresa. Marca como "confirmar con abogado" todo lo que dependa de la ley de mi país, y dime desde dónde debería enlazarse el documento.
```

---

## 2. 📜 Términos y condiciones

Son las reglas del servicio: qué entregas, qué no, qué pasa si alguien hace mal uso, cómo se termina la relación y con qué ley se resuelve un conflicto. Sin ellos, cualquier desacuerdo se discute sin texto de respaldo.

### Cómo revisarlo

1. Que digan qué es el servicio y qué no incluye.
2. Que nombren la ley y el país que aplican.
3. Que tengan fecha de versión. Cuando cambian, la fecha cambia.

### Prompt para tu IA

```text
Redacta un borrador de términos y condiciones a partir de lo que hace el código, no de lo que sería ideal: qué entrega el servicio, qué no incluye, cómo termina la relación y qué pasa si alguien hace mal uso. Deja señalados el país y la ley que aplican para que yo los complete, agrega fecha de versión y marca cada punto que un abogado deba confirmar.
```

---

## 3. ✂️ Pide solo los datos que necesitas

Cada campo extra es riesgo guardado. La fecha de nacimiento que nadie usa, la cédula que pediste «por si acaso», la dirección exacta cuando bastaba la provincia: todo eso hay que protegerlo, justificarlo y borrarlo algún día.

Es el punto más fácil de cerrar y el que más riesgo quita. Se cierra borrando.

### Cómo revisarlo

1. Por cada campo, responde en una frase qué haces con ese dato. Si no puedes, fuera.
2. Revisa qué datos pide la IA en la conversación. Los agentes piden más de lo que nadie planeó.
3. Mira los campos ocultos: IP, user agent, identificadores de anuncios. También son datos.

### Prompt para tu IA

```text
Haz la lista de cada campo que piden mis formularios y de cada dato que guardo sin pedirlo: IP, user agent, identificadores, metadatos. Para cada uno, busca en el código dónde se usa de verdad. Dime cuáles no se usan en ninguna parte y prepara el cambio para quitarlos del formulario, de la base de datos y de los correos. Muéstrame el cambio antes de aplicarlo.
```

---

## 4. 🗓️ Define cuánto tiempo guardas los datos

«Para siempre» no es un plazo. Un lead de hace tres años que nunca compró sigue siendo una persona con derechos y una fila que te puede filtrar.

### Cómo revisarlo

1. Asigna un plazo por tipo de dato. Un lead no dura lo mismo que una factura, que suele tener plazo fiscal propio.
2. Deja escrito el plazo en la política, no solo en tu cabeza.
3. Monta la limpieza como tarea programada. Un plazo que nadie ejecuta es decorativo.

### Prompt para tu IA

```text
Lista las tablas que guardan datos personales y propón un plazo de conservación por tipo de dato, explicando el criterio de cada uno y señalando los que puedan tener plazo fiscal o legal propio. Después escribe la tarea programada que borre o anonimice lo vencido, con una ejecución en seco que me muestre qué borraría antes de borrar nada.
```

---

## 5. 🙋 Que pueda ver, corregir y borrar sus datos

En México se llaman derechos ARCO —acceso, rectificación, cancelación y oposición— y la idea se repite, con otros nombres, en casi toda la región. La persona puede pedirte copia de lo suyo, corregirlo, borrarlo u oponerse a cierto uso.

El problema no es el derecho. Es que el primer pedido llega y nadie sabe quién lo atiende ni en cuántos días.

### Cómo revisarlo

1. Publica un canal concreto: un correo o un formulario, no «contáctanos».
2. Prueba el proceso tú mismo, con una cuenta de prueba, de principio a fin.
3. Verifica que al borrar se borre de verdad: base de datos, respaldos, herramienta de correos y hojas de cálculo sueltas.

### Prompt para tu IA

```text
Revisa si una persona puede ver, corregir y borrar sus datos en mi proyecto. Si no puede, propón el camino más simple con lo que ya tengo montado. Rastrea todos los lugares donde queda copia de un mismo dato —base, respaldos, herramienta de correos, logs, archivos exportados— y dame el procedimiento de borrado completo, con los pasos para probarlo con una cuenta de prueba.
```

---

## 6. ☑️ Casilla sin marcar, y guarda quién aceptó y cuándo

Una casilla premarcada no es consentimiento. Y un consentimiento que no puedes demostrar, en la práctica, no existe.

Esto es dos cambios de código, no uno: quitar el `checked` y guardar el registro.

### Cómo revisarlo

1. Busca `checked` en los formularios. No debe estar en la casilla de términos.
2. Guarda cuatro cosas al aceptar: quién, qué versión del texto, cuándo y desde dónde.
3. Confirma que el envío se rechaza sin la casilla, en el servidor y no solo en el navegador.

### Prompt para tu IA

```text
Busca en mis formularios las casillas de aceptación que vengan marcadas y quítales el estado inicial. Agrega el registro del consentimiento junto al dato: quién aceptó, qué versión del texto, cuándo y desde dónde. Valida en el servidor, no solo en el navegador, que no se pueda enviar sin aceptar, y dame las pruebas que lo demuestran.
```

---

## 7. ✉️ Permiso aparte para enviar marketing

Aceptar los términos para usar el servicio no es aceptar recibir promociones. Son dos permisos distintos y necesitan dos casillas distintas.

### Cómo revisarlo

1. Separa la casilla de marketing de la de términos. Que esta también venga sin marcar.
2. Guarda el permiso por persona, no por lista. La lista cambia de herramienta; el permiso tiene que viajar con el dato.
3. Pon la baja en cada correo y pruébala. Una baja rota es un reclamo con prueba incluida.

### Prompt para tu IA

```text
Separa el permiso de marketing del de términos: dos casillas distintas, ninguna marcada. Guarda el permiso junto a la persona y no solo dentro de la herramienta de correos. Revisa que cada correo lleve enlace de baja, que la baja funcione de punta a punta y que quede registrada; dime cómo probarla sin mandarle nada a un cliente real.
```

---

## 8. 🍪 Nada de analítica ni anuncios hasta que acepten

Si el píxel se carga al abrir la página, el rastreo ya ocurrió y el banner llegó tarde. Y rechazar tiene que costar lo mismo que aceptar: si «Aceptar todo» es un botón y rechazar son tres clics escondidos, el consentimiento no es libre.

### Cómo revisarlo

1. Abre la web en una ventana nueva y mira la pestaña de red antes de tocar el banner. Si ya salieron llamadas a analítica o anuncios, está mal.
2. Que «Rechazar» esté al mismo nivel visual que «Aceptar».
3. Deja una forma de cambiar de opinión después, en el pie de página.

### Prompt para tu IA

```text
Revisa qué scripts de analítica, píxeles y anuncios carga mi web, y en qué momento de la carga lo hacen. Prepara el cambio para que ninguno se ejecute antes del consentimiento, con un banner donde rechazar cueste lo mismo que aceptar y se pueda cambiar de opinión después. Explícame cómo verificarlo en la pestaña de red con una ventana limpia.
```

---

## 9. 🔗 Di a qué proveedores mandas datos

Tu formulario no termina en tu servidor. Pasa por el hosting, la base de datos, el modelo de IA, la pasarela de pagos, la herramienta de correos y la analítica. Cada uno recibe datos, y varios están en otro país.

Eso se declara. Es la parte de la política que casi nadie completa, y la que más se nota cuando falta.

### Cómo revisarlo

1. Haz la lista de servicios a los que sale cada dato, mirando las integraciones del código.
2. Anota en qué país está cada uno. Si hay transferencia internacional, la política lo dice.
3. Revisa que tengas contrato o términos aceptados con cada uno, no solo una cuenta abierta.

### Prompt para tu IA

```text
Recorre las integraciones del proyecto y arma la lista de terceros que reciben datos personales: base de datos, modelo de IA, pagos, correo, analítica, hosting, webhooks. Para cada uno dime qué dato recibe, desde qué parte del código y en qué país está alojado. Devuélvemelo como tabla lista para pegar en la política de privacidad, marcando las transferencias internacionales.
```

---

## 10. 🤖 Que los datos de tus usuarios no entrenen un modelo

Esto se decide en la configuración, no en el código. Algunos proveedores de IA, por defecto, pueden usar lo que les mandas para mejorar sus modelos; otros no lo hacen cuando usas la API. La diferencia entre un plan y otro, o entre la app y la API, cambia la respuesta.

Si tu agente recibe síntomas, datos de pagos o conversaciones de clientes, esto deja de ser un detalle.

### Cómo revisarlo

1. Entra al panel de tu proveedor de IA y busca la opción de uso de datos para entrenamiento. Confirma cómo está, no cómo crees que está.
2. Si manejas datos sensibles, revisa qué dicen sus condiciones para empresas y si necesitas un acuerdo aparte.
3. Si envías conversaciones a un tercero, dilo en la política. Es un proveedor más del punto 9.

### Prompt para tu IA

```text
Identifica qué proveedor de IA uso, con qué plan y por qué vía, y qué datos personales le envío en cada llamada. Dime dónde se configura el uso de datos para entrenamiento en ese proveedor y qué dicen sus condiciones actuales; si no puedes confirmarlo, dímelo en vez de suponerlo. Propón además qué datos puedo dejar de enviarle sin romper la función.
```

---

## 11. 💵 Precio final, sin cargos ocultos

El monto que la persona ve al decidir tiene que ser el que se le cobra. Impuestos, comisiones y cargos de envío van incluidos o, al menos, visibles antes de pagar y no en la pantalla de confirmación.

### Cómo revisarlo

1. Compra tu propio producto y compara el precio anunciado con el cobrado.
2. Si el impuesto cambia por país, muéstralo antes del último paso.
3. Si hay precio promocional, deja claro cuándo termina y cuál es el precio normal.

### Prompt para tu IA

```text
Revisa el flujo de pago y compara el precio que se muestra con el que se cobra, impuestos y cargos incluidos. Señala en qué pantalla aparece un monto por primera vez y en cuál cambia. Propón los cambios para que el precio final se vea antes de pedir datos de pago, y dime cómo se comporta si el impuesto depende del país.
```

---

## 12. 🔔 Avisa antes de la renovación automática

El cobro que nadie esperaba es la causa más común de una devolución y de una reseña mala. Un correo antes del cargo, con fecha y monto, cuesta diez minutos de automatización.

### Cómo revisarlo

1. Que la suscripción diga, al contratarla, que se renueva sola y cada cuánto.
2. Manda un aviso antes del cargo, con fecha, monto y cómo cancelar.
3. Prueba el aviso con una suscripción de prueba. Los correos automáticos se rompen en silencio.

### Prompt para tu IA

```text
Revisa cómo funcionan mis suscripciones y si existe algún aviso antes de la renovación automática. Si no existe, escribe el recordatorio con fecha, monto y cómo cancelar, y conéctalo al ciclo de cobro real. Dime cómo probarlo con una suscripción de prueba, sin cobrarle a nadie y sin mandar correos a clientes.
```

---

## 13. 🚪 Que cancelar sea igual de fácil que suscribirse

Si suscribirse son dos clics y cancelar es escribir un correo y esperar respuesta, la diferencia es deliberada y se ve. En Argentina, por ejemplo, el comercio electrónico debe ofrecer un botón de arrepentimiento visible. La dirección es la misma en toda la región: la salida se parece a la entrada.

### Cómo revisarlo

1. Que la cancelación esté en el mismo lugar donde se contrató, dentro de la cuenta.
2. Que no exija llamada, chat ni aprobación de nadie.
3. Que llegue confirmación por escrito, con la fecha en que termina el servicio.

### Prompt para tu IA

```text
Cuenta los pasos que toma suscribirse en mi proyecto y los que toma cancelar, y muéstrame los dos caminos. Si cancelar toma más, propón el flujo de baja desde la misma cuenta, sin llamada ni aprobación de nadie, con confirmación por escrito y fecha de fin del servicio. Muéstrame el cambio antes de aplicarlo.
```

---

## 14. 🖼️ Licencias de imágenes, fuentes y código

La IA propone assets con mucha seguridad y poca documentación. Una fuente de pago usada como gratuita, una foto de un banco de imágenes sin licencia comercial o una librería con licencia que obliga a publicar tu código: los tres se descubren con una carta, no con un error de consola.

### Cómo revisarlo

1. Lista imágenes, fuentes, iconos y plantillas, y anota de dónde salió cada uno y con qué licencia.
2. Revisa las licencias de tus dependencias. Hay licencias que exigen publicar los cambios o incluir el aviso del autor.
3. Guarda el comprobante de cada compra. Dentro de un año no vas a recordar dónde la compraste.

### Prompt para tu IA

```text
Haz el inventario de imágenes, fuentes, iconos, plantillas y dependencias del proyecto, con el origen y la licencia de cada uno. Marca las que no permiten uso comercial, las que exigen atribución y las que obligan a publicar mi código. Dime qué avisos de licencia faltan y qué conviene reemplazar. No supongas una licencia que no puedas verificar: déjala como pendiente.
```

---

## 15. ⚖️ Que un abogado de tu país lo revise antes de lanzar

Es lo único de esta lista que la IA no puede hacer por ti.

Los puntos anteriores se revisan en el código y se arreglan en el código. Este no. La ley que aplica depende de dónde está tu negocio, de dónde viven tus clientes y del tipo de dato que tocas. Y entre países cambia lo suficiente como para que una guía general no alcance.

Los nombres de las leyes cambian poco. Los reglamentos, los plazos y las multas cambian seguido.

| País | Norma principal de datos personales |
|---|---|
| Argentina | Ley 25.326 |
| Brasil | LGPD, Ley 13.709 |
| Chile | Ley 19.628, con reforma reciente |
| Colombia | Ley 1581 de 2012 |
| Costa Rica | Ley 8968 |
| Ecuador | Ley Orgánica de Protección de Datos Personales |
| México | LFPDPPP, derechos ARCO |
| Perú | Ley 29733 |
| Uruguay | Ley 18.331 |

Esta tabla es para que sepas qué buscar y de qué hablar, no para citarla en un documento. Confirma la versión vigente antes de usar cualquiera de estos nombres en un texto legal.

Llega a esa reunión con el inventario de la Fase 1, los 15 puntos evaluados y las dudas marcadas como «confirmar con abogado». La revisión cuesta menos y sirve más cuando el trabajo sucio ya está hecho.

### Prompt para tu IA

```text
Arma el expediente para la revisión legal: el inventario de datos y proveedores, los 15 puntos con su estado y su evidencia, los borradores de política, términos y textos de consentimiento, y la lista de dudas marcadas como "confirmar con abogado". Ordénalo en un documento que un abogado pueda leer sin abrir el código, y escribe al inicio las cinco preguntas concretas que necesito que me responda.
```

---

## Checklist antes de publicar

- [ ] La política de privacidad describe mi proyecto, no otro.
- [ ] Los términos y condiciones tienen fecha de versión.
- [ ] Cada campo del formulario tiene un uso que puedo explicar en una frase.
- [ ] Cada tipo de dato tiene plazo de conservación y una tarea que lo borra.
- [ ] Hay un canal publicado para ver, corregir y borrar datos, y lo probé.
- [ ] La casilla de términos no viene marcada y queda registro de quién aceptó y cuándo.
- [ ] El permiso de marketing es una casilla aparte, con baja funcionando.
- [ ] Ninguna analítica ni píxel se carga antes del consentimiento, y rechazar es igual de fácil.
- [ ] La política nombra los proveedores que reciben datos y sus países.
- [ ] Confirmé en el panel que mi proveedor de IA no entrena con los datos de mis usuarios.
- [ ] El precio mostrado es el que se cobra.
- [ ] Hay aviso antes de cada renovación automática y lo probé.
- [ ] Cancelar toma los mismos pasos que suscribirse.
- [ ] Cada imagen, fuente y dependencia tiene licencia que permite este uso.
- [ ] Un abogado de mi país revisó los textos antes de publicarlos.

Repite la revisión cuando agregues un formulario, un cobro, una integración o un agente que conversa. Esos cuatro cambios son los que mueven la lista.

---

## Límites de esta guía

- No es asesoría legal y no reemplaza a un abogado de tu país.
- Un prompt no debe aplicar cambios en producción sin revisión, respaldo y pruebas.
- Si tratas datos de salud, de menores, biométricos o financieros, estos controles son el mínimo y no el objetivo.
- Si tus clientes están en otra región, pueden aplicar reglas adicionales a las de tu país.

---

## ¿Y ahora qué sigue?

Si la lista te dejó varios puntos en rojo, no hace falta reconstruir nada. Empieza por los tres que se arreglan en una tarde: quitar los campos que no usas, destildar la casilla de términos y mover la analítica detrás del consentimiento.

Lo demás se ordena con el prompt de arriba y una reunión con tu abogado.

Y si lo que te pesa no es esta lista sino el tiempo que se te va atendiendo mensajes, confirmando citas y copiando datos de un lado a otro, eso es lo que hacemos en **AbdiSmart**: agentes de IA y automatización de procesos, armados sobre lo que ya existe en tu operación, con los permisos y los límites definidos desde el primer día.

Cuéntame cuál tarea te quita más tiempo y la revisamos juntos.

[Hablemos de tu agente o automatización](https://cal.com/geiner-porras-aj8irz/ia-30min)
