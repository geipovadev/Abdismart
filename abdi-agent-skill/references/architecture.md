# Arquitectura y contrato

## Componentes

```text
Landing + widget
      │ POST /api/agent/chat
      ▼
Cloudflare Worker ── OpenAI Responses (JSON Schema, store:false)
      │
      └── POST /api/agent/lead ── Supabase waitlist
                               └─ agent_knowledge (solo approved)
```

El widget mantiene el contexto en el navegador durante una sesión. El backend no debe persistir la conversación completa; solo devuelve campos estructurados para que el cliente los acumule y los envíe al handler de lead.

## Contrato de chat

Entrada mínima:

```json
{
  "message": "La respuesta del visitante",
  "history": [{ "role": "user", "content": "..." }],
  "turn_count": 2,
  "business_key": "clinica-demo"
}
```

Respuesta mínima:

```json
{
  "answer": "Respuesta humana y breve",
  "discovery_stage": "problema",
  "known_name": "María",
  "business_type": "consultorio",
  "specialty": "odontología",
  "problem_detected": "...",
  "impact": "...",
  "current_process": "...",
  "recommended_service": "...",
  "capture_contact": false,
  "quick_replies": []
}
```

## Contrato de lead

El frontend llama `POST /api/agent/lead` con `nombre`, `whatsapp`, `business_key` y `diagnosis`. El backend valida el número, filtra el cliente y escribe una sola fila en `waitlist`. Debe responder con una URL de WhatsApp únicamente después de un `2xx` de Supabase.

## Separación multi-cliente

- Cada cliente tiene un `business_key` único.
- Todas las consultas a `agent_knowledge` filtran por `business_key` y `status=approved`.
- Nunca incluyas conocimiento de un cliente en el prompt de otro.
- Si el cliente no tiene conocimiento aprobado, el agente debe reconocer la limitación y ofrecer contacto humano.
