# Instalación por cliente

## 1. Verificar requisitos

- Node.js 20 o posterior.
- Cuenta de Cloudflare con Workers habilitado.
- Proyecto Supabase del cliente o aislamiento equivalente.
- API key de OpenAI.
- Sitio web o dominio donde se instalará el canal web.
- Para WhatsApp o Instagram: aplicación de Meta y cuenta profesional correspondiente.

No reutilizar secretos, tablas ni identificadores de otro cliente sin una decisión explícita de arquitectura multiempresa.

## 2. Crear la instalación

1. Copiar el kit a un repositorio del cliente.
2. Copiar `templates/client.config.example.json` como `client.config.json`.
3. Asignar un `business_key` único y estable.
4. Ejecutar `templates/supabase.sql` en Supabase.
5. Instalar `templates/worker.js` como Worker o trasladar sus contratos al backend existente.
6. Para web, copiar `templates/agent-widget.js` y `templates/agent-widget.css` a los assets públicos.
7. Configurar los secretos del backend.
8. Validar, desplegar y probar antes de conectar canales públicos.

## 3. Configurar secretos

Configurar siempre en el proveedor, nunca dentro de `client.config.json`:

```text
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Para WhatsApp:

```text
WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_APP_SECRET
WHATSAPP_VERIFY_TOKEN
```

Para Instagram:

```text
INSTAGRAM_ACCESS_TOKEN
INSTAGRAM_USER_ID
INSTAGRAM_VERIFY_TOKEN
META_APP_SECRET
```

## 4. Instalar el widget web

Insertar antes de `</body>` y sustituir el `business_key`:

```html
<link rel="stylesheet" href="/assets/agent-widget.css">
<script src="/assets/agent-widget.js" data-endpoint="/api/agent" data-business="clinica-demo" defer></script>
```

## 5. Validar la entrega

1. Ejecutar el validador de configuración.
2. Ejecutar pruebas y verificación de sintaxis.
3. Probar cada endpoint con entradas válidas, vacías y fuera de alcance.
4. Verificar que cada canal use el `business_key` correcto.
5. Confirmar que el traspaso humano llega al contacto del cliente.
6. Revisar que ninguna clave aparezca en Git, HTML, logs o capturas.
