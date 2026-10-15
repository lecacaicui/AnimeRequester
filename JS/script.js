
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

const btnSuivant = document.getElementById('nextBtn');
const btnPrecedent = document.getElementById('prevBtn');
const imageCarrousel = document.getElementById('carrouselImage');
const titreCarrousel = document.getElementById('carrouselTitre');

var slidesAnimes = [];

var indexActuel = 0;
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