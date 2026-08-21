// Lo mínimo del SDK de Supabase que la landing usa de verdad: insertar filas.
//
// Antes las tres páginas que escriben en la base traían
// @supabase/supabase-js@2 desde cdn.jsdelivr.net con un <script> sin async.
// Eso costaba, antes de poder pintar nada:
//
//   · abrir DNS + TLS a un tercer dominio,
//   · descargar unos 55 KB comprimidos y ejecutar unos 180 KB de JavaScript,
//   · y quedar en la lista de "JavaScript heredado" de Lighthouse, porque el
//     paquete publica ES5 con sus polyfills.
//
// Todo para cuatro inserciones que la API REST de Supabase acepta como un POST
// normal. Quien protege las tablas sigue siendo RLS: la anon key es pública
// por diseño y viaja en el HTML igual que antes.
//
// Se conserva la forma del SDK —`db.from(tabla).insert(fila)` que resuelve a
// `{ error }`— para que los sitios donde se llama no cambien. El error se
// devuelve tal como lo manda PostgREST, con su `code`, porque empezar.html
// distingue por ese campo si falta una columna (ver isMissingColumn).
//
// Va en <head> y sin defer a propósito: los scripts en línea del final del
// body corren antes que los diferidos, así que con defer llegaría tarde.
window.AbdiSupabase = {
  createClient: function (url, anonKey) {
    var base = String(url).replace(/\/+$/, '') + '/rest/v1/';
    return {
      from: function (table) {
        return {
          insert: function (row) {
            return fetch(base + encodeURIComponent(table), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: anonKey,
                Authorization: 'Bearer ' + anonKey,
                Prefer: 'return=minimal'
              },
              body: JSON.stringify(row)
            }).then(function (res) {
              if (res.ok) return { error: null, status: res.status };
              return res.text().then(function (texto) {
                var cuerpo;
                try { cuerpo = JSON.parse(texto); } catch (e) { cuerpo = { message: texto }; }
                if (!cuerpo || typeof cuerpo !== 'object') cuerpo = { message: String(cuerpo) };
                if (!cuerpo.message) cuerpo.message = 'HTTP ' + res.status;
                return { error: cuerpo, status: res.status };
              });
            }).catch(function (e) {
              // Un fallo de red no trae cuerpo. Se devuelve con la misma forma
              // para que quien llama solo tenga que mirar `error`.
              return { error: { message: String((e && e.message) || e), code: 'network' }, status: 0 };
            });
          }
        };
      }
    };
  }
};
