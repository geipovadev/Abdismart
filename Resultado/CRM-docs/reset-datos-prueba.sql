-- Deja el CRM en cero para una ronda nueva de pruebas.
--
-- Borra los datos operativos: leads, clientes, briefs, diagnósticos, vistas
-- previas, prospección, conversaciones de WhatsApp y analítica.
--
-- CONSERVA a propósito tres cosas:
--   · public.crm_users       — directorio interno del equipo
--   · auth.users             — cuentas de acceso al CRM
--   · public.agent_knowledge — conocimiento del negocio ya aprobado
--
-- Vaciar las dos primeras deja a todo el mundo fuera del CRM hasta recrear
-- los usuarios a mano en Supabase Auth. La tercera obliga a volver a aprobar
-- la memoria del agente desde cero.
--
-- Por qué el paso 2 se ve más complicado de lo que parecería necesario:
-- la base tiene tablas que ninguna migración de este repo crea (`brief_answers`
-- fue la primera en aparecer, apuntando a `clients`). Una lista escrita a mano
-- se queda corta con la siguiente, así que el bloque parte de las tablas
-- conocidas y sigue las llaves foráneas hasta cerrar el grafo. Si el recorrido
-- llegara a una tabla de la lista protegida, aborta sin borrar nada.
--
-- Cómo se corre: editor SQL del proyecto, paso por paso.

-- ---------------------------------------------------------------------------
-- 1. Radiografía previa: filas de CADA tabla del esquema público, incluidas
--    las que no están en ninguna migración. Correlo solo y revisá los números
--    antes de seguir: si no se parecen a lo que esperás, estás en el proyecto
--    equivocado.
-- ---------------------------------------------------------------------------
select
  table_name as tabla,
  (xpath(
    '/row/c/text()',
    query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name),
                 false, true, '')
  ))[1]::text::bigint as filas
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by filas desc, tabla;

-- ---------------------------------------------------------------------------
-- 2. El borrado.
-- ---------------------------------------------------------------------------
do $$
declare
  protegidas text[] := array[
    'public.crm_users',
    'public.agent_knowledge'
  ];
  semillas text[] := array[
    'public.waitlist',
    'public.clients',
    'public.brief_answers',
    'public.page_views',
    'public.diagnostic_sessions',
    'public.preview_generations',
    'public.preview_events',
    'public.prospecting_identities',
    'public.prospecting_leads',
    'public.whatsapp_conversations',
    'public.whatsapp_events',
    'public.agent_learning_candidates'
  ];
  objetivo oid[] := '{}';
  nombre text;
  nuevas oid[];
  conflicto text;
begin
  -- 2.a Semillas que existan de verdad. Una tabla ausente se omite: el
  --     proyecto puede no tener aplicadas todas las migraciones.
  foreach nombre in array semillas loop
    if to_regclass(nombre) is not null then
      objetivo := objetivo || to_regclass(nombre)::oid;
    else
      raise notice 'No existe, se omite: %', nombre;
    end if;
  end loop;

  if cardinality(objetivo) = 0 then
    raise notice 'No se encontró ninguna tabla. Nada que borrar.';
    return;
  end if;

  -- 2.b Arrastrar toda tabla que apunte a las anteriores, y las que apunten
  --     a esas, hasta que no aparezcan más. Esto es lo que evita el error
  --     "cannot truncate a table referenced in a foreign key constraint"
  --     sin recurrir a CASCADE, que borraría a ciegas.
  loop
    select coalesce(array_agg(distinct c.conrelid), '{}')
      into nuevas
      from pg_constraint c
     where c.contype = 'f'
       and c.confrelid = any(objetivo)
       and not (c.conrelid = any(objetivo));

    exit when cardinality(nuevas) = 0;

    objetivo := objetivo || nuevas;
    raise notice 'Se añaden por dependencia: %',
      (select string_agg(o::regclass::text, ', ') from unnest(nuevas) o);
  end loop;

  -- 2.c Ninguna tabla protegida puede haber entrado por la puerta de atrás.
  select string_agg(p, ', ') into conflicto
    from unnest(protegidas) p
   where to_regclass(p) is not null
     and to_regclass(p)::oid = any(objetivo);

  if conflicto is not null then
    raise exception
      'Abortado sin borrar nada: el recorrido alcanza tablas que se deben conservar (%). Revisar esa dependencia a mano.',
      conflicto;
  end if;

  execute 'truncate table '
       || (select string_agg(o::regclass::text, ', ') from unnest(objetivo) o)
       || ' restart identity';

  raise notice 'Vaciadas (%): %', cardinality(objetivo),
    (select string_agg(o::regclass::text, ', ') from unnest(objetivo) o);
end $$;

-- ---------------------------------------------------------------------------
-- 3. Comprobación: repetí la consulta del paso 1.
--    Solo deberían quedar con filas crm_users y agent_knowledge.
--    Si alguna otra tabla sigue con datos, es una que no tiene llave foránea
--    hacia las conocidas: añadila a `semillas` y volvé a correr el paso 2.
-- ---------------------------------------------------------------------------
select count(*) as cuentas_de_acceso from auth.users;
