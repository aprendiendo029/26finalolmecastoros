/**
 * Quiniela Béisbol LMB 2026 - Renderizado de Interfaz de Usuario y DOM
 */

import { TEAMS, PARTICIPANTS, STAT_VARS, INSERT_DATE_RANGE } from "../config/constants.js";

// --- Sistema de Notificaciones Flotantes (Toasts) ---
export function showToast(message, type = 'success') {
  let container = document.getElementById('global-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'global-toast-container';
    container.className = 'fixed top-5 right-5 z-[9999] pointer-events-none flex flex-col gap-2 max-w-md w-full px-4';
    document.body.appendChild(container);
  }

  const toastEl = document.createElement('div');
  let bgClass = 'bg-emerald-600 border-emerald-400/40 text-white';
  let icon = '✓';
  if (type === 'error') {
    bgClass = 'bg-rose-600 border-rose-400/40 text-white';
    icon = '⚠️';
  } else if (type === 'info') {
    bgClass = 'bg-slate-800 border-slate-700 text-white';
    icon = '🔒';
  }

  toastEl.className = `pointer-events-auto transform transition-all duration-300 ease-out translate-y-0 opacity-100 flex items-center space-x-3 p-3.5 rounded-2xl shadow-apple border text-xs sm:text-sm font-semibold ${bgClass}`;
  toastEl.innerHTML = `
    <span class="text-base shrink-0">${icon}</span>
    <span class="flex-1 leading-snug">${message}</span>
  `;

  container.appendChild(toastEl);

  setTimeout(() => {
    toastEl.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    }, 300);
  }, 4000);
}

// --- Gestión de Modal de Confirmación para Borrar Juego ---
export function openDeleteModal(gameId) {
  window.pendingGameToDeleteId = gameId;
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

window.openDeleteModal = openDeleteModal;

export function closeDeleteModal() {
  window.pendingGameToDeleteId = null;
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

window.closeDeleteModal = closeDeleteModal;

export function selectGameForDeletion(gameId, date, visitor, local) {
  window.selectedGameIdToDelete = gameId;
  
  const dateSelect = document.getElementById('new-game-date');
  const visSelect = document.getElementById('new-game-visitor');
  const locSelect = document.getElementById('new-game-local');
  if (dateSelect && date) dateSelect.value = date;
  if (visSelect && visitor) visSelect.value = visitor;
  if (locSelect && local) locSelect.value = local;

  showToast(`Juego seleccionado para borrar: ${visitor} vs ${local} (${date})`, "info");
}

window.selectGameForDeletion = selectGameForDeletion;

// --- Cálculos y Validaciones de Puntuación ---
export function calculateTotalSum(visVal, locVal) {
  if (visVal === '' || visVal === null || visVal === undefined ||
      locVal === '' || locVal === null || locVal === undefined) {
    return null;
  }
  const v = parseInt(String(visVal).trim(), 10);
  const l = parseInt(String(locVal).trim(), 10);
  if (isNaN(v) || isNaN(l)) return null;
  return v + l;
}

export function getOfficialWinner(gameId, appState, schedule) {
  const off = appState.official[gameId];
  if (!off) return null;
  if (off.winner && off.winner.trim() !== '') return off.winner.trim();

  const vR = parseInt(String(off.visitorR).trim(), 10);
  const lR = parseInt(String(off.localR).trim(), 10);
  const game = schedule.find(g => g.id === gameId);
  if (!game || isNaN(vR) || isNaN(lR)) return null;

  if (vR > lR) return game.visitor;
  if (lR > vR) return game.local;
  return null;
}

export function isGameOfficialClosed(gameId, appState) {
  const off = appState.official[gameId];
  if (!off) return false;
  if (off.status === 'FINAL' || off.final === true) return true;
  
  const vR = parseInt(String(off.visitorR).trim(), 10);
  const vH = parseInt(String(off.visitorH).trim(), 10);
  const lR = parseInt(String(off.localR).trim(), 10);
  const lH = parseInt(String(off.localH).trim(), 10);
  
  const hasCore = !isNaN(vR) && !isNaN(vH) && !isNaN(lR) && !isNaN(lH) && 
                  off.visitorR !== '' && off.visitorH !== '' && off.localR !== '' && off.localH !== '' &&
                  off.visitorR !== null && off.visitorH !== null && off.localR !== null && off.localH !== null;
  
  return hasCore;
}

export function isGamePassed(dateOrGameId, appState, schedule) {
  if (!dateOrGameId) return false;
  if (typeof dateOrGameId === 'string' && dateOrGameId.startsWith('g')) {
    return isGameOfficialClosed(dateOrGameId, appState);
  }
  
  const gamesOnDate = schedule.filter(g => g.date === dateOrGameId);
  if (gamesOnDate.length > 0) {
    return gamesOnDate.every(g => isGameOfficialClosed(g.id, appState));
  }
  return false;
}

// --- Lógica de Pronóstico Completo y Revelación Ciega ("Blind Pick") ---
export function isParticipantCompleted(gameId, participantId, appState) {
  const pred = appState.predictions[participantId]?.[gameId];
  if (!pred) return false;

  const numFields = [
    'visitorR', 'visitorH', 'visitorE', 'visitorBB', 'visitorHR',
    'localR', 'localH', 'localE', 'localBB', 'localHR'
  ];

  const allNumsFilled = numFields.every(key => {
    const val = pred[key];
    if (val === '' || val === null || val === undefined) return false;
    const num = parseInt(String(val).trim(), 10);
    return !isNaN(num);
  });

  const hasWinner = typeof pred.winner === 'string' && pred.winner.trim() !== '';
  const isMarkedSaved = appState.savedPredictions?.[gameId]?.[participantId] === true;
  return isMarkedSaved && allNumsFilled && hasWinner;
}

export function areAllPredictionsRevealed(gameId, appState) {
  if (isGameOfficialClosed(gameId, appState)) return true;
  
  // Considera revelado si todos los participantes están marcados como guardados/cerrados
  return PARTICIPANTS.every(p => appState.savedPredictions?.[gameId]?.[p.id] === true);
}

export function calculateParticipantScores(appState, schedule) {
  const scores = { gori: 0, mm: 0, tm: 0 };
  schedule.forEach(game => {
    if (!isGameOfficialClosed(game.id, appState)) return;

    const off = appState.official[game.id];
    if (!off) return;

    const offWinner = getOfficialWinner(game.id, appState, schedule);

    PARTICIPANTS.forEach(p => {
      const pred = appState.predictions[p.id]?.[game.id];
      if (!pred) return;

      STAT_VARS.forEach(stat => {
        const offVal = parseInt(String(off['visitor' + stat.key]).trim(), 10);
        const pVal = parseInt(String(pred['visitor' + stat.key]).trim(), 10);
        if (!isNaN(offVal) && !isNaN(pVal) && offVal === pVal) scores[p.id]++;
      });

      STAT_VARS.forEach(stat => {
        const offVal = parseInt(String(off['local' + stat.key]).trim(), 10);
        const pVal = parseInt(String(pred['local' + stat.key]).trim(), 10);
        if (!isNaN(offVal) && !isNaN(pVal) && offVal === pVal) scores[p.id]++;
      });

      STAT_VARS.forEach(stat => {
        const offTot = calculateTotalSum(off['visitor' + stat.key], off['local' + stat.key]);
        const pTot = calculateTotalSum(pred['visitor' + stat.key], pred['local' + stat.key]);
        if (offTot !== null && pTot !== null && offTot === pTot) scores[p.id]++;
      });

      if (offWinner && pred.winner && pred.winner === offWinner) scores[p.id]++;
    });
  });
  return scores;
}

// --- Renderizado del Marcador de Líderes ---
export function renderLeaderboard(appState, schedule) {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  const scores = calculateParticipantScores(appState, schedule);
  const maxScore = Math.max(...Object.values(scores));
  
  let html = '';
  PARTICIPANTS.forEach(p => {
    const score = scores[p.id] || 0;
    const isLeader = score > 0 && score === maxScore;

    html += `
      <div class="relative flex items-center bg-white ${isLeader ? 'border-2 border-amber-400 leader-badge-animated' : 'border border-slate-200/90'} rounded-2xl p-1.5 sm:p-2 px-3 sm:px-4 shadow-apple transition-all overflow-hidden">
        <div class="relative z-10 flex items-center space-x-2">
          <span class="w-3 h-3 rounded-full shrink-0 shadow-sm" style="background-color: ${p.themeHex};"></span>
          <span class="font-bold text-xs sm:text-sm text-slate-800">${p.name}</span>
        </div>

        <div class="relative z-10 ml-3 px-2.5 py-0.5 rounded-xl bg-slate-100 text-slate-900 font-extrabold text-sm sm:text-base border border-slate-200/80">
          ${score} <span class="text-[10px] font-normal text-slate-500">pts</span>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// --- Población de Selectores del Formulario de Inserción ---
export function populateInsertFormSelects() {
  const dateSelect = document.getElementById('new-game-date');
  if (dateSelect) {
    const currentVal = dateSelect.value;
    dateSelect.innerHTML = INSERT_DATE_RANGE.map(d => `<option value="${d}">${d}</option>`).join('');
    if (currentVal && INSERT_DATE_RANGE.includes(currentVal)) {
      dateSelect.value = currentVal;
    }
  }

  const teamKeys = Object.keys(TEAMS);
  const teamOptionsHtml = teamKeys.map(k => {
    const t = TEAMS[k];
    return `<option value="${t.id}">${t.id} – ${t.name} (${t.zone})</option>`;
  }).join('');

  const visSelect = document.getElementById('new-game-visitor');
  const locSelect = document.getElementById('new-game-local');

  if (visSelect) {
    const currentVis = visSelect.value || 'MTY';
    visSelect.innerHTML = teamOptionsHtml;
    visSelect.value = currentVis;
  }

  if (locSelect) {
    const currentLoc = locSelect.value || 'TIJ';
    locSelect.innerHTML = teamOptionsHtml;
    locSelect.value = currentLoc;
  }
}

// --- Renderizado de Botones de Filtro ---
export function renderFilters(appState, schedule) {
  ['TODOS', 'Norte', 'Sur'].forEach(zone => {
    const btn = document.getElementById(`zone-btn-${zone}`);
    if (btn) {
      if (appState.selectedZoneFilter === zone) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-charcoal text-white shadow-sm';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all';
      }
    }
  });

  const dates = ['TODOS', ...new Set(schedule.map(s => s.date))];
  const container = document.getElementById('date-filter-buttons');
  if (!container) return;
  
  let html = '';
  dates.forEach(date => {
    const isActive = appState.selectedDateFilter === date;
    const passed = (date !== 'TODOS' && isGamePassed(date, appState, schedule));

    html += `
      <button 
        onclick="setDateFilter('${date}')"
        class="px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
          isActive 
            ? 'bg-blue-600 text-white shadow-sm font-bold' 
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
        }"
      >
        ${date} ${passed ? '<span class="text-[10px] opacity-75">(Finalizado)</span>' : ''}
      </button>
    `;
  });

  container.innerHTML = html;
}

// --- Renderizado Principal de Pizarras de Juegos ---
export function renderGames(appState, schedule, selectedGameIdToDelete) {
  const container = document.getElementById('games-container');
  if (!container) return;
  
  const filteredGames = schedule.filter(game => {
    const matchDate = (appState.selectedDateFilter === 'TODOS' || game.date === appState.selectedDateFilter);
    const visTeam = TEAMS[game.visitor] || { zone: 'Interzona', name: game.visitor, logo: '' };
    const locTeam = TEAMS[game.local] || { zone: 'Interzona', name: game.local, logo: '' };
    
    let matchZone = true;
    if (appState.selectedZoneFilter === 'Norte') {
      matchZone = (visTeam.zone === 'Norte' || locTeam.zone === 'Norte');
    } else if (appState.selectedZoneFilter === 'Sur') {
      matchZone = (visTeam.zone === 'Sur' || locTeam.zone === 'Sur');
    }

    return matchDate && matchZone;
  });

  const countBadge = document.getElementById('game-count-badge');
  if (countBadge) {
    countBadge.textContent = `${filteredGames.length} Partido${filteredGames.length !== 1 ? 's' : ''}`;
  }

  if (filteredGames.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-apple">
        <p class="text-slate-400 font-medium">No se encontraron partidos para la zona o fecha seleccionada.</p>
      </div>
    `;
    return;
  }

  let html = '';

  filteredGames.forEach((game, index) => {
    const visTeam = TEAMS[game.visitor] || { id: game.visitor, name: game.visitor, logo: '', zone: 'Norte' };
    const locTeam = TEAMS[game.local] || { id: game.local, name: game.local, logo: '', zone: 'Sur' };
    const isClosed = isGameOfficialClosed(game.id, appState);
    const isRevealed = areAllPredictionsRevealed(game.id, appState);
    
    const gameZone = (visTeam.zone === locTeam.zone) ? `Zona ${visTeam.zone}` : `Interzona (${visTeam.zone} vs ${locTeam.zone})`;
    const zoneBadgeClass = visTeam.zone === 'Norte' && locTeam.zone === 'Norte' 
      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' 
      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';

    const off = appState.official[game.id] || {};
    const offWinner = getOfficialWinner(game.id, appState, schedule) || '';

    let gameStatusBadge = '';
    if (isClosed) {
      gameStatusBadge = `
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
          Bloqueado (Finalizado Oficial)
        </span>
      `;
    } else if (isRevealed) {
      gameStatusBadge = `
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
          Pronósticos Revelados (3/3)
        </span>
      `;
    } else {
      const countSaved = PARTICIPANTS.filter(p => appState.savedPredictions?.[game.id]?.[p.id] === true).length;
      gameStatusBadge = `
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase tracking-wider">
          Pronósticos Ciegos (${countSaved}/3 Guardados)
        </span>
      `;
    }

    const disabledOfficialAttr = isClosed ? 'disabled' : '';
    const disabledOfficialClass = isClosed ? 'bg-slate-100 cursor-not-allowed opacity-90' : 'bg-white';

    html += `
      <div class="bg-white rounded-3xl border border-slate-200/90 shadow-apple overflow-hidden hover:shadow-apple-hover transition-all duration-300 mb-6">
        
        <!-- Game Card Header -->
        <div class="bg-gradient-to-r from-charcoal via-charcoal-dark to-charcoal text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-charcoal-light/40">
          <div class="flex items-center space-x-3 flex-wrap gap-y-2">
            <div class="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl border border-white/20">
              <span class="text-xs sm:text-sm font-extrabold text-amber-300 tracking-wide">${game.date}</span>
            </div>
            <span class="text-xs font-bold text-slate-300">Juego #${index + 1}</span>
            ${gameStatusBadge}
          </div>

          <div class="flex items-center space-x-2.5 flex-wrap">
            <label class="flex items-center gap-1.5 cursor-pointer bg-red-500/20 hover:bg-red-500/30 text-white px-2.5 py-1 rounded-xl border border-red-400/40 text-xs font-bold transition shadow-sm select-none" title="Seleccionar este juego para borrar">
              <input 
                type="radio" 
                name="game_to_delete_selection" 
                value="${game.id}" 
                onchange="selectGameForDeletion('${game.id}', '${game.date}', '${game.visitor}', '${game.local}')" 
                class="w-3.5 h-3.5 text-red-600 focus:ring-red-500 border-white/40 cursor-pointer accent-red-600"
                ${selectedGameIdToDelete === game.id ? 'checked' : ''}
              />
              <span class="text-[11px] text-red-100 font-semibold">Borrar</span>
            </label>

            <span class="px-3 py-0.5 rounded-full text-xs font-bold ${zoneBadgeClass}">
              ${gameZone}
            </span>
          </div>
        </div>

        <div class="p-3 sm:p-5 overflow-x-auto">
          <table class="w-full text-center border-collapse min-w-[980px]">
            <thead>
              <tr class="text-xs font-bold border-b border-slate-200">
                <th class="p-3 text-left w-48 bg-slate-50 rounded-tl-2xl border-r border-slate-200">
                  <span class="text-slate-500 uppercase tracking-wider text-[11px] block">Equipos Enfrentados</span>
                </th>
                
                <th class="p-3 bg-charcoal text-white border-r border-slate-700 w-52">
                  <span class="font-extrabold uppercase tracking-wider text-xs">Oficial</span>
                </th>

                ${PARTICIPANTS.map((p, pIdx) => {
                  let pBg = 'bg-sky-50 text-sky-900 border-sky-200';
                  if (p.id === 'mm') pBg = 'bg-emerald-50 text-emerald-900 border-emerald-200';
                  if (p.id === 'tm') pBg = 'bg-orange-50 text-orange-900 border-orange-200';

                  let badgeHtml = '';
                  if (isClosed) {
                    badgeHtml = `<span id="points-badge-${p.id}-${game.id}" class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 mt-1 block w-max mx-auto">0/16 pts</span>`;
                  }

                  const roundedRight = (pIdx === PARTICIPANTS.length - 1) ? 'rounded-tr-2xl' : '';

                  return `
                    <th class="p-2.5 ${pBg} border-r border-slate-200 w-52 ${roundedRight}">
                      <div class="flex flex-col items-center justify-center px-1">
                        <span class="font-extrabold text-xs sm:text-sm text-center block">${p.name}</span>
                        ${badgeHtml}
                      </div>
                    </th>
                  `;
                }).join('')}
              </tr>

              <tr class="text-[10px] font-black uppercase text-slate-500 bg-slate-100 border-b border-slate-200">
                <th class="p-1.5 text-left pl-3 text-slate-400 border-r border-slate-200">
                  R · H · E · BB · HR
                </th>
                
                <th class="p-1 bg-charcoal-dark text-slate-200 border-r border-slate-700">
                  <div class="grid grid-cols-5 gap-0.5 text-center font-mono">
                    ${STAT_VARS.map(s => `<span title="${s.desc}">${s.label}</span>`).join('')}
                  </div>
                </th>

                ${PARTICIPANTS.map(p => {
                  let subHeaderBg = 'bg-sky-100/80 text-sky-900 border-r border-sky-200';
                  if (p.id === 'mm') subHeaderBg = 'bg-emerald-100/80 text-emerald-900 border-r border-emerald-200';
                  if (p.id === 'tm') subHeaderBg = 'bg-orange-100/80 text-orange-900';

                  return `
                    <th class="p-1 ${subHeaderBg}">
                      <div class="grid grid-cols-5 gap-0.5 text-center font-mono">
                        ${STAT_VARS.map(s => `<span title="${s.desc}">${s.label}</span>`).join('')}
                      </div>
                    </th>
                  `;
                }).join('')}
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-200 text-sm">
              
              <!-- FILA VISITANTE -->
              <tr class="hover:bg-slate-50/50 transition">
                <td class="p-2.5 text-left border-r border-slate-200 bg-white">
                  <div class="flex items-center space-x-2.5">
                    <div class="w-8 h-8 rounded-lg p-1 bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                      <img src="${visTeam.logo}" alt="${visTeam.name}" class="max-h-full max-w-full object-contain" onerror="this.src='https://placehold.co/60x60/3b3e45/ffffff?text=${game.visitor}'" />
                    </div>
                    <div>
                      <span class="font-extrabold text-slate-900 text-xs block leading-tight">${game.visitor}</span>
                      <span class="text-[9px] text-slate-400 font-medium">Vis · ${visTeam.zone}</span>
                    </div>
                  </div>
                </td>

                <td class="p-1.5 bg-charcoal/5 border-r border-slate-300">
                  <div class="grid grid-cols-5 gap-1">
                    ${STAT_VARS.map(s => {
                      const val = off['visitor' + s.key] !== undefined ? off['visitor' + s.key] : '';
                      return `
                        <input 
                          id="cell-${game.id}-off-vis${s.key}" 
                          type="number" 
                          min="0" 
                          max="99" 
                          ${disabledOfficialAttr} 
                          placeholder="0" 
                          value="${val}" 
                          oninput="updateOfficialScore('${game.id}', 'visitor${s.key}', this.value)" 
                          class="w-full text-center py-1 px-0 rounded border border-slate-300 font-black text-xs ${disabledOfficialClass} focus:ring-2 focus:ring-charcoal focus:outline-none" 
                        />
                      `;
                    }).join('')}
                  </div>
                </td>

                ${PARTICIPANTS.map(p => {
                  const pred = appState.predictions[p.id]?.[game.id] || {};
                  const isSaved = appState.savedPredictions?.[game.id]?.[p.id] === true;
                  const isHidden = !isRevealed && !isClosed && isSaved;
                  const isParticipantDisabled = isClosed || isRevealed;
                  const disabledAttr = isParticipantDisabled ? 'disabled' : '';
                  const disabledClass = isParticipantDisabled ? 'bg-slate-100 cursor-not-allowed opacity-80' : 'bg-white';

                  let bgCol = 'bg-sky-50/40 border-sky-200';
                  if (p.id === 'mm') bgCol = 'bg-emerald-50/40 border-emerald-200';
                  if (p.id === 'tm') bgCol = 'bg-orange-50/40';

                  if (isHidden) {
                    return `
                      <td class="p-1.5 ${bgCol} border-r border-slate-200">
                        <div class="grid grid-cols-5 gap-1">
                          ${STAT_VARS.map(() => `
                            <div class="w-full text-center py-1 rounded border border-slate-300/80 font-mono font-black text-[10px] bg-slate-100 text-slate-400 select-none" title="Pronóstico guardado (Oculto)">•</div>
                          `).join('')}
                        </div>
                      </td>
                    `;
                  }

                  return `
                    <td class="p-1.5 ${bgCol} border-r border-slate-200">
                      <div class="grid grid-cols-5 gap-1">
                        ${STAT_VARS.map(s => {
                          const val = pred['visitor' + s.key] !== undefined ? pred['visitor' + s.key] : '';
                          return `
                            <input 
                              id="cell-${game.id}-${p.id}-vis${s.key}" 
                              type="number" 
                              min="0" 
                              max="99" 
                              ${disabledAttr} 
                              placeholder="-" 
                              value="${val}" 
                              oninput="updatePrediction('${game.id}', '${p.id}', 'visitor${s.key}', this.value)" 
                              class="score-cell w-full text-center py-1 px-0 rounded border border-slate-300 font-bold text-xs ${disabledClass} focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                            />
                          `;
                        }).join('')}
                      </div>
                    </td>
                  `;
                }).join('')}

              </tr>

              <!-- FILA LOCAL -->
              <tr class="hover:bg-slate-50/50 transition">
                <td class="p-2.5 text-left border-r border-slate-200 bg-white">
                  <div class="flex items-center space-x-2.5">
                    <div class="w-8 h-8 rounded-lg p-1 bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                      <img src="${locTeam.logo}" alt="${locTeam.name}" class="max-h-full max-w-full object-contain" onerror="this.src='https://placehold.co/60x60/3b3e45/ffffff?text=${game.local}'" />
                    </div>
                    <div>
                      <span class="font-extrabold text-slate-900 text-xs block leading-tight">${game.local}</span>
                      <span class="text-[9px] text-slate-400 font-medium">Loc · ${locTeam.zone}</span>
                    </div>
                  </div>
                </td>

                <td class="p-1.5 bg-charcoal/5 border-r border-slate-300">
                  <div class="grid grid-cols-5 gap-1">
                    ${STAT_VARS.map(s => {
                      const val = off['local' + s.key] !== undefined ? off['local' + s.key] : '';
                      return `
                        <input 
                          id="cell-${game.id}-off-loc${s.key}" 
                          type="number" 
                          min="0" 
                          max="99" 
                          ${disabledOfficialAttr} 
                          placeholder="0" 
                          value="${val}" 
                          oninput="updateOfficialScore('${game.id}', 'local${s.key}', this.value)" 
                          class="w-full text-center py-1 px-0 rounded border border-slate-300 font-black text-xs ${disabledOfficialClass} focus:ring-2 focus:ring-charcoal focus:outline-none" 
                        />
                      `;
                    }).join('')}
                  </div>
                </td>

                ${PARTICIPANTS.map(p => {
                  const pred = appState.predictions[p.id]?.[game.id] || {};
                  const isSaved = appState.savedPredictions?.[game.id]?.[p.id] === true;
                  const isHidden = !isRevealed && !isClosed && isSaved;
                  const isParticipantDisabled = isClosed || isRevealed;
                  const disabledAttr = isParticipantDisabled ? 'disabled' : '';
                  const disabledClass = isParticipantDisabled ? 'bg-slate-100 cursor-not-allowed opacity-80' : 'bg-white';

                  let bgCol = 'bg-sky-50/40 border-sky-200';
                  if (p.id === 'mm') bgCol = 'bg-emerald-50/40 border-emerald-200';
                  if (p.id === 'tm') bgCol = 'bg-orange-50/40';

                  if (isHidden) {
                    return `
                      <td class="p-1.5 ${bgCol} border-r border-slate-200">
                        <div class="grid grid-cols-5 gap-1">
                          ${STAT_VARS.map(() => `
                            <div class="w-full text-center py-1 rounded border border-slate-300/80 font-mono font-black text-[10px] bg-slate-100 text-slate-400 select-none" title="Pronóstico guardado (Oculto)">•</div>
                          `).join('')}
                        </div>
                      </td>
                    `;
                  }

                  return `
                    <td class="p-1.5 ${bgCol} border-r border-slate-200">
                      <div class="grid grid-cols-5 gap-1">
                        ${STAT_VARS.map(s => {
                          const val = pred['local' + s.key] !== undefined ? pred['local' + s.key] : '';
                          return `
                            <input 
                              id="cell-${game.id}-${p.id}-loc${s.key}" 
                              type="number" 
                              min="0" 
                              max="99" 
                              ${disabledAttr} 
                              placeholder="-" 
                              value="${val}" 
                              oninput="updatePrediction('${game.id}', '${p.id}', 'local${s.key}', this.value)" 
                              class="score-cell w-full text-center py-1 px-0 rounded border border-slate-300 font-bold text-xs ${disabledClass} focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                            />
                          `;
                        }).join('')}
                      </div>
                    </td>
                  `;
                }).join('')}

              </tr>

              <!-- FILA TOTALES -->
              <tr class="bg-slate-100/90 font-extrabold text-black">
                <td class="p-2 text-left border-r border-slate-200 text-slate-700 text-xs tracking-wider uppercase pl-3">
                  TOTALES
                </td>

                <td class="p-1.5 bg-slate-200/80 border-r border-slate-300">
                  <div class="grid grid-cols-5 gap-1 text-center font-black text-xs text-black">
                    ${STAT_VARS.map(s => {
                      const tot = calculateTotalSum(off['visitor' + s.key], off['local' + s.key]);
                      return `<span id="cell-${game.id}-off-tot${s.key}">${tot !== null ? tot : '-'}</span>`;
                    }).join('')}
                  </div>
                </td>

                ${PARTICIPANTS.map(p => {
                  const isSaved = appState.savedPredictions?.[game.id]?.[p.id] === true;
                  const isHidden = !isRevealed && !isClosed && isSaved;
                  const pred = appState.predictions[p.id]?.[game.id] || {};

                  let bgCol = 'bg-sky-100/60 border-sky-200';
                  if (p.id === 'mm') bgCol = 'bg-emerald-100/60 border-emerald-200';
                  if (p.id === 'tm') bgCol = 'bg-orange-100/60';

                  if (isHidden) {
                    return `
                      <td class="p-1.5 ${bgCol} border-r border-slate-200">
                        <div class="grid grid-cols-5 gap-1 text-center font-mono font-bold text-xs text-slate-400">
                          ${STAT_VARS.map(() => `<span>•</span>`).join('')}
                        </div>
                      </td>
                    `;
                  }

                  return `
                    <td class="p-1.5 ${bgCol} border-r border-slate-200">
                      <div class="grid grid-cols-5 gap-1 text-center font-black text-xs">
                        ${STAT_VARS.map(s => {
                          const tot = calculateTotalSum(pred['visitor' + s.key], pred['local' + s.key]);
                          return `
                            <div id="cell-${game.id}-${p.id}-tot${s.key}" class="score-cell rounded py-0.5">${tot !== null ? tot : '-'}</div>
                          `;
                        }).join('')}
                      </div>
                    </td>
                  `;
                }).join('')}

              </tr>

              <!-- FILA GANADOR -->
              <tr class="bg-amber-50/50 font-bold border-t border-slate-200">
                <td class="p-2.5 text-left border-r border-slate-200 bg-amber-100/40 text-slate-800 text-xs pl-3 align-middle">
                  <div class="flex items-center">
                    <span class="font-extrabold uppercase tracking-wide text-[11px]">Ganador</span>
                  </div>
                </td>

                <td class="p-1.5 bg-amber-100/30 border-r border-slate-300 align-middle">
                  <select 
                    id="cell-${game.id}-off-winner"
                    ${disabledOfficialAttr}
                    onchange="updateOfficialScore('${game.id}', 'winner', this.value)"
                    class="w-full text-center py-1 px-1 rounded border border-slate-300 font-black text-xs ${disabledOfficialClass} focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">Oficial: -</option>
                    <option value="${game.visitor}" ${offWinner === game.visitor ? 'selected' : ''}>${game.visitor}</option>
                    <option value="${game.local}" ${offWinner === game.local ? 'selected' : ''}>${game.local}</option>
                  </select>
                </td>

                ${PARTICIPANTS.map(p => {
                  const pred = appState.predictions[p.id]?.[game.id] || {};
                  const isSaved = appState.savedPredictions?.[game.id]?.[p.id] === true;
                  const isHidden = !isRevealed && !isClosed && isSaved;
                  const isParticipantDisabled = isClosed || isRevealed;
                  const disabledAttr = isParticipantDisabled ? 'disabled' : '';
                  const disabledClass = isParticipantDisabled ? 'bg-slate-100 cursor-not-allowed opacity-80' : 'bg-white';

                  let bgCol = 'bg-sky-50/60 border-sky-200';
                  if (p.id === 'mm') bgCol = 'bg-emerald-50/60 border-emerald-200';
                  if (p.id === 'tm') bgCol = 'bg-orange-50/60';

                  let actionHtml = '';
                  if (!isClosed) {
                    if (isHidden) {
                      actionHtml = `<div class="mt-1.5 w-full flex justify-center"><span class="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-200/80 text-amber-900 border border-amber-300/80 flex items-center justify-center gap-1 shadow-sm w-full">🔒 Oculto</span></div>`;
                    } else if (isRevealed) {
                      actionHtml = `<div class="mt-1.5 w-full flex justify-center"><span class="text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-200/80 text-emerald-900 border border-emerald-300/80 flex items-center justify-center gap-1 shadow-sm w-full">✓ Revelado</span></div>`;
                    } else {
                      actionHtml = `
                        <button type="button" onclick="saveParticipantGame('${game.id}', '${p.id}')" class="mt-1.5 w-full text-[10px] font-bold px-2 py-1.5 rounded-lg bg-charcoal hover:bg-charcoal-dark text-white shadow-sm transition active:scale-95 flex items-center justify-center gap-1">
                          <span>💾</span> <span>Guardar</span>
                        </button>
                      `;
                    }
                  }

                  if (isHidden) {
                    return `
                      <td class="p-1.5 ${bgCol} border-r border-slate-200 align-middle">
                        <div class="flex flex-col w-full h-full justify-between">
                          <div class="w-full text-center py-1 rounded border border-slate-300/80 font-mono font-black text-xs bg-slate-100 text-slate-400 select-none" title="Pronóstico guardado (Oculto)">
                            🔒 ••••
                          </div>
                          ${actionHtml}
                        </div>
                      </td>
                    `;
                  }

                  return `
                    <td class="p-1.5 ${bgCol} border-r border-slate-200 align-middle">
                      <div class="flex flex-col w-full h-full justify-between">
                        <select 
                          id="cell-${game.id}-${p.id}-winner"
                          ${disabledAttr}
                          onchange="updatePrediction('${game.id}', '${p.id}', 'winner', this.value)"
                          class="score-cell w-full text-center py-1 px-1 rounded border border-slate-300 font-extrabold text-xs ${disabledClass} focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Elegir Ganador</option>
                          <option value="${game.visitor}" ${pred.winner === game.visitor ? 'selected' : ''}>${game.visitor}</option>
                          <option value="${game.local}" ${pred.winner === game.local ? 'selected' : ''}>${game.local}</option>
                        </select>
                        ${actionHtml}
                      </div>
                    </td>
                  `;
                }).join('')}

              </tr>

            </tbody>
          </table>
        </div>

      </div>
    `;
  });

  container.innerHTML = html;
}

// --- Actualización Dinámica de Validaciones de Casillas ---
export function updateScoreboardValidations(appState, schedule) {
  schedule.forEach(game => {
    const off = appState.official[game.id] || {};
    const isClosed = isGameOfficialClosed(game.id, appState);
    const isRevealed = areAllPredictionsRevealed(game.id, appState);
    const offWinner = getOfficialWinner(game.id, appState, schedule);

    STAT_VARS.forEach(stat => {
      const tot = calculateTotalSum(off['visitor' + stat.key], off['local' + stat.key]);
      const el = document.getElementById(`cell-${game.id}-off-tot${stat.key}`);
      if (el) el.textContent = tot !== null ? tot : '-';
    });

    const offWinnerSelect = document.getElementById(`cell-${game.id}-off-winner`);
    if (offWinnerSelect && offWinner && offWinnerSelect.value !== offWinner) {
      offWinnerSelect.value = offWinner;
    }

    PARTICIPANTS.forEach(p => {
      const pred = appState.predictions[p.id]?.[game.id] || {};
      let gamePoints = 0;

      // Validar Visitante
      STAT_VARS.forEach(stat => {
        const el = document.getElementById(`cell-${game.id}-${p.id}-vis${stat.key}`);
        if (!el) return;
        el.classList.remove('cell-hit', 'cell-miss');

        const pVal = parseInt(String(pred['visitor' + stat.key]).trim(), 10);
        const offVal = parseInt(String(off['visitor' + stat.key]).trim(), 10);
        const isPValid = !isNaN(pVal) && pred['visitor' + stat.key] !== '' && pred['visitor' + stat.key] !== null && pred['visitor' + stat.key] !== undefined;
        const isOffValid = !isNaN(offVal) && off['visitor' + stat.key] !== '' && off['visitor' + stat.key] !== null && off['visitor' + stat.key] !== undefined;

        if (isPValid && isOffValid && isClosed) {
          if (pVal === offVal) {
            el.classList.add('cell-hit');
            gamePoints++;
          } else {
            el.classList.add('cell-miss');
          }
        }
      });

      // Validar Local
      STAT_VARS.forEach(stat => {
        const el = document.getElementById(`cell-${game.id}-${p.id}-loc${stat.key}`);
        if (!el) return;
        el.classList.remove('cell-hit', 'cell-miss');

        const pVal = parseInt(String(pred['local' + stat.key]).trim(), 10);
        const offVal = parseInt(String(off['local' + stat.key]).trim(), 10);
        const isPValid = !isNaN(pVal) && pred['local' + stat.key] !== '' && pred['local' + stat.key] !== null && pred['local' + stat.key] !== undefined;
        const isOffValid = !isNaN(offVal) && off['local' + stat.key] !== '' && off['local' + stat.key] !== null && off['local' + stat.key] !== undefined;

        if (isPValid && isOffValid && isClosed) {
          if (pVal === offVal) {
            el.classList.add('cell-hit');
            gamePoints++;
          } else {
            el.classList.add('cell-miss');
          }
        }
      });

      // Validar Totales
      STAT_VARS.forEach(stat => {
        const el = document.getElementById(`cell-${game.id}-${p.id}-tot${stat.key}`);
        if (!el) return;
        el.classList.remove('cell-hit', 'cell-miss');

        const pTot = calculateTotalSum(pred['visitor' + stat.key], pred['local' + stat.key]);
        const offTot = calculateTotalSum(off['visitor' + stat.key], off['local' + stat.key]);

        if (pTot !== null) el.textContent = pTot;

        if (pTot !== null && offTot !== null && isClosed) {
          if (pTot === offTot) {
            el.classList.add('cell-hit');
            gamePoints++;
          } else {
            el.classList.add('cell-miss');
          }
        }
      });

      // Validar Ganador
      const winnerEl = document.getElementById(`cell-${game.id}-${p.id}-winner`);
      if (winnerEl) {
        winnerEl.classList.remove('cell-hit', 'cell-miss');
        if (pred.winner && offWinner && isClosed) {
          if (pred.winner === offWinner) {
            winnerEl.classList.add('cell-hit');
            gamePoints++;
          } else {
            winnerEl.classList.add('cell-miss');
          }
        }
      }

      // Actualizar Badge de Puntos
      const ptsBadge = document.getElementById(`points-badge-${p.id}-${game.id}`);
      if (ptsBadge && isClosed) {
        ptsBadge.textContent = `${gamePoints}/16 pts`;
        if (gamePoints > 0) {
          ptsBadge.className = "text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 shadow-sm mt-1 block w-max mx-auto";
        } else {
          ptsBadge.className = "text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 mt-1 block w-max mx-auto";
        }
      }

    });
  });
}