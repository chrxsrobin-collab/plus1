import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { VipFlyerItem } from '../types/home';

interface FullCardCoverFlowProps {
  flyers: VipFlyerItem[];
  onApplyVipClick: (flyerId: string) => void;
  onSelectEvent?: (event: VipFlyerItem) => void;
}

export const FullCardCoverFlow: React.FC<FullCardCoverFlowProps> = ({
  flyers,
  onApplyVipClick,
  onSelectEvent,
}) => {
  // Inicializamos en 2 (Mamacita) o en 0
  const [currentIndex, setCurrentIndex] = useState(2);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < flyers.length - 1 ? prev + 1 : prev));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const swipeThreshold = 35;
    if (info.offset.x < -swipeThreshold) {
      handleNext();
    } else if (info.offset.x > swipeThreshold) {
      handlePrev();
    }
  };

  return (
    <div className="relative w-full overflow-hidden select-none flex flex-col items-center">
      {/* Contenedor Cover Flow con perspectiva para las tarjetas completas */}
      <div
        className="relative w-full h-[430px] sm:h-[450px] flex items-center justify-center py-2"
        style={{ perspective: '1100px', transformStyle: 'preserve-3d' }}
      >
        <motion.div
          className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y"
          style={{ transformStyle: 'preserve-3d' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
        >
          {flyers.map((flyer, index) => {
            const offset = index - currentIndex;
            const isCenter = offset === 0;

            let rotateY = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 20;
            let translateX = 0;
            let translateZ = 0;

            if (offset < 0) {
              rotateY = 50;
              scale = 0.86;
              opacity = Math.max(0.3, 0.7 + offset * 0.2);
              zIndex = 10 + offset;
              translateX = -140 + (offset + 1) * 35;
              translateZ = -70;
            } else if (offset > 0) {
              rotateY = -50;
              scale = 0.86;
              opacity = Math.max(0.3, 0.7 - offset * 0.2);
              zIndex = 10 - offset;
              translateX = 140 + (offset - 1) * 35;
              translateZ = -70;
            }

            return (
              <motion.div
                key={flyer.id}
                onClick={() => {
                  if (isCenter) {
                    onSelectEvent?.(flyer);
                  } else {
                    setCurrentIndex(index);
                  }
                }}
                className="absolute origin-center will-change-transform"
                style={{
                  zIndex,
                  transformStyle: 'preserve-3d',
                }}
                animate={{
                  x: translateX,
                  z: translateZ,
                  rotateY,
                  scale,
                  opacity,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 26,
                }}
              >
                {/* TARJETA COMPLETA EN BLOQUE CON BORDE SALMÓN #E87A72 (+2px más grueso: 3.5px) */}
                <div className="w-[285px] sm:w-[305px] h-[390px] sm:h-[405px] rounded-[24px] bg-[#181A1E] border-[3.5px] border-[#E87A72] p-4 flex flex-col justify-between shadow-2xl overflow-hidden cursor-pointer">
                  
                  {/* 1. Miniatura Superior del Flyer */}
                  <div className="relative w-full h-[150px] sm:h-[160px] rounded-xl overflow-hidden shadow border border-neutral-800/80 mb-2 flex-shrink-0">
                    {flyer.theme === 'reggaeton' && (
                      <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-r from-[#e60050] via-[#850337] to-[#240011] p-3 text-center">
                        <div className="flex items-center space-x-1 mb-1">
                          <span className="text-2xl filter drop-shadow">🔥</span>
                          <span className="text-2xl filter drop-shadow">💃</span>
                        </div>
                        <span className="font-display text-[#fab205] text-lg font-black tracking-widest uppercase leading-tight">
                          LATIN PERREO
                        </span>
                      </div>
                    )}

                    {flyer.theme === 'dubai' && (
                      <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#1b003a] via-[#090b1c] to-[#04040a] p-3">
                        <div className="px-3 py-1 bg-[#101026] border border-[#00f3ff] rounded-sm mb-1.5">
                          <span className="text-[#00f3ff] font-display text-xs tracking-widest font-black uppercase">
                            CLUB DUBÁI
                          </span>
                        </div>
                        <span className="font-display text-white text-base font-bold tracking-wider uppercase">
                          VIP NIGHT
                        </span>
                      </div>
                    )}

                    {flyer.theme === 'indie' && (
                      <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#0c1626] to-[#04070e] p-3">
                        <div className="flex items-center space-x-2 text-2xl mb-1">
                          <span>🎸</span><span>🎤</span><span>⚡</span>
                        </div>
                        <span className="font-display text-cyan-400 text-base font-black tracking-widest uppercase">
                          INDIE LIVE
                        </span>
                      </div>
                    )}

                    {flyer.theme === 'techno' && (
                      <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0a0f] via-[#11131c] to-[#000000] p-3">
                        <div className="w-9 h-9 border border-[#12c061] rounded-full flex items-center justify-center mb-1">
                          <span className="font-display text-[#12c061] text-[10px] font-mono font-bold">135</span>
                        </div>
                        <span className="font-display text-white text-base font-bold tracking-wider uppercase">
                          TECHNO AFTER
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 2. Bloque Descriptivo y Metadatos Requeridos */}
                  <div className="w-full flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      {/* Título */}
                      <h4 className="font-display text-white text-lg sm:text-xl font-black tracking-tight uppercase leading-tight line-clamp-1">
                        {flyer.typeBadge}: {flyer.title}
                      </h4>

                      {/* Fecha y Horario (la hora va debajo de la fecha) */}
                      <div>
                        <p className="font-display text-white text-xs font-bold tracking-wide uppercase">
                          {flyer.dateDisplay}
                        </p>
                        <p className="font-sans text-zinc-400 text-xs font-medium mt-0.5">
                          {flyer.timeRange}
                        </p>
                      </div>

                      {/* Ubicación (sin 📍) */}
                      <p className="font-sans text-neutral-300 text-xs font-normal line-clamp-1">
                        {flyer.location}
                      </p>

                      {/* Disponibilidad */}
                      <p className="font-sans text-[#E87A72] text-xs font-bold tracking-wide">
                        {flyer.availabilityText}
                      </p>
                    </div>

                    {/* 3. Botón de Acción Individual: SOLICITAR VIP */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyVipClick(flyer.id);
                      }}
                      className="w-full mt-2.5 py-2.5 px-4 rounded-full bg-white hover:bg-neutral-100 text-black font-display text-sm sm:text-base font-black tracking-wider uppercase flex items-center justify-center transition-colors shadow-sm focus:outline-none"
                    >
                      SOLICITAR VIP
                    </motion.button>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Paginador: Indicadores de puntos horizontales (Dots) */}
      <div className="flex items-center justify-center space-x-2 mt-3">
        {flyers.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            aria-label={`Ir al evento ${i + 1}`}
            className={`rounded-full transition-all duration-300 focus:outline-none ${
              i === currentIndex
                ? 'w-2 h-2 bg-white'
                : 'w-1.5 h-1.5 bg-neutral-600 hover:bg-neutral-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default FullCardCoverFlow;
