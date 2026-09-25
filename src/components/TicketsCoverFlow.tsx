import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { PassItem } from '../types/home';
import { CoverFlowTicketCard } from './CoverFlowTicketCard';

export interface TicketsCoverFlowProps {
  tickets: PassItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onSelectTicket?: (ticket: PassItem) => void;
}

export const TicketsCoverFlow: React.FC<TicketsCoverFlowProps> = ({
  tickets,
  currentIndex,
  onIndexChange,
  onSelectTicket,
}) => {
  const handleNext = () => {
    onIndexChange(Math.min(tickets.length - 1, currentIndex + 1));
  };

  const handlePrev = () => {
    onIndexChange(Math.max(0, currentIndex - 1));
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
    <div className="relative w-full overflow-visible select-none flex flex-col items-center">
      {/* Contenedor Cover Flow con perspectiva para los boletos físicos */}
      <div
        className="relative w-full h-[475px] sm:h-[505px] flex items-center justify-center py-2"
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
      >
        <motion.div
          className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y"
          style={{ transformStyle: 'preserve-3d' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
        >
          {tickets.map((ticket, index) => {
            const offset = index - currentIndex;
            const isCenter = offset === 0;

            let rotateY = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 20;
            let translateX = 0;
            let translateZ = 0;

            if (offset < 0) {
              rotateY = 52;
              scale = 0.85;
              opacity = Math.max(0.2, 0.65 + offset * 0.15);
              zIndex = 10 + offset;
              translateX = -125 + (offset + 1) * 32;
              translateZ = -90;
            } else if (offset > 0) {
              rotateY = -52;
              scale = 0.85;
              opacity = Math.max(0.2, 0.65 - offset * 0.15);
              zIndex = 10 - offset;
              translateX = 125 + (offset - 1) * 32;
              translateZ = -90;
            }

            return (
              <motion.div
                key={ticket.id}
                onClick={() => {
                  if (isCenter) {
                    onSelectTicket?.(ticket);
                  } else {
                    onIndexChange(index);
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
                  stiffness: 280,
                  damping: 22,
                }}
              >
                <CoverFlowTicketCard ticket={ticket} isActive={isCenter} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default TicketsCoverFlow;
