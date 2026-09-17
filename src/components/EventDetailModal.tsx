import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VipFlyerItem } from '../types/home';

interface EventDetailModalProps {
  event: VipFlyerItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyVip: (eventId: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onApplyVip,
}) => {
  if (!event) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed md:absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-5 select-none overflow-hidden">
          {/* Fondo con oscurecimiento y desenfoque intenso (Backdrop Blur) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
          />

          {/* Tarjeta Centrada en Pantalla con Animación Zoom In Suave */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="relative w-full max-w-[345px] sm:max-w-[360px] max-h-[84%] bg-[#181A1E] border-2 border-[#E87A72] rounded-[28px] p-5 shadow-2xl z-10 flex flex-col overflow-hidden"
          >
            {/* Botón de Cierre Superior Derecho (✕) */}
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white flex items-center justify-center text-base z-20 border border-neutral-700/60 focus:outline-none transition-colors"
            >
              ✕
            </button>

            {/* Contenido con scroll vertical limpio */}
            <div className="overflow-y-auto no-scrollbar pr-1 pb-3 flex-1 min-h-0">
              
              {/* 1. Cabecera Gráfica: Flyer visual proporcional */}
              <div className="relative w-full h-[145px] sm:h-[155px] rounded-2xl overflow-hidden border border-neutral-800 shadow mb-3.5 flex-shrink-0">
                {event.theme === 'reggaeton' && (
                  <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-r from-[#e60050] via-[#850337] to-[#240011] p-4 text-center">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className="text-3xl filter drop-shadow">🔥</span>
                      <span className="text-3xl filter drop-shadow">💃</span>
                    </div>
                    <span className="font-display text-[#fab205] text-2xl font-black tracking-widest uppercase leading-tight">
                      LATIN PERREO
                    </span>
                  </div>
                )}

                {event.theme === 'dubai' && (
                  <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#1b003a] via-[#090b1c] to-[#04040a] p-4">
                    <div className="px-3 py-1 bg-[#101026] border border-[#00f3ff] rounded-sm mb-2">
                      <span className="text-[#00f3ff] font-display text-sm tracking-widest font-black uppercase">
                        CLUB DUBÁI
                      </span>
                    </div>
                    <span className="font-display text-white text-lg font-bold tracking-wider uppercase">
                      VIP NIGHT & COCKTAILS
                    </span>
                  </div>
                )}

                {event.theme === 'indie' && (
                  <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#0c1626] to-[#04070e] p-4">
                    <div className="flex items-center space-x-2 text-3xl mb-1">
                      <span>🎸</span><span>🎤</span><span>⚡</span>
                    </div>
                    <span className="font-display text-cyan-400 text-xl font-black tracking-widest uppercase">
                      INDIE LIVE CONCERT
                    </span>
                  </div>
                )}

                {event.theme === 'techno' && (
                  <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0a0f] via-[#11131c] to-[#000000] p-4">
                    <div className="w-12 h-12 border border-[#12c061] rounded-full flex items-center justify-center mb-1">
                      <span className="font-display text-[#12c061] text-xs font-mono font-bold">135 BPM</span>
                    </div>
                    <span className="font-display text-white text-lg font-bold tracking-wider uppercase">
                      TECHNO BASEMENT AFTER
                    </span>
                  </div>
                )}

                {/* Badge de Disponibilidad sobre el banner */}
                <div className="absolute bottom-2 left-2.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-sm border border-neutral-700/80">
                  <span className="font-sans text-xs font-bold text-[#E87A72] tracking-wide">
                    {event.availabilityText}
                  </span>
                </div>
              </div>

              {/* Título Principal y Subtítulo */}
              <h3 className="font-display text-white text-xl sm:text-2xl font-black tracking-tight uppercase leading-tight">
                {event.typeBadge}: {event.title}
              </h3>
              <p className="font-sans text-[#E87A72] text-xs sm:text-sm font-semibold mt-1">
                {event.subtitle}
              </p>

              {/* 2. Metadatos Completos */}
              <div className="mt-4 p-3.5 rounded-xl bg-[#121316] border border-neutral-800 space-y-2">
                <div className="flex items-center text-white/90 text-xs sm:text-sm font-sans">
                  <span className="w-5 text-center mr-2 text-base">📅</span>
                  <span className="font-display uppercase tracking-wide font-bold">{event.dateDisplay}</span>
                </div>
                <div className="flex items-center text-neutral-300 text-xs sm:text-sm font-sans">
                  <span className="w-5 text-center mr-2 text-base">⏰</span>
                  <span>{event.timeRange}</span>
                </div>
                <div className="flex items-center text-neutral-300 text-xs sm:text-sm font-sans">
                  <span className="w-5 text-center mr-2 text-base text-neutral-500">•</span>
                  <span>{event.exactAddress || event.location}</span>
                </div>
              </div>

              {/* 3. Sección "Detalles y Motivo" */}
              {event.description && (
                <div className="mt-5">
                  <h4 className="font-display text-neutral-400 text-xs font-bold uppercase tracking-wider mb-1.5">
                    DETALLES Y TEMÁTICA
                  </h4>
                  <p className="font-sans text-neutral-200 text-xs sm:text-sm leading-relaxed">
                    {event.description}
                  </p>
                </div>
              )}

              {/* 4. Sección "Activaciones y Promociones" */}
              {event.promotions && event.promotions.length > 0 && (
                <div className="mt-5">
                  <h4 className="font-display text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
                    ACTIVACIONES Y BENEFICIOS VIP
                  </h4>
                  <ul className="space-y-1.5">
                    {event.promotions.map((promo, idx) => (
                      <li key={idx} className="flex items-start text-xs sm:text-sm text-neutral-300 font-sans">
                        <span className="text-[#E87A72] mr-2 leading-tight">✦</span>
                        <span>{promo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

            {/* 5. Botón de Conversión Fijo al pie del modal: SOLICITAR VIP */}
            <div className="pt-3 border-t border-neutral-800/80 mt-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onApplyVip(event.id);
                  onClose();
                }}
                className="w-full py-3.5 px-4 rounded-full bg-[#E87A72] hover:bg-[#d66f67] text-black font-display text-base font-black tracking-wider uppercase flex items-center justify-center transition-colors shadow-lg focus:outline-none"
              >
                SOLICITAR VIP
              </motion.button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EventDetailModal;
