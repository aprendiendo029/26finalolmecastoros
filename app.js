/**
 * Quiniela Béisbol LMB 2026 - Módulo Principal de la Aplicación
 */

import { TEAMS, PARTICIPANTS, DEFAULT_SCHEDULE, STORAGE_KEY, STAT_VARS } from './config/constants.js';
import { 
  initFirebaseConnection, 
  sendStateToFirebase 
} from './services/firebaseService.js';
import { 
  renderFilters, 
  renderGames, 
  renderLeaderboard, 
  updateScoreboardValidations, 
  populateInsertFormSelects,
  showToast 
} from './ui/render.js';

let appState = {
  official: {},
  predictions: {},
  savedPredictions: {},
  customSchedule: [],
  selectedDateFilter: 'TODOS',
  selectedZoneFilter: 'TODOS'
};

window.selectedDateFilter = window.selectedDateFilter || 'TODOS';
window.selectedZoneFilter = window.selectedZoneFilter || 'TODOS';
window.selectedGameIdToDelete = window.selectedGameIdToDelete || null;

function getFullSchedule() {
  return [...DEFAULT_SCHEDULE, ...(appState.customSchedule || [])];
}

function loadLocalState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      appState = { ...appState, ...parsed };
    }
  } catch (e) {
    console.warn("Error cargando estado local:", e);
  }

  // Garantizar que existan los estados de los filtros dentro de appState
  appState.selectedDateFilter = appState.selectedDateFilter || window.selectedDateFilter || 'TODOS';
  appState.selectedZoneFilter = appState.selectedZoneFilter || window.selectedZoneFilter || 'TODOS';
}

function refreshUI() {
  const currentSchedule = getFullSchedule();
  populateInsertFormSelects();
  renderFilters(appState, currentSchedule);
  renderGames(appState, currentSchedule, window.selectedGameIdToDelete);
  renderLeaderboard(appState, currentSchedule);
  updateScoreboardValidations(appState, currentSchedule);
}

function handleIncomingFirebaseState(newState) {
  if (!newState) return;
  
  appState = {
    official: newState.official || {},
    predictions: newState.predictions || {},
    savedPredictions: newState.savedPredictions || {},
    customSchedule: newState.customSchedule || [],
    selectedDateFilter: newState.selectedDateFilter || appState.selectedDateFilter || 'TODOS',
    selectedZoneFilter: newState.selectedZoneFilter || appState.selectedZoneFilter || 'TODOS',
    lastUpdated: newState.lastUpdated || Date.now()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  refreshUI();
}

/**
 * Verifica si un participante completó las 10 estadísticas y el ganador
 */
function isPredictionComplete(pred) {
  if (!pred) return false;
  if (!pred.winner || String(pred.winner).trim() === '') return false;

  const statKeys = ['visitorR', 'visitorH', 'visitorE', 'visitorBB', 'visitorHR',
                    'localR', 'localH', 'localE', 'localBB', 'localHR'];

  for (const key of statKeys) {
    const val = pred[key];
    if (val === undefined || val === null || val === '' || isNaN(Number(val))) {
      return false;
    }
  }
  return true;
}

// Actualizaciones de marcadores y pronósticos
export async function updatePrediction(gameId, participantId, field, value) {
  if (!appState.predictions[participantId]) appState.predictions[participantId] = {};
  if (!appState.predictions[participantId][gameId]) appState.predictions[participantId][gameId] = {};

  const currentPred = appState.predictions[participantId][gameId];
  currentPred[field] = field === 'winner' ? value : (value !== '' ? Number(value) : '');

  await sendStateToFirebase(appState, false);
}

export async function saveParticipantGame(gameId, participantId) {
  const pred = appState.predictions[participantId]?.[gameId];

  if (!isPredictionComplete(pred)) {
    showToast("Debes capturar las 10 estadísticas (R, H, E, BB, HR) y elegir Ganador antes de guardar.", "error");
    return;
  }

  if (!appState.savedPredictions[gameId]) {
    appState.savedPredictions[gameId] = {};
  }
  
  appState.savedPredictions[gameId][participantId] = true;

  await sendStateToFirebase(appState, true);
  showToast("Pronóstico guardado con éxito y oculto para la jugada ciega.", "success");
  refreshUI();
}

export async function updateOfficialScore(gameId, field, value) {
  if (!appState.official[gameId]) appState.official[gameId] = {};
  appState.official[gameId][field] = field === 'winner' ? value : (value !== '' ? Number(value) : '');

  await sendStateToFirebase(appState, false);
  refreshUI();
}

export async function insertNewGameFromUI() {
  const dateSelect = document.getElementById('new-game-date');
  const visSelect = document.getElementById('new-game-visitor');
  const locSelect = document.getElementById('new-game-local');

  if (!dateSelect || !visSelect || !locSelect) return;

  const date = dateSelect.value;
  const visitor = visSelect.value;
  const local = locSelect.value;

  if (visitor === local) {
    showToast("El equipo visitante y local no pueden ser el mismo", "error");
    return;
  }

  const currentSchedule = getFullSchedule();
  const alreadyExists = currentSchedule.some(
    game => game.date === date && 
            ((game.visitor === visitor && game.local === local) || 
             (game.visitor === local && game.local === visitor))
  );

  if (alreadyExists) {
    showToast("Este juego ya ha sido insertado para esta fecha", "error");
    return;
  }

  const gameNumberOnDate = currentSchedule.filter(g => g.date === date).length + 1;
  const gameId = `custom_${Date.now()}`;

  const newGame = {
    id: gameId,
    date: date,
    visitor: visitor,
    local: local,
    title: `Juego ${gameNumberOnDate} (${TEAMS[visitor]?.name || visitor} vs ${TEAMS[local]?.name || local})`
  };

  if (!appState.customSchedule) appState.customSchedule = [];
  appState.customSchedule.push(newGame);

  window.selectedDateFilter = date;
  appState.selectedDateFilter = date;

  refreshUI();
  await sendStateToFirebase(appState, true);
  showToast("Partido agregado correctamente", "success");
}

export function selectGameToDelete(gameId) {
  window.selectedGameIdToDelete = gameId;
  refreshUI();
}

export function deleteGameFromUI() {
  if (!window.selectedGameIdToDelete) {
    showToast("Haz clic en una tarjeta de partido para seleccionarlo antes de borrar", "error");
    return;
  }

  const modal = document.getElementById('delete-confirm-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

export function closeDeleteModal() {
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

export async function executeDeleteGame() {
  if (!window.selectedGameIdToDelete) {
    showToast("No hay partido seleccionado para eliminar", "error");
    closeDeleteModal();
    return;
  }

  const gameId = window.selectedGameIdToDelete;
  
  if (appState.customSchedule) {
    appState.customSchedule = appState.customSchedule.filter(g => g.id !== gameId);
  }

  if (appState.official[gameId]) delete appState.official[gameId];
  if (appState.predictions) {
    Object.keys(appState.predictions).forEach(pId => {
      if (appState.predictions[pId][gameId]) delete appState.predictions[pId][gameId];
    });
  }
  if (appState.savedPredictions[gameId]) delete appState.savedPredictions[gameId];

  window.selectedGameIdToDelete = null;
  closeDeleteModal();

  await sendStateToFirebase(appState, true);
  showToast("Partido eliminado con éxito", "success");
  refreshUI();
}

export async function closeGamePicksWithPassword() {
  const dateSelect = document.getElementById('new-game-date');
  if (!dateSelect) return;

  const selectedDate = dateSelect.value;
  const SCHEDULE = getFullSchedule();
  const gamesOnDate = SCHEDULE.filter(g => g.date === selectedDate);

  if (gamesOnDate.length === 0) {
    showToast(`No hay partidos registrados para la fecha: ${selectedDate}`, "error");
    return;
  }

  const password = prompt(`Ingresa la contraseña para CERRAR las apuestas del ${selectedDate}:`);
  if (password === null) return;

  if (password.trim() === "3ri3d3l") {
    let closedCount = 0;

    gamesOnDate.forEach(game => {
      if (!appState.savedPredictions) appState.savedPredictions = {};
      if (!appState.savedPredictions[game.id]) appState.savedPredictions[game.id] = {};
      
      PARTICIPANTS.forEach(p => {
        if (!appState.predictions[p.id]) appState.predictions[p.id] = {};
        
        // Si el participante no llenó datos o los tiene incompletos, se asigna 0 y un ganador por defecto
        if (!isPredictionComplete(appState.predictions[p.id][game.id])) {
          appState.predictions[p.id][game.id] = {
            visitorR: appState.predictions[p.id][game.id]?.visitorR ?? 0,
            visitorH: appState.predictions[p.id][game.id]?.visitorH ?? 0,
            visitorE: appState.predictions[p.id][game.id]?.visitorE ?? 0,
            visitorBB: appState.predictions[p.id][game.id]?.visitorBB ?? 0,
            visitorHR: appState.predictions[p.id][game.id]?.visitorHR ?? 0,
            localR: appState.predictions[p.id][game.id]?.localR ?? 0,
            localH: appState.predictions[p.id][game.id]?.localH ?? 0,
            localE: appState.predictions[p.id][game.id]?.localE ?? 0,
            localBB: appState.predictions[p.id][game.id]?.localBB ?? 0,
            localHR: appState.predictions[p.id][game.id]?.localHR ?? 0,
            winner: appState.predictions[p.id][game.id]?.winner || '-'
          };
        }

        appState.savedPredictions[game.id][p.id] = true;
      });

      closedCount++;
    });

    await sendStateToFirebase(appState, true);
    showToast(`¡Éxito! Apuestas cerradas para ${closedCount} partido(s) del ${selectedDate}. La captura oficial sigue abierta.`, "success");
    refreshUI();
  } else {
    showToast("Contraseña incorrecta. No se realizaron cambios.", "error");
  }
}

export function setDateFilter(date) {
  window.selectedDateFilter = date;
  appState.selectedDateFilter = date;
  refreshUI();
}

export function setZoneFilter(zone) {
  window.selectedZoneFilter = zone;
  appState.selectedZoneFilter = zone;
  refreshUI();
}

// Asignaciones globales requeridas por los handlers inline del HTML y render
window.insertNewGameFromUI = insertNewGameFromUI;
window.selectGameToDelete = selectGameToDelete;
window.deleteGameFromUI = deleteGameFromUI;
window.closeDeleteModal = closeDeleteModal;
window.executeDeleteGame = executeDeleteGame;
window.closeGamePicksWithPassword = closeGamePicksWithPassword;
window.setDateFilter = setDateFilter;
window.setZoneFilter = setZoneFilter;
window.updatePrediction = updatePrediction;
window.saveParticipantGame = saveParticipantGame;
window.updateOfficialScore = updateOfficialScore;

document.addEventListener('DOMContentLoaded', async () => {
  loadLocalState();
  refreshUI();

  try {
    await initFirebaseConnection(handleIncomingFirebaseState);
  } catch (err) {
    console.error("Error al conectar Firebase:", err);
  }
});