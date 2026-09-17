import { PassItem, VipFlyerItem, UserProfile } from '../types/home';

export const mockUserProfile: UserProfile = {
  id: 'usr_001',
  name: 'Cristian',
  avatarUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Cris&backgroundColor=b6e3f4',
  unreadNotifications: 2,
  activeEventsCount: 0, // 0 activa el modal brutalista para el personal de puerta
};

export const mockUpcomingPasses: PassItem[] = [
  {
    id: 'pass_pepe_101',
    title: 'CUMPLE DE PEPE',
    emoji: '🎂',
    badgeNumber: 24,
    dateStr: 'Vie, 24 Oct',
    timeStr: '22:00',
    location: 'Sopocachi',
    status: 'confirmed',
    statusText: 'Estado: Confirmado (Tú + 1)',
    companionsCount: 1,
    accentBorderColor: '#fe97de',
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
    statusText: 'Estado: Pendiente',
    companionsCount: 0,
    accentBorderColor: '#fab205',
  },
];

export const mockVipFlyers: VipFlyerItem[] = [
  {
    id: 'vip_dubai_01',
    typeBadge: 'FLYER VIP',
    title: 'CLUB DUBÁI',
    subtitle: 'Ingreso VIP Free hasta las 00:30',
    badgeDetail: 'Quedan 18 cupos',
    theme: 'dubai',
  },
  {
    id: 'vip_indie_02',
    typeBadge: 'FLYER CONCIERTO',
    title: 'INDIE NIGHT',
    subtitle: 'Lista de Invitados Especiales',
    badgeDetail: 'Últimos 5 cupos',
    theme: 'indie',
  },
  {
    id: 'vip_mamacita_03',
    typeBadge: 'FLYER',
    title: 'MAMACITA REGGAETON',
    subtitle: 'Open Bar Mujeres hasta las 01:00',
    badgeDetail: 'Quedan 25 cupos',
    theme: 'reggaeton',
  },
  {
    id: 'vip_basement_04',
    typeBadge: 'FLYER',
    title: 'BASEMENT AFTER',
    subtitle: 'Acceso exclusivo lista de puerta',
    badgeDetail: 'Quedan 10 cupos',
    theme: 'techno',
  },
];
