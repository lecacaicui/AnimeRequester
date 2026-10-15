const ORIGINES_AUTORISEES = [
  'https://animerequester.nilsr8888.workers.dev',
  'https://lecacaicui.github.io',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
];
const URL_API = 'https://anime-db.p.rapidapi.com/anime';
const TTL_SUCCES = 86400;
const TTL_ECHEC = 3600;
const QUOTA_JOURNALIER = 30;
const TAILLE_PAGE = 10;
const TAILLE_RECHERCHE = 50;
const PAGE_MAX = 500;

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

function construireRequete(url) {
  if (url.pathname === '/classement') {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    if (!Number.isInteger(page) || page < 1 || page > PAGE_MAX) return null;
    return {
      cle: `classement_${page}`,
      params: { page: String(page), size: String(TAILLE_PAGE), sortBy: 'ranking', sortOrder: 'asc' }
    };
  }

  const nomBrut = url.searchParams.get('nom')?.trim();
  if (!nomBrut || nomBrut.length > 100) return null;
  const nom = normaliser(nomBrut);
  return {
    cle: `v2_recherche_${nom}`,
    nom,
    params: { page: '1', size: String(TAILLE_RECHERCHE), search: nom }
  };
}

function formater(anime) {
  return {
    id: anime._id || null,
    titre: anime.title || 'Titre inconnu',
    image: anime.image || anime.thumb || null,
    synopsis: anime.synopsis || 'Aucun synopsis disponible',
    genres: anime.genres || [],
    classement: anime.ranking || anime.rank || 'Non classé',
    episodes: anime.episodes || 'Inconnu'
  };
}

function scoreTitre(anime, nom) {
  const titre = normaliser(anime.titre);
  if (titre === nom) return 0;
  if (titre.startsWith(nom)) return 1;
  if (titre.includes(nom)) return 2;
  return 3;
}

function rang(anime) {
  const valeur = Number(anime.classement);
  return Number.isFinite(valeur) ? valeur : Infinity;
}

function trierParPertinence(resultats, nom) {
  return [...resultats].sort((a, b) => {
    const ecart = scoreTitre(a, nom) - scoreTitre(b, nom);
    if (ecart !== 0) return ecart;
    const ra = rang(a);
    const rb = rang(b);
    if (ra === rb) return 0;
    return ra < rb ? -1 : 1;
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

    const requete = construireRequete(new URL(request.url));
    if (!requete) {
      return reponseJSON({ erreur: 'Paramètres manquants ou invalides' }, 400, origine);
    }

    if (!env.MON_KV_CACHE) {
      return reponseJSON({ erreur: 'Configuration serveur invalide' }, 500, origine);
    }

    try {
      const resultat = await chargerAvecCache(requete, env);

      if (resultat === 'QUOTA') {
        return reponseJSON({ erreur: 'Quota journalier atteint' }, 429, origine);
      }
      if (!resultat) {
        return reponseJSON({ erreur: 'Aucun résultat' }, 404, origine);
      }
      return reponseJSON(resultat, 200, origine, { 'Cache-Control': 'public, max-age=60' });
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

async function chargerDepuisAPI({ params, nom }, env) {
  const reponse = await fetch(`${URL_API}?${new URLSearchParams(params)}`, {
    headers: {
      'x-rapidapi-key': env.RAPIDAPI_KEY,
      'x-rapidapi-host': 'anime-db.p.rapidapi.com'
    }
  });

  if (!reponse.ok) throw new Error(`API ${reponse.status}`);

  const json = await reponse.json();
  const liste = (json?.data || []).map(formater);
  if (liste.length === 0) return null;

  return {
    page: json?.meta?.page ?? Number(params.page),
    totalPages: json?.meta?.totalPage ?? null,
    resultats: nom ? trierParPertinence(liste, nom).slice(0, TAILLE_PAGE) : liste
  };
}

async function chargerAvecCache(requete, env) {
  const enCache = await env.MON_KV_CACHE.get(requete.cle);
  if (enCache) return JSON.parse(enCache);

  if (!(await consommerQuota(env))) return 'QUOTA';

  const donnees = await chargerDepuisAPI(requete, env);
  await env.MON_KV_CACHE.put(
    requete.cle,
    JSON.stringify(donnees),
    { expirationTtl: donnees ? TTL_SUCCES : TTL_ECHEC }
  );
  return donnees;
}
