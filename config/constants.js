/**
 * Quiniela Béisbol LMB 2026 - Constantes Estáticas de la Aplicación
 */

// Equipos e Identificadores oficiales Serie del Rey 2026
export const TEAMS = {
  TAB: { id: 'TAB', name: 'Olmecas de Tabasco', logo: 'img/olmecas.webp', zone: 'Sur' },
  TIJ: { id: 'TIJ', name: 'Toros de Tijuana', logo: 'img/toros.webp', zone: 'Norte' }
};

// Participantes oficiales de la quiniela
export const PARTICIPANTS = [
  { id: 'gori', name: 'Gori', themeHex: '#38bdf8' },
  { id: 'mm', name: 'MM', themeHex: '#4ade80' },
  { id: 'tm', name: 'TM', themeHex: '#fb923c' }
];

// Variables estadísticas evaluadas: R, H, E, BB, HR
export const STAT_VARS = [
  { key: 'R', label: 'R', desc: 'Carreras' },
  { key: 'H', label: 'H', desc: 'Hits' },
  { key: 'E', label: 'E', desc: 'Errores' },
  { key: 'BB', label: 'BB', desc: 'Bases por Bola' },
  { key: 'HR', label: 'HR', desc: 'Home Runs' }
];

export const DEFAULT_SCHEDULE = [];

// Intervalo válido de inserción (Serie del Rey: 08 a 16 Septiembre 2026)
export const INSERT_DATE_RANGE = [
  'Martes 8 Septiembre',
  'Miércoles 9 Septiembre',
  'Jueves 10 Septiembre',
  'Viernes 11 Septiembre',
  'Sábado 12 Septiembre',
  'Domingo 13 Septiembre',
  'Lunes 14 Septiembre',
  'Martes 15 Septiembre',
  'Miércoles 16 Septiembre'
];

export const STORAGE_KEY = 'quiniela_lmb_2026_data_v8';
export const DEVICE_ID = 'dev_' + Math.random().toString(36).substr(2, 9);