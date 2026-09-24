import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VipFlyerItem } from '../types/home';
import { computeEventEndTimestamp, formatCardDate } from '../lib/dateUtils';

export interface SearchEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: VipFlyerItem[];
  onSelectEvent: (event: VipFlyerItem) => void;
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

export const SearchEventsModal: React.FC<SearchEventsModalProps> = ({
  isOpen,
  onClose,
  events,
  onSelectEvent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuickFilterType>('Todos');
  const inputRef = useRef<HTMLInputElement>(null);

  // Autoenfoque al abrir
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isOpen) {
      timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setActiveFilter('Todos');
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen]);

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtrado de eventos reactivo: primero excluir eventos ya finalizados
  const now = Date.now();
  const activeEvents = events.filter((evt) => {
    const eventEnd = evt.endTimestamp || computeEventEndTimestamp(evt.date, evt.endTime, evt.startTime);
    return eventEnd > now;
  });

  const filteredEvents = activeEvents.filter((evt) => {
    // 1. Filtro por chip
    if (activeFilter === 'Hoy / Esta Noche 🔥') {
      const match =
        evt.isTonight ||
        /hoy|esta noche|sáb\. 14/i.test(evt.dateDisplay);
      if (!match) return false;
    } else if (activeFilter === 'Fin de Semana') {
      const match =
        evt.isWeekend ||
        /vie|sáb|dom/i.test(evt.dateDisplay);
      if (!match) return false;
    } else if (activeFilter === 'Conciertos / Indie') {
      const match =
        evt.theme === 'indie' ||
        evt.categoryTag === 'concierto' ||
        /indie|concierto|rock|banda|rock_indie|live rock/i.test(`${evt.title} ${evt.subtitle} ${evt.description}`);
      if (!match) return false;
    } else if (activeFilter === 'Club / Reggaeton') {
      const match =
        evt.theme === 'reggaeton' ||
        evt.theme === 'dubai' ||
        evt.categoryTag === 'reggaeton' ||
        /club|perreo|reggaeton|cumbia/i.test(`${evt.title} ${evt.subtitle} ${evt.description}`);
      if (!match) return false;
    } else if (activeFilter === 'Gratis / VIP') {
      const match =
        evt.isVipOrFree ||
        /vip|free|gratis/i.test(`${evt.subtitle} ${evt.availabilityText} ${(evt.promotions || []).join(' ')}`);
      if (!match) return false;
    }

    // 2. Filtro por texto
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const searchTarget = `
      ${evt.title} 
      ${evt.subtitle} 
      ${evt.location} 
      ${evt.exactAddress || ''} 
      ${evt.dateDisplay} 
      ${evt.description || ''} 
      ${evt.availabilityText}
    `.toLowerCase();

    return searchTarget.includes(q);
  });

  const clearSearch = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setActiveFilter('Todos');
    inputRef.current?.focus();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="search-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex flex-col justify-start backdrop-blur-md bg-black/85 select-none"
        >
          <motion.div
            key="search-modal-container"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-md mx-auto h-full flex flex-col pt-3 px-4 pb-6"
          >
            {/* 1. CABECERA CON MARCA Y BOTÓN CANCELAR */}
            <div className="flex items-center justify-between pb-3 pt-1">
              <div className="flex items-center space-x-2">
                <span className="text-[#E87A72] font-display font-black text-2xl tracking-tighter leading-none">
                  +1
                </span>
                <span className="font-display text-white text-base font-black tracking-wider uppercase">
                  DESCUBRIR EVENTOS
                </span>
              </div>
              <button
                onClick={onClose}
                className="py-1.5 px-3 rounded-xl bg-[#16171B] border border-[#26282E] text-neutral-400 hover:text-white hover:border-[#E87A72] font-sans text-xs font-bold uppercase tracking-wider transition-all active:scale-95 focus:outline-none"
              >
                ✕ CANCELAR
              </button>
            </div>

            {/* 2. BARRA DE BÚSQUEDA PRINCIPAL (INPUT TOP) */}
            <div className="relative mb-3">
              {/* Icono Search */}
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E8E93]">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Input */}
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por evento, venue o zona..."
                className="w-full bg-[#16171B] border border-[#26282E] focus:border-[#E87A72] text-white placeholder-[#8E8E93] text-sm font-sans rounded-xl pl-10 pr-10 py-3 outline-none transition-colors"
              />

              {/* Botón de Limpieza Rápida */}
              {searchQuery.length > 0 && (
                <button
                  onClick={clearSearch}
                  aria-label="Limpiar búsqueda"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white transition-colors focus:outline-none"
                >
                  <span className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[11px] font-bold">
                    ✕
                  </span>
                </button>
              )}
            </div>

            {/* 3. FILTROS RÁPIDOS (CHIPS HORIZONTALES DESLIZABLES) */}
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-3 select-none">
              {QUICK_FILTERS.map((filter) => {
                const isSelected = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-xl font-sans text-xs transition-all focus:outline-none flex-shrink-0 ${
                      isSelected
                        ? 'bg-[#E87A72] text-black font-bold border border-[#E87A72] shadow-sm'
                        : 'bg-[#16171B] text-[#8E8E93] hover:text-white border border-[#26282E] hover:border-neutral-700'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>

            {/* 4. CONTEO DE RESULTADOS Y FEED VERTICAL */}
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="font-display text-neutral-400 text-xs font-bold tracking-wider uppercase">
                CARTELERA ({filteredEvents.length})
              </span>
              {searchQuery && (
                <span className="font-sans text-[11px] text-neutral-500 truncate max-w-[180px]">
                  Buscando &ldquo;{searchQuery}&rdquo;
                </span>
              )}
            </div>

            {/* LISTA CON SCROLL */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pb-20 pr-0.5">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    onClick={() => {
                      onSelectEvent(event);
                      onClose();
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
                      {/* Título en Antonio Bold */}
                      <h4 className="font-display text-white text-base font-black tracking-tight uppercase leading-tight truncate group-hover:text-[#E87A72] transition-colors">
                        {event.title}
                      </h4>

                      {/* Fecha y Horario */}
                      <p className="font-sans text-neutral-300 text-xs font-medium mt-0.5 truncate">
                        {formatCardDate(event.dateDisplay || event.date)} · {event.timeRange.split('—')[0].trim()}
                      </p>

                      {/* Ubicación con icono de pin */}
                      <div className="flex items-center text-neutral-400 text-xs font-sans mt-0.5 truncate">
                        <span className="mr-1 text-[11px]">📍</span>
                        <span className="truncate">{event.location}</span>
                      </div>

                      {/* Etiqueta de cupos / acceso */}
                      <div className="mt-1.5 flex items-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-wider bg-[#E87A72]/15 text-[#E87A72] border border-[#E87A72]/30">
                          {event.availabilityText ? event.availabilityText.replace('·', '').trim() : 'LISTA VIP DISPONIBLE'}
                        </span>
                      </div>
                    </div>

                    {/* Flecha de acceso sutil */}
                    <div className="text-neutral-500 group-hover:text-white transition-colors pr-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </motion.div>
                ))
              ) : (
                /* 5. ESTADO VACÍO (EMPTY STATE) */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center justify-center py-16 px-6 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-[#16171B] border border-[#26282E] flex items-center justify-center text-neutral-500 mb-4">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-display text-white text-lg font-black uppercase tracking-wider max-w-xs leading-snug">
                    NO ENCONTRAMOS EVENTOS CON ESE NOMBRE
                  </h3>
                  <p className="font-sans text-neutral-400 text-xs mt-2 max-w-xs leading-relaxed">
                    Intenta buscar por club o fecha, o selecciona otro filtro rápido.
                  </p>
                  <button
                    onClick={resetAllFilters}
                    className="mt-5 px-4 py-2 rounded-xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72] text-[#E87A72] font-sans text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                  >
                    VER TODOS LOS EVENTOS
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchEventsModal;
