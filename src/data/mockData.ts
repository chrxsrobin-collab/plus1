import { PassItem, VipFlyerItem, UserProfile } from '../types/home';

export const mockUserProfile: UserProfile = {
  id: 'usr_001',
  name: 'Cristian',
  avatarUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Cris&backgroundColor=b6e3f4',
  unreadNotifications: 2,
  activeEventsCount: 0,
};

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

export const mockUpcomingPasses: PassItem[] = [
  mockMamacitaPass,
  {
    id: 'pass_pepe_101',
    title: 'CUMPLE DE PEPE',
    emoji: '🎂',
    badgeNumber: 24,
    dateStr: 'Vie, 24 Oct',
    timeStr: '22:00',
    location: 'Sopocachi',
    status: 'confirmed',
    statusText: 'Confirmado (Tú + 1)',
    companionsCount: 1,
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=300&q=80',
    accentBorderColor: '#fe97de',
    holderName: 'CRIS PÉREZ',
    listType: 'INVITADO VIP',
    ticketId: '#101',
    verifiedProvider: 'VERIFICADO CON GOOGLE',
  },
  {
    id: 'pass_nacho_102',
    title: 'FIESTA PRIVADA NACHO',
    emoji: '⚡',
    badgeNumber: 25,
    dateStr: 'Sáb, 25 Oct',
    timeStr: '23:30',
    location: 'Calacoto',
    status: 'pending',
    statusText: 'Pendiente',
    companionsCount: 0,
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=300&q=80',
    accentBorderColor: '#fab205',
  },
];

export const mockVipFlyers: VipFlyerItem[] = [
  {
    id: 'vip_dubai_01',
    typeBadge: 'FLYER VIP',
    title: 'CLUB DUBÁI',
    subtitle: 'Ingreso VIP Free hasta las 00:30',
    dateDisplay: 'SÁB. 14 DE SEPTIEMBRE',
    timeRange: '22:00 — 04:30',
    location: 'Club Dubái · Sopocachi',
    availabilityText: 'ÚLTIMOS 18 CUPOS ·',
    theme: 'dubai',
    exactAddress: 'Av. 20 de Octubre #2450, Sopocachi, La Paz',
    description: 'Noche de glamour y fiesta electrónica en el club insignia de la ciudad. Contaremos con warm-up de DJ Mateo y cierre exclusivo con ritmos tech-house hasta el amanecer.',
    promotions: [
      'Ingreso VIP Free exclusivo hasta las 00:30',
      '2x1 en gin tonic y cócteles de autor toda la noche',
      'Acceso directo sin fila por puerta VIP',
      'Mesa en terraza lounge sujeta a llegada temprana'
    ]
  },
  {
    id: 'vip_indie_02',
    typeBadge: 'FLYER CONCIERTO',
    title: 'INDIE NIGHT',
    subtitle: 'Lista de Invitados Especiales',
    dateDisplay: 'VIE. 20 DE SEPTIEMBRE',
    timeRange: '21:00 — 03:00',
    location: 'Teatro Equinoccio · San Miguel',
    availabilityText: 'ÚLTIMOS 5 CUPOS ·',
    theme: 'indie',
    exactAddress: 'Calle Sánchez Lima #2191, San Miguel',
    description: 'Encuentro imperdible de bandas indie emergentes en vivo, sesiones acústicas y vinyl set experimental para los amantes de la música independiente.',
    promotions: [
      'Acceso preferencial a soundcheck y backstage',
      'Bebida de cortesía de bienvenida (Cerveza artesanal)',
      'Descuento del 20% en merch oficial de las bandas'
    ]
  },
  {
    id: 'vip_mamacita_03',
    typeBadge: 'FLYER',
    title: 'MAMACITA REGGAETON',
    subtitle: 'Open Bar Mujeres hasta las 01:00',
    dateDisplay: 'SÁB. 21 DE SEPTIEMBRE',
    timeRange: '22:30 — 05:00',
    location: 'Foro Club · Calacoto',
    availabilityText: 'ÚLTIMOS 25 CUPOS ·',
    theme: 'reggaeton',
    exactAddress: 'Calle 15 de Calacoto, Esq. Julio Patiño #802',
    description: 'La sesión urbana más encendida de la temporada. Perreo clásico y new wave de la mano de los DJs más top de la escena, animación en vivo y shows de baile.',
    promotions: [
      'Open Bar mujeres hasta la 01:00 en tragos seleccionados',
      '2x1 en shots de tequila hasta la medianoche',
      'Acceso exclusivo a zona de palcos VIP y guardarropa free',
      'Drop digital sorpresa con beneficios para la próxima edición'
    ]
  },
  {
    id: 'vip_basement_04',
    typeBadge: 'FLYER',
    title: 'BASEMENT AFTER',
    subtitle: 'Acceso exclusivo lista de puerta',
    dateDisplay: 'DOM. 22 DE SEPTIEMBRE',
    timeRange: '03:00 — 09:00',
    location: 'The Basement Club · Centro',
    availabilityText: 'ÚLTIMOS 10 CUPOS ·',
    theme: 'techno',
    exactAddress: 'Calle Murillo #1024, Subsuelo 2, Centro Histórico',
    description: 'Sesión non-stop de techno industrial, visuales inmersivos y atmósfera underground para los que nunca quieren que termine la fiesta.',
    promotions: [
      'Entrada prioritaria por lista digital',
      'Shots energizantes de bienvenida cortesía del club',
      'Acceso libre a chill out zone con hidratación libre'
    ]
  },
];
