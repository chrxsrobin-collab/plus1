import React from 'react';
import { motion } from 'framer-motion';
import { PassItem } from '../types/home';

interface PassCardProps {
  pass: PassItem;
  onViewQrClick: (passId: string) => void;
}

export const PassCard: React.FC<PassCardProps> = ({ pass, onViewQrClick }) => {
  const borderColor = pass.accentBorderColor || '#fe97de';

  return (
    <div
      className="relative flex-shrink-0 w-full rounded-2xl p-5 bg-[#101114] select-none transition-transform duration-200"
      style={{
        border: `2px solid ${borderColor}`,
        boxShadow: '0 6px 0px 0px #fe97de',
      }}
    >
      {/* Cabecera del Pase: Emoji calendario + Título + Emoji fin */}
      <div className="flex items-center justify-center space-x-2 text-center mb-2">
        {pass.badgeNumber && (
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[#1f232b] text-white text-xs font-bold font-mono border border-neutral-700">
            📅 {pass.badgeNumber}
          </span>
        )}
        <h3 className="font-display text-white text-2xl font-bold tracking-tight uppercase">
          {pass.title}
        </h3>
        {pass.emoji && <span className="text-xl">{pass.emoji}</span>}
      </div>

      {/* Fecha, hora y ubicación */}
      <p className="font-sans text-white/90 text-sm text-center font-medium tracking-wide mb-1">
        {pass.dateStr} • {pass.timeStr} | {pass.location}
      </p>

      {/* Estado del Pase */}
      <p className="font-sans text-center text-sm font-semibold mb-4 text-[#fe97de]">
        {pass.statusText}
      </p>

      {/* Botón Brutalista Blanco: VER MI ENTRADA QR */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onViewQrClick(pass.id)}
        className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-neutral-100 text-black font-display text-base font-extrabold tracking-wider uppercase flex items-center justify-center space-x-2 shadow transition-colors focus:outline-none"
      >
        <span>VER MI ENTRADA QR</span>
        <span className="text-lg leading-none">🎟️</span>
      </motion.button>
    </div>
  );
};
