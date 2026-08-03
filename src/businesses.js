export const BUSINESSES = {
  abdismart: {
    name: 'Abdismart',
    whatsapp: '50689814520',
    knowledge: `
Abdismart crea landing pages profesionales y soluciones de atención para consultorios, laboratorios y negocios de odontología en Costa Rica.
Trabajamos con distintas especialidades de salud; si el visitante escribe una especialidad concreta, consérvala y úsala para entender su operación.
Servicios:
- Landing pages: web profesional, dominio, hosting, SEO básico y soporte en español. La entrega estándar es en 48 horas hábiles después del pago y de recibir la información completa.
- Agentes con IA: responden consultas, organizan mensajes y ayudan a convertir conversaciones en citas.
- Automatizaciones: reducen tareas manuales como confirmaciones, recordatorios, seguimientos y recuperación de citas canceladas.
El programa Crece con Abdi ofrece condiciones especiales para los primeros 10 negocios aceptados.
Para precios, alcance definitivo o disponibilidad, captura los datos del visitante y ofrece contacto humano.
WhatsApp de Abdismart: +506 8981 4520.
No inventes precios, descuentos, integraciones o plazos distintos a los indicados.
`
  }
};

export function getBusiness(key) {
  return BUSINESSES[key] || BUSINESSES.abdismart;
}
