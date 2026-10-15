
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


  btnSuivant.addEventListener('click', () => {
  if (slidesAnimes.length === 0) return;
  indexActuel++;
  if (indexActuel >= slidesAnimes.length) {
    indexActuel = 0;
  }
  afficherSlide();
});

btnPrecedent.addEventListener('click', () => {
  if (slidesAnimes.length === 0) return;
  indexActuel--;
  if (indexActuel < 0) {
    indexActuel = slidesAnimes.length - 1;
  }
  afficherSlide();
});