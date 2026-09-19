import { PassItem, VipFlyerItem, UserProfile, CreatedEventItem, SouvenirItem, NotificationItem, EventInviteData } from '../types/home';

export const mockUserProfile: UserProfile = {
  id: 'usr_001',
  name: 'CHRIS G.',
  avatarUrl: './assets/images/avatar_chris.png',
  unreadNotifications: 3,
  activeEventsCount: 14,
  isPlusMember: true,
  eventsCount: 14,
  streakCount: 4,
  plusPoints: 380,
};

export const mockNotifications: NotificationItem[] = [
  {
    id: 'notif_01',
    type: 'invitation',
    title: 'Invitación de Nico V.',
    message: 'Te invitó a CUMPLE DE PEPE 🎂 (Viernes 24 Oct · Sopocachi). Tienes pase +1 incluido.',
    timeAgo: 'Hace 15 min',
    isRead: false,
    actionRequired: true,
  },
  {
    id: 'notif_02',
    type: 'vip_approved',
    title: '¡Solicitud Aprobada! 🎉',
    message: 'Club Dubái aprobó tu pase VIP para INDIE NIGHT. Tu QR ya está activo en puerta.',
    timeAgo: 'Hace 2 horas',
    isRead: false,
    passId: '4092',
  },
  {
    id: 'notif_03',
    type: 'streak_alert',
    title: '🔥 ¡Mantén viva tu Racha de 4!',
    message: 'Tienes una racha de 4 eventos consecutivos. Asiste a un evento este fin de semana para subir a Racha 5 y desbloquear nuevo drop.',
    timeAgo: 'Ayer',
    isRead: false,
  },
  {
    id: 'notif_04',
    type: 'companion_confirmed',
    title: 'Tu +1 confirmó asistencia',
    message: 'Camila R. aceptó tu pase de acompañante para LATIN PERREO.',
    timeAgo: 'Hace 2 días',
    isRead: true,
  },
];

export const mockUserCreatedEvents: CreatedEventItem[] = [];

export const mockSouvenirs: SouvenirItem[] = [
  {
    id: 'souv_01',
    name: 'Gorra Trucker +1 Black Edition',
    pointsCost: 450,
    imageEmoji: '🧢',
    category: 'Accesorios',
  },
  {
    id: 'souv_02',
    name: 'Llavero Metálico Brutalista +1',
    pointsCost: 200,
    imageEmoji: '🔑',
    category: 'Coleccionables',
  },
  {
    id: 'souv_03',
    name: 'Taza Cerámica Negro Mate +1',
    pointsCost: 320,
    imageEmoji: '☕',
    category: 'Hogar & Bar',
  },
  {
    id: 'souv_04',
    name: 'Pase VIP Gratuito para Evento Plus',
    pointsCost: 600,
    imageEmoji: '🎟️',
    category: 'Experiencias',
  },
];

export const mockMamacitaPass: PassItem = {
  id: 'pass_mamacita_4092',
  title: 'MAMACITA',
  subHeader: '妈妈',
  emoji: '🔥',
  badgeNumber: 14,
  dateStr: 'Sáb, 21 Sep',
  timeStr: '22:30',
  location: 'Foro Club · Calacoto',
  status: 'confirmed',
  statusText: 'Confirmado (Tú + 1)',
  companionsCount: 1,
  accentBorderColor: '#12c061',
  holderName: 'CRIS PÉREZ',
  listType: 'LISTA G.',
  ticketId: '#4092',
  verifiedProvider: 'VERIFICADO CON GOOGLE',
  qrCodeValue: 'PLUS1-TICKET-4092-MAMACITA-CRIS-PEREZ',
};

export const mockUpcomingPasses: PassItem[] = [];

export const mockWalletTickets: PassItem[] = [];

export const mockVipFlyers: VipFlyerItem[] = [];


export const mockEventInvites: Record<string, EventInviteData> = {
  'pepe-birthday': {
    id: 'pepe-birthday',
    title: 'CUMPLE DE PEPE 🎂',
    subtitle: 'Fiesta Privada de Cumpleaños',
    hostName: 'PEPE G.',
    isPrivate: true,
    flyerImage: './assets/images/pantalla_crear_evento.webp',
    theme: 'birthday',
    dateDisplay: 'VIE. 24 DE OCTUBRE',
    timeRange: '22:00 — 04:30',
    venueName: 'Terraza Privada Moncloa · Sopocachi',
    exactAddress: 'Av. Arce #2410, Edificio Los Robles, Terraza Penthouse Piso 12',
    confirmedCount: 18,
    confirmedAvatars: [
      './assets/images/avatar_chris.png',
      './assets/images/avatar_1.png',
      './assets/images/avatar_2.png',
      './assets/images/avatar_3.png',
      './assets/images/avatar_4.png',
    ],
    allowsPlusOne: true,
    description: 'Celebrando los 28 con barra libre de cócteles artesanales, música en vivo y los de siempre. Acceso estrictamente controlado en puerta mediante código QR personal o con acompañante +1 registrado.',
  },
  'indie-night': {
    id: 'indie-night',
    title: 'INDIE NIGHT LIVE',
    subtitle: 'The Strokes + Foals Tribute',
    hostName: 'EQUINOCCIO CLUB',
    isPrivate: false,
    theme: 'indie',
    dateDisplay: 'SÁB. 25 DE OCTUBRE',
    timeRange: '21:00 — 03:30',
    venueName: 'Teatro Equinoccio · San Miguel',
    exactAddress: 'Av. 21 de Calacoto #8420, San Miguel, La Paz',
    confirmedCount: 42,
    confirmedAvatars: [
      './assets/images/avatar_chris.png',
      './assets/images/avatar_1.png',
      './assets/images/avatar_2.png',
      './assets/images/avatar_3.png',
    ],
    allowsPlusOne: true,
    description: 'La sesión indie más esperada del mes con tributo en vivo a The Strokes y Foals. Acceso preferencial a preventas y solicitudes VIP para miembros de la comunidad +1.',
  },
};

export const GENTLE_MESSAGES = [
  "Aforo VIP completado por el momento. ¡Atento a próximas fechas!",
  "Cupos limitados alcanzados. Esperamos verte en la siguiente edición.",
  "Capacidad máxima del recinto completada para esta noche.",
  "Lista de invitados cerrada por límite de espacio del local.",
  "Pases agotados para esta zona. Mantente al tanto de nuevas fechas."
];

