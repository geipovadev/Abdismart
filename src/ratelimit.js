// Tope de ráfagas por IP para los endpoints que cuestan dinero o escriben.
//
// Faltaba justo donde más duele: /api/agent/chat llama a OpenAI en cada
// mensaje y no tenía ningún tope, así que un script podía dejar la factura
// corriendo toda la noche.
//
// Se apoya en el limitador nativo de Cloudflare, que cuenta en el borde. No
// consulta Supabase, no agrega latencia y no deja una fila por intento —que
// es justo lo que un abusador querría provocar—.
//
// Esto NO reemplaza los topes diarios de preview.js y diagnostico.js: aquellos
// limitan el gasto del día completo, este corta la ráfaga del minuto. Son dos
// preguntas distintas y conviven.

/**
 * @param binding limitador declarado en wrangler.jsonc (env.RL_*)
 * @returns true si hay que responder 429
 */
export async function superaTope(binding, request) {
  // En `wrangler dev` el binding puede no existir. Sin él no se bloquea a
  // nadie: un limitador ausente no puede volverse un 429 fantasma en local.
  if (typeof binding?.limit !== 'function') return false;
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  try {
    const { success } = await binding.limit({ key: ip });
    return !success;
  } catch (error) {
    // Si el limitador falla, se deja pasar. Preferimos atender de más que
    // dejar sin servicio a una persona real por un problema de infraestructura.
    console.error(JSON.stringify({ event: 'ratelimit_error', detalle: String(error).slice(0, 120) }));
    return false;
  }
}
