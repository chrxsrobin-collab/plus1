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
  accentBorderColor?: string;
}

export interface VipFlyerItem {
  id: string;
  typeBadge: string;
  title: string;
  subtitle: string;
  badgeDetail?: string;
  theme: 'dubai' | 'indie' | 'reggaeton' | 'techno' | 'custom';
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
  unreadNotifications: number;
  activeEventsCount: number;
}

export type TabType = 'home' | 'passes' | 'search';
