import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { VipFlyerItem } from '../types/home';
import { VipFlyerCard } from './VipFlyerCard';

interface CoverFlowCarouselProps {
  flyers: VipFlyerItem[];
  onApplyVipClick: (flyerId: string) => void;
}

export const CoverFlowCarousel: React.FC<CoverFlowCarouselProps> = ({
  flyers,
  onApplyVipClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

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

  return (
    <div className="relative w-full py-1 overflow-hidden select-none">
      {/* Contenedor Cover Flow con altura maximizada a 350px */}
      <div
        className="relative w-full h-[350px] flex items-center justify-center"
        style={{
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
        }}
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

            // Cover Flow clásico con rotación cerrada a 60° y apilamiento en cascada
            let rotateY = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 20;
            let translateX = 0;
            let translateZ = 0;

            if (offset < 0) {
              // Tarjetas a la izquierda: rotación 60° a 65°, translateZ(-80px)
              rotateY = 62;
              scale = 0.86;
              zIndex = 10 + offset;
              translateX = -140 + (offset + 1) * 38;
              translateZ = -80;
            } else if (offset > 0) {
              // Tarjetas a la derecha: rotación -60° a -65°, translateZ(-80px)
              rotateY = -62;
              scale = 0.86;
              zIndex = 10 - offset;
              translateX = 140 + (offset - 1) * 38;
              translateZ = -80;
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
                  opacity: 1,
                  filter: isCenter ? 'blur(0px)' : 'blur(2.5px)',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                }}
              >
                <div
                  className={`transition-opacity duration-200 ${
                    isCenter ? 'pointer-events-auto' : 'pointer-events-auto cursor-pointer'
                  }`}
                >
                  <VipFlyerCard
                    flyer={flyer}
                    onApplyVipClick={onApplyVipClick}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Indicadores Cover Flow Dots discretos */}
      <div className="flex items-center justify-center space-x-1.5 mt-1.5">
        {flyers.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            aria-label={`Ir al flyer ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none ${
              i === currentIndex
                ? 'w-5 bg-[#fe97de]'
                : 'w-1.5 bg-neutral-700 hover:bg-neutral-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default CoverFlowCarousel;
