import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCardDate } from '../lib/dateUtils';

export interface HostScanEventItem {
  id: string;
  title?: string;
  date?: string;
  startTime?: string;
  location?: string;
  imageUrl?: string;
  artImage?: string;
  maxCapacity?: number | string;
  [key: string]: any;
}

interface SelectEventToScanSheetProps {
  isOpen: boolean;
  events: HostScanEventItem[];
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
}

export const SelectEventToScanSheet: React.FC<SelectEventToScanSheetProps> = ({
  isOpen,
  events,
  onClose,
  onSelectEvent,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
          {/* Backdrop con desenfoque */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Bottom Sheet Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-md mx-auto bg-[#16171B] border-t-2 border-[#E87A72] rounded-t-3xl p-5 pb-8 shadow-2xl z-10 flex flex-col max-h-[85vh]"
          >
            {/* Tirador superior táctil */}
            <div className="w-12 h-1.5 rounded-full bg-neutral-700 mx-auto mb-4" />

            {/* Cabecera */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-[#E87A72] text-[11px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-[#E87A72]/15 border border-[#E87A72]/40">
                ✦ CONTROL DE ACCESO EN PUERTA
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <h3 className="font-display text-white text-2xl font-black uppercase tracking-tight leading-none mb-1">
              SELECCIONA EL EVENTO A ESCANEAR
            </h3>
            <p className="font-sans text-xs text-[#9CA3AF] mb-4">
              Tienes múltiples eventos creados. Elige con un tap cuál vas a controlar en la puerta:
            </p>

            {/* Lista deslizable de eventos */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1 max-h-[50vh]">
              {events.map((event) => {
                const img = event.imageUrl || event.artImage;
                return (
                  <button
                    key={event.id}
                    onClick={() => onSelectEvent(event.id)}
                    className="w-full p-3 rounded-2xl bg-[#101114] border border-[#26282E] hover:border-[#E87A72] active:scale-[0.98] transition-all flex items-center space-x-3 text-left group cursor-pointer focus:outline-none"
                  >
                    {/* Miniatura / Flyer */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-900 flex-shrink-0 border border-neutral-800">
                      {img ? (
                        <img
                          src={img}
                          alt={event.title || 'Evento'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#1F2228] to-[#121316] flex items-center justify-center text-xl font-display font-black text-[#E87A72]">
                          +1
                        </div>
                      )}
                    </div>

                    {/* Información del evento */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display text-white text-base font-black truncate uppercase leading-tight group-hover:text-[#E87A72] transition-colors">
                        {event.title || 'SIN TÍTULO'}
                      </h4>
                      <div className="flex items-center space-x-2 text-[11px] text-neutral-400 font-sans mt-0.5 truncate">
                        <span>📅 {formatCardDate(event.date) || 'Hoy'}</span>
                        <span>·</span>
                        <span>🕒 {event.startTime || '22:00'}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-sans truncate mt-0.5">
                        📍 {event.location || 'Por definir'}
                      </p>
                    </div>

                    {/* Botón rápido ESCANEAR */}
                    <div className="flex-shrink-0">
                      <span className="px-3 py-1.5 rounded-xl bg-[#E87A72]/15 border border-[#E87A72]/50 text-[#E87A72] group-hover:bg-[#E87A72] group-hover:text-black font-display text-xs font-black tracking-wider uppercase transition-colors flex items-center space-x-1">
                        <span>⛶</span>
                        <span>ESCANEAR</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Botón inferior Cerrar */}
            <div className="mt-4 pt-2 border-t border-neutral-800">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-neutral-400 hover:text-white font-display text-xs font-bold tracking-wider uppercase border border-neutral-800 transition-colors cursor-pointer"
              >
                CANCELAR
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SelectEventToScanSheet;
