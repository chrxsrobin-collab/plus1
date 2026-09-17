import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PassItem } from '../types/home';
import { mockWalletTickets } from '../data/mockData';
import { TicketsCoverFlow } from '../components/TicketsCoverFlow';
import { BottomNav } from '../components/BottomNav';
import '../styles/fonts.css';

export interface TicketsScreenProps {
  tickets?: PassItem[];
  initialIndex?: number;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
}

export const TicketsScreen: React.FC<TicketsScreenProps> = ({
  tickets = mockWalletTickets,
  initialIndex = 0,
  onBack,
  onNavigate,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeTicket = tickets[currentIndex] || tickets[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('/');
    } else {
      console.log('[Navigation] -> Back to Home');
    }
  };

  const handleDownloadCopy = () => {
    showToast(`Pase de "${activeTicket.title}" guardado en Fotos ✓`);
  };

  const handleTabSelect = (tab: 'home' | 'passes' | 'search') => {
    if (tab === 'home') {
      handleBack();
    } else if (tab === 'search') {
      if (onNavigate) onNavigate('/explore');
    }
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#000000] text-white flex flex-col justify-between overflow-x-hidden font-sans select-none pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      {/* Fondo abstracto con textura sutil fondo_iniciob.webp */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-cover bg-center"
        style={{
          backgroundImage: "url('./assets/images/fondo_iniciob.webp')",
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      />

      {/* Degradado superior para HUD */}
      <div className="fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-[#000000] via-[#000000]/70 to-transparent pointer-events-none z-10" />

      {/* Contenedor central móvil acotado */}
      <div className="relative z-20 flex-1 flex flex-col w-full max-w-md mx-auto px-4 justify-between">
        {/* 1. TOP BAR */}
        <header className="flex items-center justify-between pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-1 w-full relative z-30">
          {/* Botón de retroceso (←) */}
          <button
            onClick={handleBack}
            aria-label="Regresar a inicio"
            className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 focus:outline-none"
          >
            <span className="text-xl font-bold leading-none">←</span>
          </button>

          {/* Título central e indicador de cantidad de pases */}
          <div className="flex flex-col items-center justify-center text-center">
            <h1 className="font-display text-white text-xl sm:text-2xl font-black tracking-wide uppercase leading-none">
              MIS TICKETS
            </h1>
            <span className="font-sans text-[11px] text-[#8E8E93] tracking-wider uppercase font-semibold mt-0.5">
              {tickets.length} PASES ACTIVOS
            </span>
          </div>

          {/* Espaciador simétrico */}
          <div className="w-10 h-10" />
        </header>

        {/* 2. CARRUSEL 3D COVER FLOW */}
        <main className="flex-1 flex flex-col items-center justify-center my-auto py-1">
          <TicketsCoverFlow
            tickets={tickets}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            onSelectTicket={(ticket) => {
              showToast(`Ticket seleccionado: ${ticket.title}`);
            }}
          />

          {/* 3. PAGINADOR DE PUNTOS (DOTS) */}
          <div className="flex items-center justify-center space-x-2 pt-2 pb-1 select-none">
            {tickets.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Ver ticket ${i + 1}`}
                className={`transition-all duration-300 rounded-full focus:outline-none ${
                  i === currentIndex
                    ? 'w-6 h-1.5 bg-[#E87A72]'
                    : 'w-1.5 h-1.5 bg-neutral-700 hover:bg-neutral-500'
                }`}
              />
            ))}
          </div>
        </main>

        {/* 4. ACCIÓN INFERIOR: GUARDAR COPIA EN FOTOS */}
        <div className="w-full pt-2 pb-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadCopy}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-display text-base font-black tracking-wider uppercase flex items-center justify-center space-x-2 transition-colors shadow-2xl focus:outline-none"
          >
            <span className="text-lg leading-none">⬇</span>
            <span>GUARDAR COPIA EN FOTOS</span>
          </motion.button>
        </div>
      </div>

      {/* 5. BOTTOM NAVIGATION BAR FIJA (CON TAB TICKETS ACTIVO) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto w-full">
        <BottomNav activeTab="passes" onTabSelect={handleTabSelect} />
      </div>

      {/* TOAST FLOTANTE */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#E87A72] text-black font-display text-xs font-black px-4 py-2.5 rounded-xl shadow-2xl tracking-wider uppercase z-50 whitespace-nowrap"
        >
          {toastMessage}
        </motion.div>
      )}
    </div>
  );
};

export default TicketsScreen;
