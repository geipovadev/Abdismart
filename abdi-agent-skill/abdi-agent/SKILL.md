---
name: abdi-agent
description: Instala, configura y adapta el agente conversacional Abdi para sitios web de negocios de servicios. Úsala cuando haya que implementar el widget de diagnóstico, conectar un endpoint compatible con OpenAI Responses y Supabase, definir el alcance y servicios de un cliente, cargar conocimiento aprobado, capturar un lead estructurado o desplegarlo en Cloudflare Workers.
---

# Abdi Agent

Empaqueta un agente de descubrimiento que conversa de forma humana, identifica el problema operativo de un negocio, recomienda una solución y captura únicamente una ficha estructurada para el CRM. El producto está pensado para reutilizarse en múltiples clientes sin mezclar sus datos ni conocimiento.

## Flujo de implementación

1. **Inspeccionar el destino.** Identifica el sitio, framework, backend, proveedor de base de datos y método de despliegue. No sobrescribas un endpoint ni variables existentes sin confirmarlo.
2. **Definir el cliente.** Completa `client.config.json` con nombre, WhatsApp, alcance, servicios y tono. Valida el archivo con `node scripts/validate-client-config.mjs client.config.json`.
3. **Preparar persistencia.** Ejecuta el SQL de `templates/supabase.sql`. La tabla `waitlist` recibe el lead y `agent_knowledge` contiene solo conocimiento aprobado. No guardes el historial completo del chat por defecto.
4. **Instalar el backend.** Copia el patrón de `templates/worker.js` o adapta el backend existente. Conserva: límite de turnos, salida JSON con esquema, `store: false`, validación de entrada, filtrado por `business_key` y secretos únicamente en variables de entorno.
5. **Instalar el widget.** Añade `templates/agent-widget.js` y `templates/agent-widget.css` a la landing y configura `data-endpoint` y `data-business`. El formulario de contacto debe guardar el diagnóstico antes de abrir WhatsApp.
6. **Educar al agente.** Sigue `references/education.md`: recopila información del cliente, conviértela en hechos verificables, crea entradas pendientes y apruébalas antes de que el modelo las use.
7. **Probar antes de publicar.** Prueba nombre, negocio dentro y fuera de alcance, respuestas libres, recomendación, captura de contacto, límite de turnos, error del proveedor y móvil. Ejecuta los validadores del paquete y `node --check` sobre los archivos JavaScript.
8. **Desplegar y entregar.** Configura secretos en el proveedor, publica el Worker y los assets, registra la URL del endpoint y entrega al cliente el checklist de `README.md`. Nunca incluyas `.env`, `.dev.vars` ni claves en Git.

## Reglas de comportamiento

- Hacer una sola pregunta principal por turno y reconocer la respuesta anterior.
- Aceptar texto libre; los botones son atajos, no campos obligatorios.
- Detectar el alcance del cliente antes de hacer un diagnóstico largo.
- Recomendar un solo servicio cuando exista evidencia suficiente.
- Redirigir preguntas ajenas al negocio con calidez, sin inventar respuestas.
- Finalizar después de un número fijo de turnos o cuando el diagnóstico sea suficiente.
- Capturar `problem_detected`, `impact`, `current_process`, `recommended_service`, nombre y WhatsApp; no guardar la transcripción completa.

## Recursos

- Instalación y operación: `README.md` en la raíz del producto.
- Arquitectura y contrato: `references/architecture.md`.
- Educación y aprobación de conocimiento: `references/education.md`.
- Seguridad y privacidad: `references/security.md`.
- Esquema de Supabase y ejemplos ejecutables: `templates/supabase.sql`.
- Configuración de cliente: `templates/client.config.example.json`.
- Validador: `scripts/validate-client-config.mjs`.

## Entrega para cada cliente

Documenta el `business_key`, dominio, número de WhatsApp, variables configuradas, alcance aprobado, servicios activos, fecha de la última carga de conocimiento, URL del endpoint y resultado de las pruebas. No compartas secretos ni datos de otros clientes.
