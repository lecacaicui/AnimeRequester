
const ORIGINES_AUTORISEES = ['https://tonpseudo.github.io'];
const TTL_SECONDES = 86400;

function reponseJSON(corps, statut, request) {
  const origine = request.headers.get('Origin');
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ORIGINES_AUTORISEES.includes(origine) ? origine : ORIGINES_AUTORISEES[0],
      'Vary': 'Origin'
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': ORIGINES_AUTORISEES[0],
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        }
      });
    }

    const url = new URL(request.url);
    const nom = url.searchParams.get('nom')?.trim();

    if (!nom || nom.length > 100) {
      return reponseJSON({ erreur: "Paramètre 'nom' manquant ou invalide" }, 400, request);
    }

    try {
      const resultat = await chargerAvecCache(nom, env);
      if (!resultat) return reponseJSON({ erreur: 'Animé introuvable' }, 404, request);
      return reponseJSON(resultat, 200, request);
    } catch (error) {
      console.error('[Proxy]', error);
      return reponseJSON({ erreur: 'Erreur interne' }, 500, request);
    }
  }
};

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
  const cle = `anime_${nom.toLowerCase()}`;

  const enCache = await env.MON_KV_CACHE?.get(cle);
  if (enCache) return JSON.parse(enCache);

  const anime = await chargerDepuisAPI(nom, env);
  if (anime) {
    await env.MON_KV_CACHE?.put(cle, JSON.stringify(anime), { expirationTtl: TTL_SECONDES });
  }
  return anime;
}
