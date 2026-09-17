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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
      className="w-full px-4 z-20"
    >
      {/* Contenedor estilo cápsula con fondo Salmón / Coral #E87A72 */}
      <div className="relative w-full h-14 rounded-2xl bg-[#E87A72] p-1.5 flex items-center justify-between shadow-lg">
        {/* Botón Principal Izquierda: [ + ] CREAR EVENTO en tipografía Antonio Bold negra */}
        <button
          onClick={onCreateEventClick}
          className="flex-1 h-full flex items-center justify-center pl-3 pr-2 text-left focus:outline-none group"
        >
          <span className="font-display text-black text-[26px] sm:text-[28px] font-black tracking-tight uppercase group-hover:scale-[1.02] transition-transform flex items-center space-x-1.5">
            <span className="text-xl font-bold">[ + ]</span>
            <span>CREAR EVENTO</span>
          </span>
        </button>

        {/* Botón Pastilla Negro Derecha: [ ⛶ ESCANEAR QR ] con borde fino #26282E */}
        <motion.button
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'backOut', delay: 0.45 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onScanQrClick}
          className="h-full px-3.5 bg-[#101114] hover:bg-[#181a1e] rounded-xl flex items-center space-x-1.5 border border-[#26282E] focus:outline-none transition-colors"
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

export default ActionFooter;
