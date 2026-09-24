import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VipFlyerItem } from '../types/home';
import { EventDetailModal } from '../components/EventDetailModal';
import { BottomNav } from '../components/BottomNav';
import { formatCardDate } from '../lib/dateUtils';
import '../styles/fonts.css';

export interface ExploreScreenProps {
  onBack?: () => void;
  onNavigate?: (route: string) => void;
  onSelectEvent?: (event: VipFlyerItem) => void;
}

type QuickFilterType =
  | 'Todos'
  | 'Hoy / Esta Noche 🔥'
  | 'Fin de Semana'
  | 'Conciertos / Indie'
  | 'Club / Reggaeton'
  | 'Gratis / VIP';

const QUICK_FILTERS: QuickFilterType[] = [
  'Todos',
  'Hoy / Esta Noche 🔥',
  'Fin de Semana',
  'Conciertos / Indie',
  'Club / Reggaeton',
  'Gratis / VIP',
];

const mapDocToVipFlyer = (id: string, data: any): VipFlyerItem => ({
  id,
  eventId: id,
  hostUserId: data.hostUserId,
  hostName: data.hostName || (data.hostUserId ? 'ANFITRIÓN' : 'COMUNIDAD +1'),
  hostPhotoUrl: data.hostPhotoUrl || data.hostAvatar || undefined,
  typeBadge: data.type === 'public' ? 'EVENTO PÚBLICO' : 'FIESTA PRIVADA',
  title: data.title || 'SIN TÍTULO',
  subtitle: data.allowsPlusOne ? 'Pase +1 Habilitado' : 'Acceso Individual',
  dateDisplay: data.date ? formatCardDate(data.date.toString()) : 'PRÓXIMAMENTE',
  date: data.date,
  timeRange: `${data.startTime || '22:00'} — ${data.endTime || '04:00'}`,
  startTime: data.startTime,
  endTime: data.endTime,
  location: data.location || 'Por definir',
  availabilityText: `CUPO MÁX. ${data.maxCapacity || 150} ·`,
  theme: data.theme || 'custom',
  exactAddress: data.location || '',
  imageUrl: data.imageUrl || data.artImage || undefined,
  description: data.description || `Organizado por ${data.hostName || 'Comunidad +1'}. Acceso en puerta con código QR.`,
  isVipOrFree: true,
  vipCutoffTime: data.vipCutoffTime || null,
});

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  onBack,
  onNavigate,
  onSelectEvent,
}) => {
  const [events, setEvents] = useState<VipFlyerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuickFilterType>('Todos');
  const [selectedEvent, setSelectedEvent] = useState<VipFlyerItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'events'), where('type', '==', 'public'));
    const unsub = onSnapshot(q, (snap) => {
      const live = snap.docs.map((d) => mapDocToVipFlyer(d.id, d.data()));
      setEvents(live);
    }, () => {});
    return () => unsub();
  }, []);

  const handleBack = () => {
    if (onBack) onBack();
    else if (onNavigate) onNavigate('/');
  };

  const filteredEvents = events.filter((evt) => {
    if (activeFilter === 'Hoy / Esta Noche 🔥') {
      const match = evt.isTonight || /hoy|esta noche/i.test(evt.dateDisplay);
      if (!match) return false;
    } else if (activeFilter === 'Fin de Semana') {
      const match = evt.isWeekend || /vie|sáb|dom/i.test(evt.dateDisplay);
      if (!match) return false;
    } else if (activeFilter === 'Conciertos / Indie') {
      const match =
        evt.theme === 'indie' ||
        /indie|concierto|rock|banda|rock_indie|live rock/i.test(`${evt.title} ${evt.subtitle} ${evt.description}`);
      if (!match) return false;
    } else if (activeFilter === 'Club / Reggaeton') {
      const match =
        evt.theme === 'reggaeton' ||
        evt.theme === 'dubai' ||
        /club|perreo|reggaeton|cumbia/i.test(`${evt.title} ${evt.subtitle} ${evt.description}`);
      if (!match) return false;
    } else if (activeFilter === 'Gratis / VIP') {
      const match =
        evt.isVipOrFree ||
        /vip|free|gratis/i.test(`${evt.subtitle} ${evt.availabilityText}`);
      if (!match) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const searchTarget = `${evt.title} ${evt.subtitle} ${evt.location} ${evt.exactAddress || ''} ${evt.description || ''}`.toLowerCase();
    return searchTarget.includes(q);
  });

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#000000] text-white flex flex-col justify-between overflow-x-hidden font-sans select-none pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      {/* Fondo abstracto sutil */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-cover bg-center"
        style={{
          backgroundImage: "url('./assets/images/fondo_iniciob.webp')",
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      />

      <div className="relative z-20 flex-1 flex flex-col w-full max-w-md mx-auto px-4">
        {/* 1. TOP BAR */}
        <header className="flex items-center justify-between pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-2 w-full">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 cursor-pointer"
          >
            <span className="text-xl font-bold leading-none">←</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-[#E87A72] font-display font-black text-2xl tracking-tighter leading-none">+1</span>
            <span className="font-display text-white text-lg font-black tracking-wider uppercase">BUSCADOR</span>
          </div>
          <div className="w-10 h-10" />
        </header>

        {/* 2. BARRA DE BÚSQUEDA */}
        <div className="relative my-2">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por evento, venue o zona..."
            className="w-full h-12 pl-11 pr-10 rounded-2xl bg-[#16171B] border border-[#26282E] focus:border-[#E87A72] text-white font-sans text-sm placeholder-neutral-500 outline-none transition-colors"
          />
          <span className="absolute left-3.5 top-3.5 text-neutral-500 text-base">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* 3. FILTROS RÁPIDOS */}
        <div className="flex space-x-2 overflow-x-auto py-2 no-scrollbar">
          {QUICK_FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full font-sans text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#E87A72] text-black shadow-md'
                    : 'bg-[#16171B] border border-[#26282E] text-neutral-400 hover:text-white'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* 4. CARTELERA */}
        <div className="flex items-center justify-between px-1 mt-2 mb-2">
          <span className="font-display text-neutral-400 text-xs font-bold tracking-wider uppercase">
            CARTELERA ({filteredEvents.length})
          </span>
          {searchQuery && (
            <span className="font-sans text-[11px] text-neutral-500 truncate max-w-[180px]">
              Buscando &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>

        {/* LISTA DE TARJETAS */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pb-24 pr-0.5">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <motion.div
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  setIsDetailOpen(true);
                  if (onSelectEvent) onSelectEvent(event);
                }}
                whileTap={{ scale: 0.98 }}
                className="bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/70 rounded-2xl p-2.5 flex items-center space-x-3 cursor-pointer transition-colors group"
              >
                {/* Miniatura Izquierda (~1:1, w-20 h-20) */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#16171B] shrink-0 border border-white/10">
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#1A1C20] text-[#E87A72] font-display text-xs text-center p-1 uppercase">
                      {event.title.slice(0, 10)}
                    </div>
                  )}
                </div>

                {/* Detalles Derecha */}
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="font-display text-white text-base font-black tracking-tight uppercase leading-tight truncate group-hover:text-[#E87A72] transition-colors">
                    {event.title}
                  </h4>
                  <p className="font-sans text-neutral-300 text-xs font-medium mt-0.5 truncate">
                    {formatCardDate(event.dateDisplay || event.date)} · {event.timeRange.split('—')[0].trim()}
                  </p>
                  <div className="flex items-center text-neutral-400 text-xs font-sans mt-0.5 truncate">
                    <span className="mr-1 text-[11px]">📍</span>
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="mt-1.5 flex items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-wider bg-[#E87A72]/15 text-[#E87A72] border border-[#E87A72]/30">
                      {event.availabilityText ? event.availabilityText.replace('·', '').trim() : 'LISTA VIP DISPONIBLE'}
                    </span>
                  </div>
                </div>

                <div className="text-neutral-500 group-hover:text-white transition-colors pr-1">
                  <span className="text-lg">›</span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-16 text-center text-neutral-500 bg-[#16171B]/50 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center p-6">
              <span className="text-3xl mb-2">🔍</span>
              <p className="font-display text-neutral-300 text-sm font-bold uppercase tracking-wider">
                NO SE ENCONTRARON EVENTOS
              </p>
              <p className="font-sans text-xs text-neutral-500 mt-1 max-w-[220px]">
                Prueba buscando con otro término o selecciona otra categoría.
              </p>
            </div>
          )}
        </div>
      </div>

      <EventDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        event={selectedEvent}
        onApplyVip={() => {}}
        onNavigate={onNavigate}
      />

      <BottomNav
        activeTab="search"
        onTabSelect={(tab) => {
          if (tab === 'home') handleBack();
          else if (tab === 'passes') onNavigate?.('/passes');
        }}
        onScanClick={() => onNavigate?.('/scanner')}
        isVisible={true}
      />
    </div>
  );
};

export default ExploreScreen;
