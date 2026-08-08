const APIFY_BASE_URL = 'https://api.apify.com/v2';
const MAX_ITEMS_PER_RUN = 250;
export const PROSPECTING_AGENT_NAME = 'Abdi Leads';

const SOURCE_ACTOR_ENV = {
  instagram: 'APIFY_INSTAGRAM_ACTOR_ID',
  facebook: 'APIFY_FACEBOOK_ACTOR_ID',
  google: 'APIFY_GOOGLE_ACTOR_ID',
  linkedin: 'APIFY_LINKEDIN_ACTOR_ID'
};

const HEALTH_TERMS = ['clinica', 'clínica', 'consultorio', 'odont', 'dental', 'dentista', 'laboratorio', 'fisioterapia', 'psicolog', 'nutrici', 'dermatolog', 'medic', 'salud', 'terapia'];

function text(value, max = 500) {
  return String(value ?? '').replace(/[\x00-\x1f]/g, ' ').trim().slice(0, max);
}

function first(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function normalizePhone(value) {
  const digits = text(value, 40).replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 8 ? '506' + digits : digits;
}

function normalizeDomain(value) {
  const raw = text(value, 500);
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch { return ''; }
}

function normalizeProfileUrl(value) {
  const raw = text(value, 700);
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    return (url.hostname.toLowerCase().replace(/^www\./, '') + url.pathname.replace(/\/+$/, '').toLowerCase());
  } catch { return ''; }
}

function slug(value) {
  return text(value, 250).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function includesAny(value, terms) {
  const haystack = text(value, 2000).toLowerCase();
  return terms.some(term => haystack.includes(term));
}

export function normalizeProspect(raw, source) {
  const name = text(first(raw, ['name', 'title', 'fullName', 'companyName', 'pageName', 'placeName']), 180);
  const profileUrl = text(first(raw, ['url', 'profileUrl', 'profileLink', 'pageUrl', 'facebookUrl', 'instagramUrl', 'linkedinUrl']), 700);
  const website = text(first(raw, ['website', 'websiteUrl', 'companyWebsite', 'externalUrl']), 700);
  const phone = normalizePhone(first(raw, ['phone', 'phoneNumber', 'telephone', 'contactPhone']));
  const email = text(first(raw, ['email', 'contactEmail', 'businessEmail']), 180).toLowerCase();
  const address = text(first(raw, ['address', 'streetAddress', 'location', 'city']), 300);
  const category = text(first(raw, ['category', 'categoryName', 'industry', 'businessCategory']), 180);
  const description = text(first(raw, ['description', 'bio', 'about', 'subtitle', 'intro']), 1200);
  const followers = Number(first(raw, ['followersCount', 'followers', 'followerCount'])) || 0;
  const reviews = Number(first(raw, ['reviewsCount', 'reviewCount', 'numberOfReviews'])) || 0;
  const rating = Number(first(raw, ['rating', 'totalScore', 'stars'])) || 0;
  const domain = normalizeDomain(website);
  const normalizedProfile = normalizeProfileUrl(profileUrl);
  const identity = slug(name + '-' + (address || category));
  const fingerprints = [domain && 'domain:' + domain, phone && 'phone:' + phone, normalizedProfile && 'profile:' + normalizedProfile, email && 'email:' + email, identity && 'identity:' + identity].filter(Boolean);
  return { source, source_url: profileUrl, name, website, domain, phone, email, address, category, description, followers, reviews, rating, fingerprints, raw };
}

export function qualifyProspect(prospect) {
  const context = prospect.name + ' ' + prospect.category + ' ' + prospect.description;
  const isHealth = includesAny(context, HEALTH_TERMS);
  const isCostaRica = includesAny(prospect.address + ' ' + prospect.description, ['costa rica', 'san jos', 'heredia', 'alajuela', 'cartago', 'guanacaste', 'limón', 'limon', 'puntarenas']);
  const appointmentBusiness = includesAny(context, ['cita', 'appointment', 'reserva', 'consulta', 'paciente', 'agenda']);
  const hasWebsite = Boolean(prospect.domain);
  const hasAudience = prospect.followers >= 500 || prospect.reviews >= 20;
  const scores = {
    landing: (isHealth ? 25 : 0) + (isCostaRica ? 15 : 0) + (!hasWebsite ? 35 : 0) + (prospect.source !== 'google' ? 10 : 0) + (hasAudience ? 10 : 0),
    agentes: (isHealth ? 25 : 0) + (isCostaRica ? 15 : 0) + (hasAudience ? 25 : 5) + (appointmentBusiness ? 20 : 0) + (prospect.phone ? 5 : 0),
    automatizaciones: (isHealth ? 30 : 0) + (isCostaRica ? 15 : 0) + (appointmentBusiness ? 30 : 0) + (prospect.reviews >= 40 ? 10 : 0) + (prospect.phone ? 5 : 0)
  };
  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const signals = [isHealth && 'negocio de salud', isCostaRica && 'ubicación en Costa Rica', !hasWebsite && 'sin sitio web visible', hasAudience && 'demanda digital comprobable', appointmentBusiness && 'operación basada en citas'].filter(Boolean);
  return { score: winner[1], recommended_service: winner[0], service_scores: scores, signals, qualified: isHealth && winner[1] >= 45 };
}

export function createOutreachCopy(prospect, qualification) {
  const name = prospect.name || 'tu negocio';
  const copies = {
    landing: 'Hola, vi ' + name + ' y noté que su presencia digital podría explicar mejor sus servicios. En Abdismart ayudamos a consultorios a convertir búsquedas en consultas. ¿Te comparto una observación puntual?',
    agentes: 'Hola, estuve revisando ' + name + '. Cuando las consultas llegan por varios canales, responder tarde puede costar citas. En Abdismart creamos una recepción con IA que responde con información aprobada. ¿Te comparto cómo aplicaría a su caso?',
    automatizaciones: 'Hola, vi que ' + name + ' trabaja con citas. En Abdismart automatizamos confirmaciones, reprogramaciones y recuperación de espacios cancelados. ¿Te comparto un ejemplo breve del flujo?'
  };
  return {
    first_message: copies[qualification.recommended_service],
    follow_up: 'Hola, retomo este mensaje por si esta mejora está entre sus prioridades. Si no es el momento, no vuelvo a escribir.',
    cta: '¿Te comparto una observación puntual?'
  };
}

async function runApifyActor(env, source, input) {
  if (!env.APIFY_TOKEN) throw new Error('APIFY_TOKEN no está configurado.');
  const envName = SOURCE_ACTOR_ENV[source];
  const actorId = env[envName];
  if (!actorId) throw new Error(envName + ' no está configurado.');
  const actorPath = encodeURIComponent(actorId).replace(/%7E/gi, '~');
  const response = await fetch(APIFY_BASE_URL + '/actors/' + actorPath + '/run-sync-get-dataset-items?clean=true&format=json', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.APIFY_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify(input || {})
  });
  if (!response.ok) throw new Error('Apify respondió ' + response.status + ': ' + (await response.text()).slice(0, 300));
  const items = await response.json();
  return Array.isArray(items) ? items.slice(0, MAX_ITEMS_PER_RUN) : [];
}

async function persistProspect(env, campaignId, prospect, qualification, copy) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { status: 'preview' };
  const response = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/prospecting_upsert_lead', {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ p_campaign_id: campaignId, p_lead: { ...prospect, raw: undefined }, p_fingerprints: prospect.fingerprints, p_qualification: qualification, p_copy: copy })
  });
  if (!response.ok) throw new Error('Supabase respondió ' + response.status + ': ' + (await response.text()).slice(0, 300));
  const result = await response.json();
  return Array.isArray(result) ? result[0] : result;
}

export async function prospectingRun(request, env) {
  if (!env.PROSPECTING_API_KEY || request.headers.get('authorization') !== 'Bearer ' + env.PROSPECTING_API_KEY) return { status: 401, body: { error: 'No autorizado.' } };
  let body;
  try { body = await request.json(); } catch { return { status: 400, body: { error: 'JSON inválido.' } }; }
  const source = text(body.source, 20).toLowerCase();
  if (!SOURCE_ACTOR_ENV[source]) return { status: 400, body: { error: 'source debe ser instagram, facebook, google o linkedin.' } };
  const campaignId = text(body.campaign_id, 100) || crypto.randomUUID();
  try {
    const items = await runApifyActor(env, source, body.input);
    const seenThisRun = new Set();
    const results = [];
    for (const item of items) {
      const prospect = normalizeProspect(item, source);
      if (!prospect.name || prospect.fingerprints.length === 0) continue;
      const primary = prospect.fingerprints[0];
      if (seenThisRun.has(primary)) continue;
      seenThisRun.add(primary);
      const qualification = qualifyProspect(prospect);
      if (!qualification.qualified && body.include_unqualified !== true) continue;
      const copy = createOutreachCopy(prospect, qualification);
      const persistence = body.dry_run === true ? { status: 'preview' } : await persistProspect(env, campaignId, prospect, qualification, copy);
      results.push({ prospect: { ...prospect, raw: undefined }, qualification, copy, persistence });
    }
    return { status: 200, body: { agent: PROSPECTING_AGENT_NAME, campaign_id: campaignId, source, extracted: items.length, accepted: results.length, results } };
  } catch (error) {
    return { status: 502, body: { error: text(error?.message || error, 500) } };
  }
}
