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
      className={`w-full h-11 bg-[#12c061] border-y border-[#0fa352] flex items-center overflow-hidden whitespace-nowrap select-none shadow-sm ${className}`}
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
        <span className="font-display text-black text-xl sm:text-2xl font-black tracking-wider uppercase pr-2">
          {repeatedText}
        </span>
        <span className="font-display text-black text-xl sm:text-2xl font-black tracking-wider uppercase pr-2">
          {repeatedText}
        </span>
      </motion.div>
    </div>
  );
};

export default MarqueeTicker;
