import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { VipFlyerItem } from '../types/home';

interface MainEventCardProps {
  flyers: VipFlyerItem[];
  onApplyVipClick: (flyerId: string) => void;
}

export const MainEventCard: React.FC<MainEventCardProps> = ({
  flyers,
  onApplyVipClick,
}) => {
  // Inicializamos en 2 (Mamacita Reggaeton) como en la imagen de referencia, o en 0
  const [currentIndex, setCurrentIndex] = useState(2);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < flyers.length - 1 ? prev + 1 : prev));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const swipeThreshold = 30;
    if (info.offset.x < -swipeThreshold) {
      handleNext();
    } else if (info.offset.x > swipeThreshold) {
      handlePrev();
    }
  };

  const currentFlyer = flyers[currentIndex] || flyers[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
      className="w-full px-4 select-none"
    >
      {/* Tarjeta Principal Gris Oscuro Mate #181A1E con Borde Fino 1.5px #E87A72 y Esquinas 24px */}
      <div className="relative w-full rounded-[24px] bg-[#181A1E] border-[1.5px] border-[#E87A72] p-5 flex flex-col justify-between shadow-2xl overflow-hidden">
        
        {/* Encabezado Interno: PROXIMOS EVENTOS */}
        <div className="w-full mb-3.5">
          <h3 className="font-display text-[#9CA3AF] text-xl font-bold tracking-wider uppercase m-0 leading-none">
            PROXIMOS EVENTOS
          </h3>
        </div>

        {/* Vitrina Cover Flow 3D tipo Poster Horizontal */}
        <div
          className="relative w-full h-[190px] sm:h-[210px] flex items-center justify-center overflow-hidden my-1"
          style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
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

              let rotateY = 0;
              let scale = 1;
              let opacity = 1;
              let zIndex = 20;
              let translateX = 0;
              let translateZ = 0;

              if (offset < 0) {
                rotateY = 55;
                scale = 0.85;
                opacity = Math.max(0.3, 0.7 + offset * 0.2);
                zIndex = 10 + offset;
                translateX = -120 + (offset + 1) * 30;
                translateZ = -70;
              } else if (offset > 0) {
                rotateY = -55;
                scale = 0.85;
                opacity = Math.max(0.3, 0.7 - offset * 0.2);
                zIndex = 10 - offset;
                translateX = 120 + (offset - 1) * 30;
                translateZ = -70;
              }

              return (
                <motion.div
                  key={flyer.id}
                  onClick={() => setCurrentIndex(index)}
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
                    damping: 25,
                  }}
                >
                  {/* Poster Rectangular Horizontal tipo Flyer */}
                  <div className="w-[260px] sm:w-[280px] h-[155px] sm:h-[170px] rounded-2xl overflow-hidden shadow-lg border border-neutral-800/80 cursor-pointer">
                    {flyer.theme === 'reggaeton' && (
                      <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-r from-[#e60050] via-[#850337] to-[#240011] p-4 text-center">
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
                      <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#1b003a] via-[#090b1c] to-[#04040a] p-4">
                        <div className="px-3 py-1 bg-[#101026] border border-[#00f3ff] rounded-sm mb-2">
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
                      <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#0c1626] to-[#04070e] p-4">
                        <div className="flex items-center space-x-2 text-2xl mb-1">
                          <span>🎸</span><span>🎤</span><span>⚡</span>
                        </div>
                        <span className="font-display text-cyan-400 text-base font-black tracking-widest uppercase">
                          INDIE LIVE
                        </span>
                      </div>
                    )}

                    {flyer.theme === 'techno' && (
                      <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0a0f] via-[#11131c] to-[#000000] p-4">
                        <div className="w-10 h-10 border border-[#12c061] rounded-full flex items-center justify-center mb-1">
                          <span className="font-display text-[#12c061] text-[10px] font-mono font-bold">135</span>
                        </div>
                        <span className="font-display text-white text-base font-bold tracking-wider uppercase">
                          TECHNO AFTER
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Datos del Evento Seleccionado */}
        <div className="w-full mt-3">
          <h4 className="font-display text-white text-xl sm:text-2xl font-black tracking-tight uppercase leading-tight">
            {currentFlyer.typeBadge}: {currentFlyer.title}
          </h4>
          <p className="font-sans text-[#E87A72] text-sm font-medium tracking-normal mt-0.5 leading-tight">
            {currentFlyer.subtitle}
          </p>
          <p className="font-sans text-neutral-400 text-xs font-normal mt-1">
            {currentFlyer.badgeDetail} •
          </p>
        </div>

        {/* Botón Ancho Blanco: SOLICITAR VIP */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onApplyVipClick(currentFlyer.id)}
          className="w-full mt-5 py-3 rounded-full bg-white hover:bg-neutral-100 text-black font-display text-base font-black tracking-wider uppercase flex items-center justify-center transition-colors shadow-sm focus:outline-none"
        >
          SOLICITAR VIP
        </motion.button>

      </div>

      {/* Paginador: Indicadores de puntos horizontales (Dots) */}
      <div className="flex items-center justify-center space-x-2 mt-4">
        {flyers.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            aria-label={`Ir al flyer ${i + 1}`}
            className={`rounded-full transition-all duration-300 focus:outline-none ${
              i === currentIndex
                ? 'w-2 h-2 bg-white'
                : 'w-1.5 h-1.5 bg-neutral-600 hover:bg-neutral-400'
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default MainEventCard;
