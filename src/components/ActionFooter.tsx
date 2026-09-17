import React from 'react';
import { motion } from 'framer-motion';

interface ActionFooterProps {
  onCreateEventClick: () => void;
  onScanQrClick: () => void;
}

export const ActionFooter: React.FC<ActionFooterProps> = ({
  onCreateEventClick,
  onScanQrClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 35 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.35 }}
      className="w-full px-4 mb-3 z-20"
    >
      {/* Contenedor Rosa Base */}
      <div className="relative w-full h-14 rounded-2xl bg-[#fe97de] p-1.5 flex items-center justify-between shadow-lg">
        {/* Botón Principal: CREAR EVENTO */}
        <button
          onClick={onCreateEventClick}
          className="flex-1 h-full flex items-center justify-center pl-4 pr-2 text-left focus:outline-none group"
        >
          <span className="font-display text-black text-2xl sm:text-3xl font-black tracking-tight uppercase group-hover:scale-[1.02] transition-transform">
            CREAR EVENTO
          </span>
        </button>

        {/* Botón Secundario Brutalista: ESCANEAR QR con animación zoom desde el fondo */}
        <motion.button
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'backOut', delay: 0.45 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={onScanQrClick}
          className="h-full px-3.5 bg-black hover:bg-neutral-900 rounded-xl flex items-center space-x-1.5 border border-black focus:outline-none transition-colors"
        >
          {/* Ícono de Escáner QR brutalista */}
          <svg
            className="w-4 h-4 text-white fill-current"
            viewBox="0 0 24 24"
          >
            <path d="M3 9h6V3H3v6zm2-4h2v2H5V5zm8-2v6h6V3h-6zm4 4h-2V5h2v2zM3 21h6v-6H3v6zm2-4h2v2H5v-2zm13-2h-2v2h2v-2zm-4 4h-2v2h2v-2zm4 0h-2v2h2v-2zm2-2h-2v2h2v-2zm-6-4h-2v2h2v-2zm2 0h-2v2h2v-2zm2-4h-2v2h2v-2z" />
          </svg>
          <span className="font-display text-white text-xs sm:text-sm font-bold tracking-wider uppercase whitespace-nowrap">
            ESCANEAR QR
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
};
