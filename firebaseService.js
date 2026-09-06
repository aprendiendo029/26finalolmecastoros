/**
 * Quiniela Béisbol LMB 2026 - Servicio de Sincronización y Auditoría con Firebase Firestore
 */

import { 
  db, 
  auth, 
  firebaseConfig,
  signInAnonymously, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp 
} from "../config/firebase.js";
import { DEVICE_ID, STORAGE_KEY } from "../config/constants.js";

// --- Identificador de Sesión (idSesion) ---
export function getOrCreateSessionId() {
  let sessionId = localStorage.getItem('quiniela_id_sesion');
  if (!sessionId) {
    const chars = 'abcdef0123456789';
    let randomStr = '';
    for (let i = 0; i < 8; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    sessionId = `usr_${randomStr}`;
    localStorage.setItem('quiniela_id_sesion', sessionId);
  }
  return sessionId;
}

// --- Detección de Dispositivo ---
export function getDeviceDescription() {
  const ua = navigator.userAgent;
  let os = "Dispositivo Desconocido";
  let browser = "Navegador";

  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
    os = /iPad/.test(ua) ? "iPad" : "iPhone";
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    os = "Mac";
  } else if (/Windows NT/.test(ua)) {
    os = "Windows";
  } else if (/Android/.test(ua)) {
    os = "Android";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  }

  if (/Edg\//.test(ua)) {
    browser = "Edge";
  } else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) {
    browser = "Chrome";
  } else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {
    browser = "Safari";
  } else if (/Firefox\//.test(ua)) {
    browser = "Firefox";
  }

  return `${os} / ${browser}`;
}

// --- Actualización de Badge de Estado en Tiempo Real ---
export function updateCloudStatus(status, labelText) {
  const badge = document.getElementById('cloud-status-badge');
  const dot = document.getElementById('cloud-status-dot');
  const text = document.getElementById('cloud-status-text');
  if (!badge || !dot || !text) return;

  text.textContent = labelText;

  if (status === 'online') {
    badge.className = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-400/30";
    dot.className = "w-2 h-2 rounded-full bg-emerald-500";
  } else if (status === 'connecting') {
    badge.className = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 border border-amber-400/30";
    dot.className = "w-2 h-2 rounded-full bg-amber-500 animate-pulse";
  } else {
    badge.className = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-700 border border-red-400/30";
    dot.className = "w-2 h-2 rounded-full bg-red-500";
  }
}

// --- Inicialización de Conexión en Tiempo Real con Firebase ---
export async function initFirebaseConnection(onIncomingState) {
  if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('PEGA_AQUI')) {
    updateCloudStatus('offline', 'Requiere credenciales Firebase');
    return;
  }

  if (!db || !auth) {
    updateCloudStatus('error', 'Error al inicializar Firebase');
    return;
  }

  try {
    updateCloudStatus('connecting', 'Conectando a Firebase...');

    // Autenticación anónima
    await signInAnonymously(auth);

    // Escucha en tiempo real (WebSocket de Google Firestore)
    const docRef = doc(db, 'quiniela_lmb', 'playoffs_2026');
    
    onSnapshot(docRef, (docSnap) => {
      // Al recibir el primer Snapshot exitoso, actualizamos la leyenda a verde
      updateCloudStatus('online', '🟢 En Vivo (Firebase Conectado)');

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.senderId !== DEVICE_ID) {
          if (typeof onIncomingState === 'function') {
            onIncomingState(data);
          }
        }
      }
    }, (err) => {
      console.error('Error Firestore:', err);
      updateCloudStatus('error', 'Error en base de datos');
    });

  } catch (err) {
    console.error('Error al inicializar Firebase:', err);
    updateCloudStatus('error', 'Credenciales inválidas');
  }
}
// --- Envío de Estado y Registro de Auditoría en Firestore ---
export async function sendStateToFirebase(appState, withAuditLog = false) {
  appState.lastUpdated = Date.now();
  appState.senderId = DEVICE_ID;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));

  if (db) {
    try {
      const docRef = doc(db, 'quiniela_lmb', 'playoffs_2026');

      let valoresAnteriores = {};
      if (withAuditLog) {
        try {
          const currentSnap = await getDoc(docRef);
          if (currentSnap.exists()) {
            const prev = currentSnap.data();
            valoresAnteriores = {
              official: prev.official || {},
              predictions: prev.predictions || {},
              savedPredictions: prev.savedPredictions || {},
              customSchedule: prev.customSchedule || []
            };
          }
        } catch (readErr) {
          console.warn('No se pudo leer estado anterior para bitácora:', readErr);
        }
      }

      const valoresNuevos = {
        official: JSON.parse(JSON.stringify(appState.official || {})),
        predictions: JSON.parse(JSON.stringify(appState.predictions || {})),
        savedPredictions: JSON.parse(JSON.stringify(appState.savedPredictions || {})),
        customSchedule: JSON.parse(JSON.stringify(appState.customSchedule || []))
      };

      // 1. Actualización principal de la quiniela
      await setDoc(docRef, {
        official: appState.official,
        predictions: appState.predictions,
        savedPredictions: appState.savedPredictions || {},
        customSchedule: appState.customSchedule || [],
        lastUpdated: appState.lastUpdated,
        senderId: DEVICE_ID
      });

      // 2. Registro inmediato en la bitácora (Audit Log)
      if (withAuditLog) {
        try {
          const auditRef = collection(db, 'quiniela_lmb', 'playoffs_2026', 'historial');
          await addDoc(auditRef, {
            fechaHora: serverTimestamp(),
            autor: "Usuario Anónimo",
            idSesion: getOrCreateSessionId(),
            dispositivo: getDeviceDescription(),
            origen: "Pagina_Web",
            valoresAnteriores: valoresAnteriores,
            valoresNuevos: valoresNuevos
          });
        } catch (auditErr) {
          console.error('Error registrando bitácora:', auditErr);
        }
      }

      updateCloudStatus('online', '🟢 En Vivo (Sincronizado)');
      return true;
    } catch (e) {
      console.error('Error guardando en Firestore:', e);
    }
  }
  return false;
}
