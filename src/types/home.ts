export interface PassItem {
  id: string;
  eventId?: string;
  title: string;
  emoji: string;
  badgeNumber?: number;
  dateStr: string;
  timeStr: string;
  location: string;
  status: 'confirmed' | 'active' | 'pending' | 'rejected' | 'capacity_reached' | 'used';
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
  feedbackMessage?: string;
}

export interface VipFlyerItem {
  id: string;
  eventId?: string;
  hostUserId?: string;
  hostName?: string;
  hostPhotoUrl?: string;
  typeBadge: string;
  title: string;
  subtitle: string;
  dateDisplay: string; // ej: "SÁB. 14 DE SEPTIEMBRE"
  date?: string;
  timeRange: string;   // ej: "22:00 — 04:30"
  startTime?: string;
  endTime?: string;
  time?: string;
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
  guestLimit?: number;
  maxCapacity?: number;
  coordinates?: { lat: number; lng: number } | null;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
  unreadNotifications: number;
  activeEventsCount: number;
  isPlusMember?: boolean;
  isPartner?: boolean;
  partnerTier?: string | null;
  subscriptionExpiresAt?: number | null;
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

export interface AppNotification {
  id?: string;
  userId: string;          // Destinatario de la alerta (auth.uid)
  type: 'VIP_REQUEST' | 'VIP_APPROVED' | 'VIP_DECLINED' | 'invitation' | 'vip_approved' | 'streak_alert' | 'companion_confirmed';
  title: string;           // Título en Antonio Bold
  message: string;         // Descripción en Cabinet Grotesk
  eventId?: string;
  eventTitle?: string;
  passId?: string;
  senderName?: string;      // Quién genera la acción
  senderId?: string;
  read: boolean;           // false por defecto
  createdAt: number;
  timeAgo?: string;
  actionTaken?: 'approved' | 'declined';
  metadata?: {
    allowsPlusOne?: boolean;
    declineReason?: string;
  };
}

export interface NotificationItem {
  id: string;
  type: 'VIP_REQUEST' | 'VIP_APPROVED' | 'VIP_DECLINED' | 'invitation' | 'vip_approved' | 'streak_alert' | 'companion_confirmed';
  title: string;
  message: string;
  timeAgo: string;
  isRead?: boolean;
  read?: boolean;
  actionRequired?: boolean;
  passId?: string;
  eventId?: string;
  eventTitle?: string;
  senderName?: string;
  senderId?: string;
  actionTaken?: 'approved' | 'declined';
  metadata?: {
    allowsPlusOne?: boolean;
    declineReason?: string;
  };
}

export type TabType = 'home' | 'passes' | 'search';

export interface CreateEventFormData {
  artImage?: string | null;
  imageUrl?: string | null;
  name: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  coordinates?: { lat: number; lng: number } | null;
  privacy: 'public' | 'private';
  allowPlusOne: boolean;
  maxCapacity: number;
}

export interface EventInviteData {
  id: string;
  title: string;
  subtitle?: string;
  hostName: string;
  isPrivate: boolean;
  flyerImage?: string;
  theme?: 'reggaeton' | 'indie' | 'techno' | 'dubai' | 'birthday' | 'custom';
  dateDisplay: string;
  timeRange: string;
  venueName: string;
  exactAddress?: string;
  coordinates?: { lat: number; lng: number } | null;
  confirmedCount: number;
  confirmedAvatars?: string[];
  allowsPlusOne: boolean;
  description?: string;
}

export interface GuestPassItem {
  id: string;
  eventId: string;
  eventTitle?: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  withPlusOne: boolean;
  status: 'pending' | 'active' | 'used' | 'rejected';
  requestedAt?: number;
  approvedAt?: number;
  usedAt?: number;
  updatedAt?: number;
}

