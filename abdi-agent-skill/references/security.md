# Seguridad y privacidad

- Servir el widget por HTTPS.
- Guardar secretos únicamente como variables del Worker o del proveedor de funciones.
- No exponer la service role key en frontend, repositorio, logs ni capturas.
- Validar longitud, tipo y formato de cada campo en el backend.
- Aplicar rate limiting y protección antiabuso al endpoint de chat.
- Mantener `store: false` en OpenAI y no persistir la transcripción completa.
- Separar datos por `business_key`, políticas RLS y proyecto Supabase cuando el riesgo lo justifique.
- Definir retención y borrado de leads con el cliente.
- En salud, no pedir ni almacenar diagnósticos clínicos o información sensible de pacientes.
- Registrar errores sin incluir mensajes completos, teléfonos ni claves.
