const ORIGINES_AUTORISEES = [
  'https://animerequester.nilsr8888.workers.dev',
  'https://lecacaicui.github.io',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
];
const TTL_SUCCES = 86400;
const TTL_ECHEC = 3600;
const QUOTA_JOURNALIER = 30;

function normaliser(texte) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function reponseJSON(corps, statut, origine, extra = {}) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origine,
      'Vary': 'Origin',
      ...extra
    }
  });
}

export default {
  async fetch(request, env) {
    const origine = request.headers.get('Origin');

    if (!ORIGINES_AUTORISEES.includes(origine)) {
      return reponseJSON({ erreur: 'Origine non autorisée' }, 403, ORIGINES_AUTORISEES[0]);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origine,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Vary': 'Origin'
        }
      });
    }

    if (request.method !== 'GET') {
      return reponseJSON({ erreur: 'Méthode non autorisée' }, 405, origine);
    }

    const nomBrut = new URL(request.url).searchParams.get('nom')?.trim();
    if (!nomBrut || nomBrut.length > 100) {
      return reponseJSON({ erreur: "Paramètre 'nom' manquant ou invalide" }, 400, origine);
    }

    if (!env.MON_KV_CACHE) {
      return reponseJSON({ erreur: 'Configuration serveur invalide' }, 500, origine);
    }

    try {
      const resultat = await chargerAvecCache(normaliser(nomBrut), env);

      if (resultat === 'QUOTA') {
        return reponseJSON({ erreur: 'Quota journalier atteint' }, 429, origine);
      }
      if (!resultat) {
        return reponseJSON({ erreur: 'Animé introuvable' }, 404, origine);
      }
      return reponseJSON(resultat, 200, origine, { 'Cache-Control': 'public, max-age=3600' });
    } catch (error) {
      console.error('[Proxy]', error);
      return reponseJSON({ erreur: 'Erreur interne' }, 500, origine);
    }
  }
};

async function consommerQuota(env) {
  const jour = new Date().toISOString().slice(0, 10);
  const cle = `quota_${jour}`;
  const utilise = parseInt(await env.MON_KV_CACHE.get(cle), 10) || 0;
  if (utilise >= QUOTA_JOURNALIER) return false;
  await env.MON_KV_CACHE.put(cle, String(utilise + 1), { expirationTtl: 172800 });
  return true;
}

async function chargerDepuisAPI(nom, env) {
  const params = new URLSearchParams({ page: '1', size: '1', search: nom });
  const response = await fetch(`https://anime-db.p.rapidapi.com/anime?${params}`, {
    headers: {
      'x-rapidapi-key': env.RAPIDAPI_KEY,
      'x-rapidapi-host': 'anime-db.p.rapidapi.com'
    }
  });

  if (!response.ok) throw new Error(`API ${response.status}`);

  const json = await response.json();
  const anime = json?.data?.[0];
  if (!anime) return null;

  return {
    titre: anime.title || 'Titre inconnu',
    image: anime.image || anime.thumb || null,
    synopsis: anime.synopsis || 'Aucun synopsis disponible',
    genres: anime.genres || [],
    classement: anime.ranking || anime.rank || 'Non classé',
    episodes: anime.episodes || 'Inconnu'
  };
}

async function chargerAvecCache(nom, env) {
  const cle = `anime_${nom}`;

  const enCache = await env.MON_KV_CACHE.get(cle);
  if (enCache) return JSON.parse(enCache);

  if (!(await consommerQuota(env))) return 'QUOTA';

  const anime = await chargerDepuisAPI(nom, env);
  await env.MON_KV_CACHE.put(
    cle,
    JSON.stringify(anime),
    { expirationTtl: anime ? TTL_SUCCES : TTL_ECHEC }
  );
  return anime;
}