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
  // Inicializamos en 1 (Indie Night) para coincidir con la referencia visual
  const [currentIndex, setCurrentIndex] = useState(1);

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
        className="relative w-full h-[485px] sm:h-[500px] flex items-center justify-center py-2"
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
                {/* TARJETA COMPLETA ALARGADA CON BORDE FINO SALMÓN #E87A72 Y FONDO OSCURO #181A1E */}
                <div className="w-[290px] sm:w-[310px] h-[465px] sm:h-[480px] rounded-[28px] bg-[#181A1E] border-2 sm:border-[2.5px] border-[#E87A72] p-4 flex flex-col justify-between shadow-2xl overflow-hidden cursor-pointer">
                  
                  {/* 1. Miniatura Superior del Flyer: CASI CUADRADA (~1:1) */}
                  <div className="relative w-full h-[215px] sm:h-[225px] rounded-2xl overflow-hidden shadow-inner border border-neutral-800/80 flex-shrink-0">
                    {flyer.imageUrl ? (
                      <img
                        src={flyer.imageUrl}
                        alt={flyer.title}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-b from-[#1E2025] to-[#121316] rounded-xl flex items-center justify-center">
                        <span className="text-zinc-500 font-sans text-xs">SIN FLYER</span>
                      </div>
                    )}
                  </div>

                  {/* 2. Bloque Descriptivo y Metadatos: Posicionado más abajo con espacio negativo */}
                  <div className="w-full flex-1 flex flex-col justify-between pt-3 pb-1">
                    <div className="space-y-1">
                      {/* Título */}
                      <h4 className="font-display text-white text-lg sm:text-xl font-black tracking-tight uppercase leading-tight line-clamp-1">
                        {flyer.typeBadge}: {flyer.title}
                      </h4>

                      {/* Fecha y Horario (la hora va debajo de la fecha) */}
                      <div>
                        <p className="font-display text-white text-xs sm:text-sm font-bold tracking-wide uppercase">
                          {flyer.dateDisplay}
                        </p>
                        <p className="font-sans text-zinc-400 text-xs sm:text-sm font-medium mt-0.5">
                          {flyer.timeRange}
                        </p>
                      </div>

                      {/* Ubicación */}
                      <p className="font-sans text-neutral-300 text-xs sm:text-sm font-normal line-clamp-1">
                        {flyer.location}
                      </p>

                      {/* Disponibilidad */}
                      <p className="font-sans text-[#E87A72] text-xs sm:text-sm font-bold tracking-wide">
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
                      className="w-full mt-3 py-3 px-4 rounded-full bg-white hover:bg-neutral-100 text-black font-display text-[19px] font-black tracking-wider uppercase flex items-center justify-center transition-colors shadow-sm focus:outline-none"
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
