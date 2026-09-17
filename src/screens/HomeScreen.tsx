import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TopHud } from '../components/TopHud';
import { FullCardCoverFlow } from '../components/FullCardCoverFlow';
import { ActionFooter } from '../components/ActionFooter';
import { BottomNav } from '../components/BottomNav';
import { NoEventsModal } from '../components/NoEventsModal';
import { EventDetailModal } from '../components/EventDetailModal';
import { SearchEventsModal } from '../components/SearchEventsModal';
import { NotificationsModal } from '../components/NotificationsModal';
import {
  mockUserProfile,
  mockVipFlyers,
} from '../data/mockData';
import { TabType, VipFlyerItem } from '../types/home';
import '../styles/fonts.css';

export interface HomeScreenProps {
  onNavigate?: (route: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<VipFlyerItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(mockUserProfile.unreadNotifications);
  const user = mockUserProfile;

  const handleNavigate = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      console.log(`[Navigation] -> ${route}`);
    }
  };

  const handleApplyVip = (flyerId: string) => {
    handleNavigate(`/vip/${flyerId}`);
  };

  const handleCreateEvent = () => {
    setIsModalOpen(false);
    handleNavigate('/create-event');
  };

  const handleScanQr = () => {
    if (user.activeEventsCount === 0) {
      setIsModalOpen(true);
    } else {
      handleNavigate('/app/door');
    }
  };

  const handleTabSelect = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'passes') {
      handleNavigate('/passes');
    } else if (tab === 'search') {
      setIsSearchOpen(true);
    }
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#000000] flex flex-col justify-between overflow-y-auto overflow-x-hidden font-sans select-none">
      {/* Fondo con textura/patrón geométrico oscuro fondo_iniciob.webp */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-cover bg-center"
        style={{
          backgroundImage: "url('./assets/images/fondo_iniciob.webp')",
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      />

      {/* Degradado superior sutil para HUD */}
      <div className="fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-[#000000] via-[#000000]/70 to-transparent pointer-events-none z-10" />

      {/* Contenedor central móvil estructurado */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-md mx-auto pb-28">
        
        {/* 1. TOP BAR / HUD (Logo +1 en #E87A72, Notificaciones y Avatar) */}
        <TopHud
          user={{ ...user, unreadNotifications: unreadCount }}
          onNotificationsClick={() => {
            setIsNotificationsOpen(true);
            setUnreadCount(0);
          }}
          onProfileClick={() => handleNavigate('/profile')}
        />

        {/* 2. SALUDO PRINCIPAL: HEY, CHRISTIAN */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
          className="px-6 pt-1 pb-1"
        >
          <h1 className="font-display text-white text-[38px] sm:text-[42px] font-black tracking-tight leading-none uppercase">
            HEY, CHRISTIAN
          </h1>
        </motion.div>

        {/* 3. ENCABEZADO INDEPENDIENTE: PROXIMOS EVENTOS (FUERA DE LA TARJETA) */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: 0.15 }}
          className="px-6 pt-1 pb-1 mt-2"
        >
          <h2 className="font-sans text-neutral-400 text-sm sm:text-base font-semibold tracking-wider uppercase m-0 leading-none">
            PROXIMOS EVENTOS
          </h2>
        </motion.div>

        {/* 4. CARRUSEL COVER FLOW DE TARJETAS COMPLETAS (CENTRADO CON ZOOM-IN SUAVE) */}
        <motion.main
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="flex-1 flex flex-col items-center justify-center my-auto py-1"
        >
          <FullCardCoverFlow
            flyers={mockVipFlyers}
            onApplyVipClick={handleApplyVip}
            onSelectEvent={(event) => {
              setSelectedEvent(event);
              setIsDetailModalOpen(true);
            }}
          />
        </motion.main>

        {/* 5. BARRA DE ACCIÓN FLOTANTE: [ + ] CREAR EVENTO + [ ⛶ ESCANEAR QR ] (INMEDIATAMENTE DEBAJO DEL CARRUSEL) */}
        <div className="pt-2 pb-2">
          <ActionFooter
            onCreateEventClick={handleCreateEvent}
            onScanQrClick={handleScanQr}
          />
        </div>

      </div>

      {/* 6. BOTTOM NAVIGATION BAR FIJA AL FONDO */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto w-full">
        <BottomNav activeTab={activeTab} onTabSelect={handleTabSelect} />
      </div>

      {/* MODAL BRUTALISTA DE CONSOLA DE PUERTA */}
      <NoEventsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateEvent={handleCreateEvent}
      />

      {/* MODAL DE DETALLE DEL EVENTO PÚBLICO */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onApplyVip={handleApplyVip}
      />

      {/* MODAL DE BÚSQUEDA Y DESCUBRIMIENTO DE EVENTOS */}
      <SearchEventsModal
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false);
          setActiveTab('home');
        }}
        events={mockVipFlyers}
        onSelectEvent={(event) => {
          setSelectedEvent(event);
          setIsDetailModalOpen(true);
        }}
      />

      {/* MODAL DE NOTIFICACIONES DESLIZABLE */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onViewPass={(passId) => handleNavigate(`/pass/${passId}`)}
      />
    </div>
  );
};

export default HomeScreen;
