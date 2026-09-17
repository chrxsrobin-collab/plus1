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
      className="relative flex-shrink-0 w-full rounded-2xl p-3 bg-[#101114] select-none flex flex-row items-center gap-3 shadow-none transition-transform duration-200"
      style={{
        border: `1.5px solid ${borderColor}`,
      }}
    >
      {/* 1. Miniatura Cuadrada Estricta 1:1 a la izquierda */}
      <div className="relative w-20 h-20 sm:w-[88px] sm:h-[88px] aspect-square flex-shrink-0 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
        {pass.imageUrl ? (
          <img
            src={pass.imageUrl}
            alt={pass.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1c1f26] to-[#0d0e12]">
            <span className="text-2xl">{pass.emoji || '🎟️'}</span>
          </div>
        )}
        {/* Badge de fecha sobre la miniatura */}
        {pass.badgeNumber && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-neutral-700/80">
            <span className="font-mono text-[9px] font-bold text-white leading-none">
              {pass.badgeNumber}
            </span>
          </div>
        )}
      </div>

      {/* 2. Bloque de Información (Columna Derecha) */}
      <div className="flex flex-col justify-between flex-1 min-w-0 h-full py-0.5">
        <div>
          {/* Título del evento */}
          <h3 className="font-display text-white text-lg sm:text-xl font-bold tracking-tight uppercase truncate leading-tight">
            {pass.title} {pass.emoji}
          </h3>

          {/* Metadatos: Fecha, hora y zona */}
          <p className="font-sans text-neutral-400 text-xs font-medium tracking-normal mt-0.5 truncate">
            {pass.dateStr} • {pass.timeStr} | {pass.location}
          </p>

          {/* Estado del pase */}
          <p className="font-sans text-xs font-semibold mt-1 text-[#fe97de] truncate">
            Estado: {pass.statusText}
          </p>
        </div>

        {/* 3. Botón de Acción Actualizado: VER MI QR */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onViewQrClick(pass.id)}
          className="w-full mt-2 py-1.5 px-3 rounded-full bg-white hover:bg-neutral-100 text-black font-display text-xs sm:text-sm font-extrabold tracking-wider uppercase flex items-center justify-center space-x-1.5 shadow-none transition-colors focus:outline-none"
        >
          <span>VER MI QR</span>
          <span className="text-sm leading-none">🎟️</span>
        </motion.button>
      </div>
    </div>
  );
};

export default PassCard;
