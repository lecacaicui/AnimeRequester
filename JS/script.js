
// Liaison du header à l'index.html
fetch('PAGES/header.html')
  .then(response => response.text())
  .then(data => {
    document.getElementById('header-container').innerHTML = data;
  })
  .catch(error => console.error('Erreur lors du chargement du header:', error));

// Liaison du footer à l'index.html
fetch('PAGES/footer.html')
  .then(response => response.text())
  .then(data => {
    document.getElementById('footer-container').innerHTML = data;
  })
  .catch(error => console.error('Erreur lors du chargement du footer:', error));


// Partie du Carrousel

const URL_PROXY = 'https://animerequester.nilsr8888.workers.dev';
const nomsAnimesCarrousel = [];


const imgCarrousel = document.getElementById('carrouselImage');
const btnSuivant = document.getElementById('nextBtn');
const btnPrecedent = document.getElementById('prevBtn');
const titreCarrousel = document.getElementById('carrouselTitre');

let slidesAnimes = [];
let indexActuel = 0;

const maxIndex = slidesAnimes.length - 1;

btnSuivant.addEventListener('click', () => {
  if (maxIndex === 0) return;
  indexActuel++;
  if (indexActuel >= maxIndex) {
    indexActuel = 0;
  }
  afficherSlide();
});

btnPrecedent.addEventListener('click', () => {
  if (maxIndex === 0) return;
  indexActuel--;
  if (indexActuel < 0) {
    indexActuel = maxIndex;
  }
  afficherSlide();
});


function afficherSlide() {
  if (slidesAnimes.length === 0) return;

  const animeActuel = slidesAnimes[indexActuel];
  imgCarrousel.src = animeActuel.image;
  imgCarrousel.alt = animeActuel.titre;
  titreCarrousel.textContent = animeActuel.titre;
}

async function chargerCarrousel() {
  for (const nom of nomsAnimesCarrousel) {
    try {
      const reponse = await fetch(`${URL_PROXY}?nom=${encodeURIComponent(nom)}`);
      if (reponse.ok) {
        const donnees = await reponse.json();
        slidesAnimes.push(donnees);
      }
    } catch (erreur) {
      console.error('Erreur de récupération de :', nom, erreur);
    }
  }

  if (slidesAnimes.length > 0) {
    afficherSlide();
  } else {
    titreCarrousel.textContent = 'Impossible de charger les animes';
  }
}

chargerCarrousel();