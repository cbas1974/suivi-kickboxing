// Configuration de l'application
const config = {
  // Liste des techniques de kickboxing
  techniques: [
    "Jab", 
    "Cross", 
    "Uppercut", 
    "Jab Catch", 
    "Low Kick", 
    "Front Kick", 
    "Roundhouse Kick", 
    "Side Kick",
    "Hook",
    "Knee Strike"
  ],
  // Clé de stockage dans le localStorage
  storageKey: 'kickboxingData',
  // Seuils pour les statistiques
  thresholds: {
    low: 2,    // Rouge en dessous de cette valeur
    medium: 5  // Orange entre low et medium, vert au-dessus de medium
  }
};

// État de l'application
let appState = {
  dataStore: {},
  chart: null
};

// ======== FONCTIONS D'INITIALISATION ========

// Initialisation de l'application
function initApp() {
  loadData();
  createTechniqueCheckboxes();
  setupEventListeners();
  renderDashboard();
  renderSessionHistory();
}

// Charge les données depuis le localStorage
function loadData() {
  const data = localStorage.getItem(config.storageKey);
  appState.dataStore = data ? JSON.parse(data) : {};
}

// Crée les cases à cocher pour les techniques
function createTechniqueCheckboxes() {
  const container = document.getElementById('technique-list');
  
  config.techniques.forEach(technique => {
    const div = document.createElement('div');
    div.className = 'technique-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `technique-${technique.toLowerCase().replace(' ', '-')}`;
    checkbox.value = technique;
    checkbox.name = 'kickboxing';
    
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = technique;
    
    div.appendChild(checkbox);
    div.appendChild(label);
    container.appendChild(div);
  });
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
  // Bouton d'enregistrement
  document.getElementById('save-btn').addEventListener('click', saveSession);
  
  // Bouton de réinitialisation
  document.getElementById('reset-btn').addEventListener('click', resetCheckboxes);
  
  // Changement de date
  document.getElementById('date').addEventListener('change', resetCheckboxes);
  
  // Définir la date du jour par défaut
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  document.getElementById('date').value = formattedDate;
}

// ======== FONCTIONS DE GESTION DES DONNÉES ========

// Enregistre une session
function saveSession() {
  const dateInput = document.getElementById('date');
  const date = dateInput.value;
  
  if (!date) {
    showAlert("🚨 Erreur : Vous devez sélectionner une date avant d'enregistrer les techniques.", "danger");
    return;
  }
  
  const selectedTechniques = Array.from(
    document.querySelectorAll('input[name="kickboxing"]:checked')
  ).map(checkbox => checkbox.value);
  
  if (selectedTechniques.length === 0) {
    showAlert("⚠️ Attention : Aucune technique n'a été sélectionnée.", "warning");
    return;
  }
  
  // Initialiser si nécessaire
  if (!appState.dataStore[date]) {
    appState.dataStore[date] = [];
  }
  
  // Ajouter les nouvelles techniques (sans doublons)
  const existingTechniques = new Set(appState.dataStore[date]);
  selectedTechniques.forEach(tech => existingTechniques.add(tech));
  appState.dataStore[date] = Array.from(existingTechniques);
  
  // Sauvegarder et mettre à jour l'interface
  saveData();
  resetCheckboxes();
  renderDashboard();
  renderSessionHistory();
  
  showAlert("✅ Session enregistrée avec succès !", "success");
}

// Sauvegarde les données dans le localStorage
function saveData() {
  localStorage.setItem(config.storageKey, JSON.stringify(appState.dataStore));
}

// Supprime une session
function deleteSession(date) {
  if (confirm(`Êtes-vous sûr de vouloir supprimer la session du ${formatDateForDisplay(date)} ?`)) {
    delete appState.dataStore[date];
    saveData();
    renderDashboard();
    renderSessionHistory();
    showAlert("🗑️ Session supprimée avec succès.", "success");
  }
}

// ======== FONCTIONS D'AFFICHAGE ========

// Affiche le tableau de bord
function renderDashboard() {
  const dashboard = document.getElementById('dashboard');
  dashboard.innerHTML = '';
  
  // Calculer les statistiques
  const stats = calculateStats();
  
  // Créer la liste des statistiques
  const ul = document.createElement('ul');
  
  config.techniques.forEach(tech => {
    const count = stats.counts[tech] || 0;
    const lastUsed = stats.lastUsed[tech] || 'jamais';
    
    const li = document.createElement('li');
    
    // Déterminer la classe de couleur
    let colorClass = 'stat-red';
    if (count > config.thresholds.medium) {
      colorClass = 'stat-green';
    } else if (count > config.thresholds.low) {
      colorClass = 'stat-orange';
    }
    
    li.innerHTML = `
      <div class="technique-name">${tech}</div>
      <div class="stat-value ${colorClass}">${count} fois</div>
      <div class="stat-last-used">Dernière: ${
        lastUsed !== 'jamais' ? formatDateForDisplay(lastUsed) : 'jamais'
      }</div>
    `;
    
    ul.appendChild(li);
  });
  
  dashboard.appendChild(ul);
  
  // Mettre à jour le graphique
  updateChart(stats.counts);
}

// Met à jour le graphique
function updateChart(counts) {
  const ctx = document.getElementById('techniques-chart').getContext('2d');
  
  // Détruire le graphique existant s'il y en a un
  if (appState.chart) {
    appState.chart.destroy();
  }
  
  // Créer un nouveau graphique
  const labels = config.techniques;
  const data = labels.map(tech => counts[tech] || 0);
  
  appState.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Nombre de séances',
        data: data,
        backgroundColor: data.map(count => {
          if (count > config.thresholds.medium) return '#2ecc71';
          if (count > config.thresholds.low) return '#f39c12';
          return '#e74c3c';
        }),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

// Affiche l'historique des sessions
function renderSessionHistory() {
  const history = document.getElementById('history');
  history.innerHTML = '';
  
  // Trier les dates par ordre décroissant
  const sortedDates = Object.keys(appState.dataStore).sort().reverse();
  
  if (sortedDates.length === 0) {
    history.innerHTML = '<p>Aucune session enregistrée pour le moment.</p>';
    return;
  }
  
  sortedDates.forEach(date => {
    const sessionDiv = document.createElement('div');
    sessionDiv.className = 'session-item';
    
    const dateDiv = document.createElement('div');
    dateDiv.className = 'session-date';
    dateDiv.textContent = formatDateForDisplay(date);
    
    const techniquesDiv = document.createElement('div');
    techniquesDiv.className = 'session-techniques';
    
    appState.dataStore[date].forEach(tech => {
      const techSpan = document.createElement('span');
      techSpan.className = 'technique-tag';
      techSpan.textContent = tech;
      techniquesDiv.appendChild(techSpan);
    });
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'session-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger';
    deleteBtn.textContent = '🗑️ Supprimer';
    deleteBtn.onclick = () => deleteSession(date);
    
    actionsDiv.appendChild(deleteBtn);
    
    sessionDiv.appendChild(dateDiv);
    sessionDiv.appendChild(techniquesDiv);
    sessionDiv.appendChild(actionsDiv);
    
    history.appendChild(sessionDiv);
  });
}

// ======== FONCTIONS UTILITAIRES ========

// Calcule les statistiques
function calculateStats() {
  const counts = {};
  const lastUsed = {};
  
  for (const date in appState.dataStore) {
    appState.dataStore[date].forEach(tech => {
      counts[tech] = (counts[tech] || 0) + 1;
      
      // Mettre à jour la dernière utilisation
      if (!lastUsed[tech] || date > lastUsed[tech]) {
        lastUsed[tech] = date;
      }
    });
  }
  
  return { counts, lastUsed };
}

// Réinitialise les cases à cocher
function resetCheckboxes() {
  document.querySelectorAll('input[name="kickboxing"]').forEach(checkbox => {
    checkbox.checked = false;
  });
}

// Formate une date pour l'affichage
function formatDateForDisplay(dateString) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', options);
}

// Affiche une alerte temporaire
function showAlert(message, type = 'info') {
  // Créer l'élément d'alerte
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '20px';
  alertDiv.style.left = '50%';
  alertDiv.style.transform = 'translateX(-50%)';
  alertDiv.style.padding = '15px 20px';
  alertDiv.style.borderRadius = '5px';
  alertDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  alertDiv.style.zIndex = '1000';
  
  // Appliquer le style selon le type
  switch(type) {
    case 'success':
      alertDiv.style.backgroundColor = '#2ecc71';
      alertDiv.style.color = 'white';
      break;
    case 'warning':
      alertDiv.style.backgroundColor = '#f39c12';
      alertDiv.style.color = 'white';
      break;
    case 'danger':
      alertDiv.style.backgroundColor = '#e74c3c';
      alertDiv.style.color = 'white';
      break;
    default:
      alertDiv.style.backgroundColor = '#3498db';
      alertDiv.style.color = 'white';
  }
  
  // Ajouter au document
  document.body.appendChild(alertDiv);
  
  // Supprimer après 3 secondes
  setTimeout(() => {
    alertDiv.style.opacity = '0';
    alertDiv.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      document.body.removeChild(alertDiv);
    }, 500);
  }, 3000);
}

// Initialiser l'application au chargement de la page
window.addEventListener('DOMContentLoaded', initApp);