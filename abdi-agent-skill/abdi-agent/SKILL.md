---
name: abdi-agent
description: Instala, configura y personaliza una instancia del agente conversacional Abdi para un cliente. Úsala para iniciar un onboarding guiado, interpretar PDF y otros documentos del negocio, extraer y aprobar identidad, alcance, servicios e información, conectar web, WhatsApp o Instagram, configurar Cloudflare/OpenAI/Supabase/Meta, validar aislamiento por business_key, probar canales o preparar una entrega reproducible sin copiar secretos ni mezclar datos entre clientes.
---

# Abdi Agent

Crear una instalación reutilizable a partir de configuración estructurada. Mantener separados los hechos del negocio, la conducta conversacional, los adaptadores de canal y los secretos.

## Inicio obligatorio

Cuando la persona invoque la skill sin entregar una configuración completa y aprobada, iniciar el onboarding de `../references/onboarding.md` antes de editar archivos o instalar canales.

- Explicar que la instalación de la skill no inicia el proceso automáticamente; usar `$abdi-agent` sí lo inicia.
- Preguntar primero si se creará un agente nuevo o se actualizará uno existente.
- Hacer de una a tres preguntas por turno y esperar la respuesta.
- Usar lenguaje cotidiano durante el onboarding.
- Resumir y pedir confirmación al terminar cada etapa.
- No pedir secretos dentro del chat.
- No ejecutar instalación ni despliegue hasta que la persona apruebe el resumen del negocio.
- Si existe una configuración, inspeccionarla y preguntar solo por datos faltantes o cambios.
- Si la persona adjunta un PDF u otro documento, leer `../references/document-intake.md`, usar la skill de archivo correspondiente y extraer primero una propuesta pendiente de aprobación.
- Después de aprobar la configuración, preguntar dónde instalar Abdi y ofrecer: sitio web, WhatsApp, Instagram, varios canales o instalar después.
- Leer `../GUIA-INSTALACION-POR-PLATAFORMA.md` y guiar únicamente el recorrido elegido, un paso por turno, confirmando cada paso antes de continuar.

## Flujo obligatorio

1. **Completar el onboarding.** Seguir `../references/onboarding.md` y obtener aprobación del resumen.
2. **Inspeccionar el destino.** Identificar repositorio, sitio, backend, datos, canales y despliegue. Preservar cambios existentes.
3. **Elegir aislamiento.** Asignar un `business_key` único y decidir si el cliente tendrá proyecto/Worker propios o una instalación multiempresa filtrada por esa clave.
4. **Instalar el kit.** Leer `../references/installation.md` y ejecutar solo los pasos de los canales solicitados.
5. **Crear la configuración.** Copiar `../templates/client.config.example.json` a `client.config.json`; completar las secciones en el orden de `../references/configuration.md`.
6. **Personalizar hechos.** Modelar servicios e información siguiendo `../references/personalization.md`. No convertir texto comercial ambiguo en una afirmación.
7. **Validar.** Ejecutar `node ../scripts/validate-client-config.mjs client.config.json`. Corregir todos los errores antes de generar código o datos.
8. **Preparar persistencia.** Aplicar `../templates/supabase.sql`. Insertar solo información `approved` en el contexto del agente.
9. **Conectar canales.** Instalar web, WhatsApp o Instagram según `channels`; verificar firmas, deduplicación, procesamiento asíncrono y traspaso humano.
10. **Probar.** Ejecutar las pruebas de aceptación de `../references/personalization.md`, pruebas automatizadas y verificación de compilación.
11. **Desplegar y entregar.** Configurar secretos en el proveedor, publicar, probar desde cuentas externas y documentar los identificadores sin revelar claves.

## Guardas

- No modificar el perfil conversacional solo para introducir datos de un cliente; usar configuración y conocimiento.
- No guardar secretos en JSON, plantillas, HTML, repositorio, logs o capturas.
- No mezclar conocimiento ni conversaciones entre `business_key`.
- No usar entradas `pending` o `archived` para responder.
- No inventar servicios, precios, plazos, resultados, horarios o cobertura.
- No desplegar una configuración que no pase el validador.
- No activar un canal sin probar entrada, salida, error y traspaso humano.

## Recursos

- Onboarding conversacional: `../references/onboarding.md`.
- Incorporación de PDF y documentos: `../references/document-intake.md`.
- Instalación guiada por plataforma: `../GUIA-INSTALACION-POR-PLATAFORMA.md`.
- Instalación y secretos: `../references/installation.md`.
- Contrato técnico y canales: `../references/configuration.md`.
- Entrevista, servicios, conocimiento y aceptación: `../references/personalization.md`.
- Arquitectura y endpoints: `../references/architecture.md`.
- Aprobación de conocimiento: `../references/education.md`.
- Seguridad y privacidad: `../references/security.md`.
- Configuración inicial: `../templates/client.config.example.json`.
- Persistencia: `../templates/supabase.sql`.
- Worker y widget: `../templates/worker.js`, `../templates/agent-widget.js`, `../templates/agent-widget.css`.
- Validador: `../scripts/validate-client-config.mjs`.

## Entrega por cliente

Registrar `business_key`, dominio, canales habilitados, IDs públicos de Meta, contacto humano, servicios activos, fecha de aprobación del conocimiento, endpoints, versión desplegada y resultado de pruebas. Entregar secretos por un canal seguro separado.
