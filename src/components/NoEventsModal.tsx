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
          {/* Backdrop con desenfoque suave y fondo oscuro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Tarjeta Modal Brutalista */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-[#101114] border-2 border-[#fe97de] rounded-2xl p-6 shadow-2xl z-10"
          >
            {/* Cabecera / Alerta */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#fe97de]/20 border border-[#fe97de] flex items-center justify-center text-xl">
                ⚠️
              </div>
              <h3 className="font-display text-white text-xl font-black uppercase tracking-tight">
                CONSOLA DE PUERTA
              </h3>
            </div>

            {/* Mensaje de aviso */}
            <p className="font-sans text-neutral-300 text-sm leading-relaxed mb-6 font-medium">
              <strong className="text-[#fe97de] font-bold block mb-1 font-display tracking-wide text-base">
                NO TIENES EVENTOS ACTIVOS.
              </strong>
              Crea tu primer evento para poder escanear pases y credenciales en la puerta.
            </p>

            {/* Botones de Acción */}
            <div className="flex flex-col space-y-2.5">
              <button
                onClick={onCreateEvent}
                className="w-full py-3 px-4 rounded-xl bg-[#fe97de] hover:bg-[#ff80d7] text-black font-display text-base font-black tracking-wider uppercase transition-colors focus:outline-none"
              >
                CREAR EVENTO
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1c1f26] hover:bg-[#252a34] text-neutral-300 font-display text-sm font-bold tracking-wider uppercase transition-colors border border-neutral-700 focus:outline-none"
              >
                CERRAR
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
