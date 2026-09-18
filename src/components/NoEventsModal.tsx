import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NoEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: () => void;
}

export const NoEventsModal: React.FC<NoEventsModalProps> = ({
  isOpen,
  onClose,
  onCreateEvent,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop desenfocado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Tarjeta Modal Centrada con acento #E87A72 */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-sm bg-[#16171B] border border-[#E87A72]/60 rounded-3xl p-6 shadow-2xl z-10 text-center"
          >
            {/* Icono de advertencia / escáner bloqueado */}
            <div className="w-14 h-14 rounded-2xl bg-[#E87A72]/15 border border-[#E87A72]/40 flex items-center justify-center text-2xl mx-auto mb-4">
              <span className="text-[#E87A72]">⛶</span>
            </div>

            {/* Título en Antonio Bold */}
            <h3 className="font-display text-white text-2xl sm:text-3xl font-black uppercase tracking-wide leading-none mb-2">
              NO TIENES EVENTOS ACTIVOS
            </h3>

            {/* Mensaje en Cabinet Grotesk #9CA3AF */}
            <p className="font-sans text-[#9CA3AF] text-sm leading-relaxed mb-6 font-medium px-2">
              Debes ser anfitrión o tener un evento creado para poder usar el escaner.
            </p>

            {/* Botones de Acción */}
            <div className="flex flex-col space-y-2.5">
              <button
                onClick={onCreateEvent}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display text-base font-black tracking-wider uppercase shadow-lg shadow-[#E87A72]/20 active:scale-95 transition-all focus:outline-none cursor-pointer"
              >
                CREAR MI PRIMER EVENTO
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-2xl bg-transparent hover:bg-white/5 text-neutral-400 hover:text-white font-display text-sm font-bold tracking-wider uppercase transition-colors border border-neutral-800 focus:outline-none cursor-pointer"
              >
                CANCELAR
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NoEventsModal;
