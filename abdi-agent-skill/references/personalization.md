# Personalización del negocio

## Entrevista inicial

Recopilar y confirmar:

1. Nombre comercial y descripción en una frase.
2. Tipos de personas o empresas atendidas.
3. Servicios activos y nombres exactos.
4. Qué hace, incluye y excluye cada servicio.
5. Resultado razonable que puede explicarse sin prometer.
6. Precios publicados o política para cotizar.
7. Horarios, ubicaciones, cobertura y requisitos.
8. Preguntas frecuentes con respuestas aprobadas.
9. Casos que deben pasar a una persona.
10. Canal y horario del equipo humano.

No recopilar contraseñas, datos de pago, expedientes, información clínica de pacientes ni conversaciones privadas.

## Crear un servicio

Usar una entrada por servicio:

```json
{
  "key": "consulta-inicial",
  "name": "Consulta inicial",
  "description": "Primera valoración realizada por el equipo profesional.",
  "outcome": "Permite definir el siguiente paso adecuado.",
  "includes": ["entrevista inicial", "revisión del caso"],
  "excludes": ["tratamientos no confirmados"],
  "price": "Se confirma según el caso.",
  "active": true
}
```

- Usar `active: false` para retirar un servicio sin borrar su historial.
- No inferir prestaciones, precios ni resultados.
- Separar servicios distintos aunque compartan parte del proceso.

## Crear información aprobada

Cada hecho debe entenderse sin depender de otra fila:

```json
{
  "title": "Horario de atención",
  "content": "Se atiende de lunes a viernes de 8:00 a 17:00.",
  "source": "Confirmado por Operaciones el 2026-08-14",
  "status": "pending"
}
```

Flujo obligatorio:

1. Crear como `pending`.
2. Revisar exactitud, alcance y privacidad.
3. Obtener aprobación del cliente.
4. Cambiar a `approved`.
5. Probar al menos una pregunta directa y una ambigua.
6. Archivar la entrada reemplazada.

## Pruebas de aceptación

Preparar al menos 12 casos:

- identidad del negocio;
- explicación de cada servicio;
- inclusiones y exclusiones;
- precio conocido y precio no publicado;
- horario y ubicación;
- consulta fuera de alcance;
- información inexistente;
- solicitud de atención humana;
- un mensaje por cada canal habilitado;
- audio en los canales que lo admitan.

Considerar lista la personalización solo cuando el cliente confirme que las respuestas factuales son correctas y que el traspaso humano funciona.
