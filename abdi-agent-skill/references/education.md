# Educación del agente

## Qué recopilar

Pide al negocio únicamente información necesaria para responder:

- servicios y especialidades;
- horarios y zonas de atención;
- preguntas frecuentes y respuestas exactas;
- requisitos, políticas y límites;
- procesos que quieren automatizar;
- datos de contacto y ruta de escalamiento.

No cargues contraseñas, expedientes clínicos, números de tarjetas ni información personal de pacientes.

## Formato de conocimiento

Cada entrada debe ser autocontenida, verificable y específica:

```json
{
  "business_key": "clinica-demo",
  "title": "Horario de laboratorio",
  "content": "Las muestras se reciben de lunes a viernes de 7:00 a 15:00.",
  "source": "Documento de operaciones aprobado el 2026-08-02",
  "status": "pending"
}
```

## Flujo de aprobación

1. Crear como `pending`.
2. Revisar con el responsable del negocio.
3. Corregir ambigüedades y fechas.
4. Cambiar a `approved`.
5. Probar tres preguntas representativas.
6. Archivar (`archived`) entradas reemplazadas; no sobrescribir sin registro.

## Correcciones y aprendizaje

Cuando una respuesta falle, guarda el hecho correcto como una nueva entrada pendiente. No conviertas automáticamente la respuesta del usuario en conocimiento aprobado y no uses transcripciones completas como memoria.
