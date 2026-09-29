
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
