const URL_PROXY = 'https://anime-proxy.nilsr8888.workers.dev';
const ANIMES_ALEATOIRES = ['Naruto', 'One Piece', 'Bleach', 'Death Note', 'Fullmetal Alchemist', 'Attack on Titan'];

async function chargerFragment(id, chemin) {
  const cible = document.getElementById(id);
  if (!cible) return;
  try {
    const reponse = await fetch(chemin);
    if (!reponse.ok) throw new Error(reponse.status);
    cible.innerHTML = await reponse.text();
  } catch (erreur) {
    console.error(chemin, erreur);
  }
}

async function appelerProxy(chemin) {
  try {
    const reponse = await fetch(`${URL_PROXY}${chemin}`, { cache: 'no-cache' });

    if (reponse.status === 429) {
      console.warn('Limite du jour atteinte');
      return null;
    }
    if (reponse.status === 404) {
      console.warn('Aucun résultat');
      return null;
    }
    if (!reponse.ok) {
      console.error('Erreur du proxy :', reponse.status);
      return null;
    }

    return await reponse.json();
  } catch (erreur) {
    console.error('Impossible de joindre le proxy :', erreur);
    return null;
  }
}

function afficherAnime(anime) {
  const titre = document.getElementById('resultsTitle');
  if (!titre) return; // page sans section résultats (ex : classement.html)

  const image = document.getElementById('resultsImage');
  image.src = anime.image || '';
  image.alt = `Image de ${anime.titre}`;
  image.hidden = !anime.image;

  titre.textContent = anime.titre;
  document.getElementById('resultsSynopsis').textContent = anime.synopsis;
  document.getElementById('genre').textContent =
    `Genre : ${anime.genres.length ? anime.genres.join(', ') : 'Inconnu'}`;
  document.getElementById('resultsEpisodes').textContent =
    `Nombre d'épisodes : ${anime.episodes}`;
  document.getElementById('resultsRank').textContent =
    `Classement : ${anime.classement}`;

  // La section résultats prend la place de la présentation
  const presentation = document.querySelector('.presentation');
  const resultats = document.querySelector('.resultats');
  if (presentation) presentation.style.display = 'none';
  if (resultats) resultats.style.display = '';
}

function afficherSimilaires(resultats) {
  const section = document.querySelector('.similaires');
  const liste = document.getElementById('similairesList');
  if (!section || !liste) return;

  const similaires = resultats.slice(1, 5);
  liste.innerHTML = '';
  section.style.display = similaires.length ? '' : 'none';

  similaires.forEach((anime) => {
    const item = document.createElement('li');
    const lien = document.createElement('a');
    lien.href = '#';
    lien.textContent = anime.titre;
    lien.addEventListener('click', (event) => {
      event.preventDefault();
      afficherAnime(anime);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    item.append(lien);
    liste.append(item);
  });
}

async function rechercherAnime(nom) {
  console.log(`Recherche : ${nom}`);
  const donnees = await appelerProxy(`/?nom=${encodeURIComponent(nom)}`);
  if (!donnees || !Array.isArray(donnees.resultats)) {
    console.error('Réponse inattendue du proxy :', donnees);
    return null;
  }

  console.table(donnees.resultats.map((a) => ({
    titre: a.titre,
    classement: a.classement,
    episodes: a.episodes
  })));
  console.log('Meilleur résultat :', donnees.resultats[0]);
  afficherAnime(donnees.resultats[0]);
  afficherSimilaires(donnees.resultats);
  return donnees.resultats;
}

async function chargerClassement(page = 1) {
  const donnees = await appelerProxy(`/classement?page=${page}`);
  if (!donnees || !Array.isArray(donnees.resultats)) {
    console.error('Réponse inattendue du proxy :', donnees);
    return null;
  }

  console.log(`Classement, page ${donnees.page} sur ${donnees.totalPages}`);
  console.table(donnees.resultats.map((a) => ({
    classement: a.classement,
    titre: a.titre
  })));
  return donnees;
}

let pageClassement = 1;
let totalPagesClassement = null;

function afficherClassement(animes) {
  const conteneur = document.getElementById('classementContainer');
  if (!conteneur) return;

  conteneur.innerHTML = '';
  animes.forEach((anime) => {
    const carte = document.createElement('article');
    carte.className = 'carte-classement';

    const rang = document.createElement('span');
    rang.className = 'carte-rang';
    rang.textContent = `#${anime.classement}`;

    if (anime.image) {
      const image = document.createElement('img');
      image.src = anime.image;
      image.alt = `Image de ${anime.titre}`;
      image.loading = 'lazy';

      const lien = document.createElement('a');
      lien.href = `index.html?nom=${encodeURIComponent(anime.titre)}`;
      lien.title = `Voir la fiche de ${anime.titre}`;
      lien.append(image);
      carte.append(rang, lien);
    } else {
      carte.append(rang);
    }

    const titre = document.createElement('h3');
    titre.textContent = anime.titre;
    carte.append(titre);

    conteneur.append(carte);
  });
}

function majBoutonsClassement() {
  const precedent = document.getElementById('prevButton');
  const suivant = document.getElementById('nextButton');
  if (precedent) precedent.disabled = pageClassement <= 1;
  if (suivant) {
    suivant.disabled = totalPagesClassement !== null && pageClassement >= totalPagesClassement;
  }
}

async function afficherPageClassement(page) {
  if (!document.getElementById('classementContainer')) return;
  const donnees = await chargerClassement(page);
  if (!donnees) return;

  pageClassement = donnees.page;
  totalPagesClassement = donnees.totalPages;
  afficherClassement(donnees.resultats);
  majBoutonsClassement();
}

document.addEventListener('click', (event) => {
  if (event.target.matches('#nextButton')) afficherPageClassement(pageClassement + 1);
  if (event.target.matches('#prevButton') && pageClassement > 1) afficherPageClassement(pageClassement - 1);
});

document.addEventListener('submit', (event) => {
  if (!event.target.matches('.recherche')) return;
  event.preventDefault();
  const nom = event.target.elements.query.value.trim();
  if (nom) rechercherAnime(nom);
});

document.addEventListener('click', (event) => {
  if (!event.target.matches('#randomButton')) return;
  const nom = ANIMES_ALEATOIRES[Math.floor(Math.random() * ANIMES_ALEATOIRES.length)];
  rechercherAnime(nom);
});

afficherPageClassement(1);

// Arrivée depuis un clic sur une image du classement : on affiche la fiche
const nomDemande = new URLSearchParams(window.location.search).get('nom');
if (nomDemande && document.getElementById('resultsTitle')) {
  rechercherAnime(nomDemande);
}

chargerFragment('header-container', 'PAGES/header.html');
chargerFragment('footer-container', 'PAGES/footer.html');
