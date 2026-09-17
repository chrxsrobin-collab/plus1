import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TopHud } from '../components/TopHud';
import { PassCard } from '../components/PassCard';
import { VipFlyerCard } from '../components/VipFlyerCard';
import { ActionFooter } from '../components/ActionFooter';
import { BottomNav } from '../components/BottomNav';
import { NoEventsModal } from '../components/NoEventsModal';
import { MarqueeTicker } from '../components/MarqueeTicker';
import { CoverFlowCarousel } from '../components/CoverFlowCarousel';
import {
  mockUserProfile,
  mockUpcomingPasses,
  mockVipFlyers,
} from '../data/mockData';
import { TabType } from '../types/home';
import '../styles/fonts.css';

export interface HomeScreenProps {
  onNavigate?: (route: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const user = mockUserProfile;

  // Manejo de navegación
  const handleNavigate = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      console.log(`[Navigation] -> ${route}`);
      // Fallback para entornos con window.location o react-router
      if (typeof window !== 'undefined' && window.location) {
        // En SPA o router se puede sincronizar
      }
    }
  };

  // Botón "VER MI ENTRADA QR"
  const handleViewQr = (passId: string) => {
    handleNavigate(`/pass/${passId}`);
  };

  // Botón "SOLICITAR VIP"
  const handleApplyVip = (flyerId: string) => {
    handleNavigate(`/vip/${flyerId}`);
  };

  // Botón "CREAR EVENTO"
  const handleCreateEvent = () => {
    setIsModalOpen(false);
    handleNavigate('/create-event');
  };

  // Botón "ESCANEAR QR" (Valida si tiene eventos creados)
  const handleScanQr = () => {
    if (user.activeEventsCount === 0) {
      setIsModalOpen(true);
    } else {
      handleNavigate('/app/door');
    }
  };

  // Pestañas inferiores
  const handleTabSelect = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'passes') {
      handleNavigate('/passes');
    } else if (tab === 'search') {
      handleNavigate('/explore');
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-black flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* Fondo con textura/patrón geométrico */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-90 bg-cover bg-bottom"
        style={{
          backgroundImage: "url(./assets/images/fondo_inicio.webp)",
          backgroundPosition: 'bottom center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      />

      {/* Degradado superior para contraste con HUD */}
      <div className="fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none z-10" />

      {/* Contenedor central móvil estructurado */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-md mx-auto">
        {/* 1. TOP BAR / HUD */}
        <TopHud
          user={user}
          onNotificationsClick={() => handleNavigate('/notifications')}
          onProfileClick={() => handleNavigate('/profile')}
        />

        {/* CONTENIDO PRINCIPAL CON SCROLL VERTICAL SUAVE */}
        <main className="flex-1 flex flex-col pt-1 pb-4 overflow-y-auto no-scrollbar">
          {/* 2. BARRA "PRÓXIMOS PASES" CON EXPANSIÓN HORIZONTAL */}
          <section className="w-full mt-2 mb-3">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.35, ease: 'easeInOut', delay: 0.1 }}
              style={{ transformOrigin: 'left' }}
              className="w-full bg-[#12c061] py-1 px-4 flex items-center shadow-sm"
            >
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.25 }}
                className="font-display text-black text-xl font-black tracking-wider uppercase m-0 leading-none"
              >
                PRÓXIMOS PASES
              </motion.h2>
            </motion.div>

            {/* 3. CARRUSEL DE PASES ("TU PRÓXIMO PASE") - Borde a borde (edge-to-edge) */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
              className="w-full mt-3"
            >
              <div className="flex space-x-3 overflow-x-auto snap-x snap-mandatory no-scrollbar px-3 py-2">
                {mockUpcomingPasses.map((pass) => (
                  <div key={pass.id} className="w-[calc(100vw-24px)] max-w-[390px] flex-shrink-0 snap-center">
                    <PassCard pass={pass} onViewQrClick={handleViewQr} />
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* 4. LETRERO MARQUEE TICKER EN LOOP CONTINUO */}
          <section className="w-full mt-3 mb-2">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.35, ease: 'easeInOut', delay: 0.25 }}
              style={{ transformOrigin: 'right' }}
              className="w-full"
            >
              <MarqueeTicker text="VIP & EVENTOS · " speed={48} />
            </motion.div>

            {/* 5. CARRUSEL 3D COVER FLOW (ITUNES STYLE) */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
              className="w-full"
            >
              <CoverFlowCarousel
                flyers={mockVipFlyers}
                onApplyVipClick={handleApplyVip}
              />
            </motion.div>
          </section>
        </main>

        {/* 6. CONTENEDOR INFERIOR DE ACCIONES (CREAR EVENTO + ESCANEAR QR) */}
        <ActionFooter
          onCreateEventClick={handleCreateEvent}
          onScanQrClick={handleScanQr}
        />
      </div>

      {/* 7. BOTTOM NAVIGATION BAR FIJA */}
      <div className="sticky bottom-0 left-0 right-0 z-30 max-w-md mx-auto w-full">
        <BottomNav activeTab={activeTab} onTabSelect={handleTabSelect} />
      </div>

      {/* MODAL BRUTALISTA DE CONSOLA DE PUERTA */}
      <NoEventsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateEvent={handleCreateEvent}
      />
    </div>
  );
};

export default HomeScreen;
