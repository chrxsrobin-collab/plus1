import React from 'react';
import { motion } from 'framer-motion';

interface MarqueeTickerProps {
  text?: string;
  speed?: number; // Duración en segundos de un ciclo
  className?: string;
}

export const MarqueeTicker: React.FC<MarqueeTickerProps> = ({
  text = 'VIP & EVENTOS · ',
  speed = 48,
  className = '',
}) => {
  // Repetimos el patrón suficiente para llenar y empalmar sin cortes
  const repeatedText = `${text}`.repeat(8);

  return (
    <div
      className={`w-full h-10 bg-black/95 border-y border-neutral-900 flex items-center overflow-hidden whitespace-nowrap select-none ${className}`}
      style={{ willChange: 'transform' }}
    >
      <motion.div
        className="flex items-center whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          ease: 'linear',
          duration: speed,
          repeat: Infinity,
        }}
      >
        <span className="font-display text-[#12c061] text-xl sm:text-2xl font-black tracking-wider uppercase pr-2">
          {repeatedText}
        </span>
        <span className="font-display text-[#12c061] text-xl sm:text-2xl font-black tracking-wider uppercase pr-2">
          {repeatedText}
        </span>
      </motion.div>
    </div>
  );
};

export default MarqueeTicker;
