import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { VipFlyerItem } from '../types/home';
import { formatCardDate } from '../lib/dateUtils';

interface FullCardCoverFlowProps {
  flyers: VipFlyerItem[];
  userPasses?: Record<string, string>;
  onApplyVipClick?: (flyerId: string) => void;
  onRequestVip?: (event: VipFlyerItem) => void;
  onSelectEvent?: (event: VipFlyerItem) => void;
}

export const FullCardCoverFlow: React.FC<FullCardCoverFlowProps> = ({
  flyers,
  userPasses = {},
  onApplyVipClick,
  onRequestVip,
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
    <div className="relative w-full overflow-x-visible select-none flex flex-col items-center">
      {/* Contenedor Cover Flow con perspectiva para las tarjetas completas */}
      <div
        className="relative w-full h-[clamp(455px,60vh,505px)] sm:h-[clamp(475px,62vh,520px)] flex items-center justify-center py-2 overflow-x-visible"
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
            let zIndex = 20;
            let translateX = 0;
            let translateZ = 0;

            if (offset < 0) {
              rotateY = 50;
              scale = 0.86;
              zIndex = 10 + offset;
              translateX = -140 + (offset + 1) * 35;
              translateZ = -70;
            } else if (offset > 0) {
              rotateY = -50;
              scale = 0.86;
              zIndex = 10 - offset;
              translateX = 140 + (offset - 1) * 35;
              translateZ = -70;
            }

            const passStatus = userPasses[flyer.id];
            const isPending = passStatus === 'pending';
            const isActive = passStatus === 'active';

            const guestLimit = flyer.guestLimit || flyer.maxCapacity || 100;
            const activePassesCount = flyer.activePassesCount ?? 0;
            const confirmedUsers = flyer.confirmedUsers || [];
            const remainingSpots = typeof flyer.remainingSpots === 'number'
              ? flyer.remainingSpots
              : Math.max(0, guestLimit - activePassesCount);
            const isSoldOut = remainingSpots === 0;

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
                  opacity: 1,
                  filter: isCenter ? 'blur(0px)' : 'blur(2.5px)',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 26,
                }}
              >
                {/* TARJETA COMPLETA ALARGADA CON BORDE FINO SALMÓN #E87A72 Y FONDO OSCURO #181A1E */}
                <div className="w-[290px] sm:w-[310px] h-[435px] sm:h-[465px] rounded-[28px] bg-[#181A1E] border-2 sm:border-[2.5px] border-[#E87A72] p-4 flex flex-col justify-between shadow-2xl overflow-hidden cursor-pointer transition-all duration-300">
                  
                  {/* 1. Miniatura Superior del Flyer */}
                  <div className="relative w-full h-[200px] sm:h-[215px] rounded-2xl overflow-hidden shadow-inner border border-neutral-800/80 flex-shrink-0">
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

                  {/* 2. Bloque Descriptivo y Metadatos */}
                  <div className="w-full flex-1 flex flex-col justify-between pt-2.5 pb-1">
                    <div className="space-y-1">
                      {/* Título */}
                      <h4 className="font-display text-white text-lg sm:text-xl font-black tracking-tight uppercase leading-tight line-clamp-1">
                        {flyer.typeBadge}: {flyer.title}
                      </h4>

                      {/* Fecha y Horario */}
                      <div className="flex items-baseline space-x-2">
                        <p className="font-display text-white text-xs sm:text-sm font-bold tracking-wide uppercase">
                          {formatCardDate(flyer.dateDisplay || flyer.date)}
                        </p>
                        <p className="font-sans text-zinc-400 text-xs font-medium">
                          · {flyer.timeRange}
                        </p>
                      </div>

                      {/* Ubicación */}
                      <p className="font-sans text-neutral-300 text-xs sm:text-sm font-normal line-clamp-1">
                        {flyer.location}
                      </p>

                      {/* 3. BADGES DE URGENCIA Y ESCASEZ (ALTO CONTRASTE) */}
                      <div className="pt-0.5">
                        {isSoldOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#121316] border border-[#DC2626] text-[#DC2626] font-display text-[11px] font-black tracking-wider uppercase">
                            🔒 LISTA VIP COMPLETA
                          </span>
                        ) : remainingSpots <= 20 && remainingSpots > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#121316] border border-[#E87A72] text-[#E87A72] font-display text-[11px] font-black tracking-wider uppercase shadow-sm">
                            ⏳ ÚLTIMOS {remainingSpots} CUPOS
                          </span>
                        ) : (
                          <p className="font-sans text-[#E87A72] text-xs font-bold tracking-wide">
                            {flyer.availabilityText || `CUPO MÁX. ${guestLimit} ·`}
                          </p>
                        )}
                      </div>

                      {/* 4. FILA DE ASISTENTES SOCIALES ("¿QUIÉN VA?") */}
                      <div className="flex items-center space-x-2 pt-1 pb-0.5">
                        {confirmedUsers.length > 0 ? (
                          <div className="flex -space-x-2 overflow-hidden shrink-0">
                            {confirmedUsers.slice(0, 4).map((u, i) => (
                              <div
                                key={i}
                                className="w-6 h-6 rounded-full border-2 border-[#16171B] overflow-hidden bg-[#26282E] flex items-center justify-center shrink-0"
                                title={u.name}
                              >
                                {u.photoUrl ? (
                                  <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white font-display text-[10px] font-black uppercase">
                                    {(u.name || 'A').slice(0, 1)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-[#16171B] bg-[#26282E] flex items-center justify-center shrink-0">
                            <span className="text-[10px]">🎟️</span>
                          </div>
                        )}
                        <span className="font-sans text-[#8E8E93] text-xs truncate leading-tight">
                          {activePassesCount > 0
                            ? activePassesCount === 1
                              ? `${confirmedUsers[0]?.name || '1 persona'} ya tiene su pase`
                              : `${confirmedUsers[0]?.name || '1 persona'} y ${activePassesCount - 1} más ya tienen su pase`
                            : 'Sé el primero en anotarte en la lista VIP'}
                        </span>
                      </div>
                    </div>

                    {/* 5. Botón de Acción Individual: SOLICITAR VIP aislado o deshabilitado si está completo */}
                    {isSoldOut && !isActive && !isPending ? (
                      <button
                        disabled
                        className="w-full mt-2.5 py-3 px-4 rounded-full font-display text-[17px] sm:text-[18px] font-black tracking-wider uppercase flex items-center justify-center bg-[#26282E] text-neutral-500 border border-neutral-800 cursor-not-allowed opacity-75 shadow-inner"
                      >
                        🔒 LISTA VIP COMPLETA
                      </button>
                    ) : (
                      <motion.button
                        whileHover={isPending ? {} : { scale: 1.02 }}
                        whileTap={isPending ? {} : { scale: 0.97 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isCenter) {
                            setCurrentIndex(index);
                            return;
                          }
                          if (isPending) return;
                          if (onRequestVip) {
                            onRequestVip(flyer);
                          } else if (onApplyVipClick) {
                            onApplyVipClick(flyer.id);
                          }
                        }}
                        disabled={isPending}
                        className={`w-full mt-2.5 py-3 px-4 rounded-full font-display text-[18px] sm:text-[19px] font-black tracking-wider uppercase flex items-center justify-center transition-all duration-300 shadow-sm focus:outline-none ${
                          isPending
                            ? 'bg-[#26282E] text-neutral-400 border border-neutral-700/60 cursor-default opacity-85'
                            : isActive
                            ? 'bg-[#12C061] text-black hover:bg-[#10a855] cursor-pointer'
                            : 'bg-white hover:bg-neutral-100 text-black cursor-pointer'
                        }`}
                      >
                        {isPending ? '⏳ PENDIENTE' : isActive ? '🎟️ PASE ACTIVO' : 'SOLICITAR VIP'}
                      </motion.button>
                    )}
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
