export interface PassItem {
  id: string;
  title: string;
  emoji: string;
  badgeNumber?: number;
  dateStr: string;
  timeStr: string;
  location: string;
  status: 'confirmed' | 'pending' | 'rejected' | 'used';
  statusText: string;
  companionsCount: number; // e.g. 1 for 'Tú + 1'
  imageUrl?: string;
  accentBorderColor?: string;
  subHeader?: string;          // ej. "妈妈"
  holderName?: string;         // ej. "CRIS PÉREZ"
  listType?: string;           // ej. "LISTA G."
  ticketId?: string;           // ej. "#4092"
  verifiedProvider?: string;   // ej. "VERIFICADO CON GOOGLE"
  qrCodeValue?: string;
  accessType?: string;
  venue?: string;
}

export interface VipFlyerItem {
  id: string;
  typeBadge: string;
  title: string;
  subtitle: string;
  dateDisplay: string; // ej: "SÁB. 14 DE SEPTIEMBRE"
  timeRange: string;   // ej: "22:00 — 04:30"
  location: string;    // ej: "📍 Club Dubái · Sopocachi"
  availabilityText: string; // ej: "ÚLTIMOS 18 CUPOS ·"
  theme: 'dubai' | 'indie' | 'reggaeton' | 'techno' | 'custom';
  description?: string; // Motivo / Line-up / Temática
  promotions?: string[]; // Beneficios / Activaciones
  exactAddress?: string; // Dirección física completa
  imageUrl?: string;
  categoryTag?: string;
  isTonight?: boolean;
  isWeekend?: boolean;
  isVipOrFree?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
  unreadNotifications: number;
  activeEventsCount: number;
  isPlusMember?: boolean;
  eventsCount?: number;
  streakCount?: number;
  plusPoints?: number;
}

export interface CreatedEventItem {
  id: string;
  title: string;
  dateStr: string;
  status: 'Activo' | 'Finalizado' | 'Borrador';
  guestsCount: number;
  maxCapacity: number;
}

export interface SouvenirItem {
  id: string;
  name: string;
  pointsCost: number;
  imageEmoji: string;
  category: string;
}

export interface NotificationItem {
  id: string;
  type: 'invitation' | 'vip_approved' | 'streak_alert' | 'companion_confirmed';
  title: string;
  message: string;
  timeAgo: string;
  isRead?: boolean;
  actionRequired?: boolean;
  passId?: string;
}

export type TabType = 'home' | 'passes' | 'search';

export interface CreateEventFormData {
  artImage?: string | null;
  name: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  privacy: 'public' | 'private';
  allowPlusOne: boolean;
  maxCapacity: number;
}
