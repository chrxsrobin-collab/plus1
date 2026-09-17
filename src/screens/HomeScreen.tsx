import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TopHud } from '../components/TopHud';
import { FullCardCoverFlow } from '../components/FullCardCoverFlow';
import { ActionFooter } from '../components/ActionFooter';
import { BottomNav } from '../components/BottomNav';
import { NoEventsModal } from '../components/NoEventsModal';
import { EventDetailModal } from '../components/EventDetailModal';
import { SearchEventsModal } from '../components/SearchEventsModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { mockUserProfile } from '../data/mockData';
import { TabType, VipFlyerItem } from '../types/home';
import '../styles/fonts.css';

// Mapeo seguro de documentos de Firestore a la interfaz VipFlyerItem
const mapDocToVipFlyer = (id: string, data: any): VipFlyerItem => ({
  id,
  typeBadge: data.type === 'public' ? 'EVENTO PÚBLICO' : 'FIESTA PRIVADA',
  title: data.title || 'SIN TÍTULO',
  subtitle: data.allowsPlusOne ? 'Pase +1 Habilitado' : 'Acceso Individual',
  dateDisplay: data.date ? data.date.toString().toUpperCase() : 'PRÓXIMAMENTE',
  timeRange: `${data.startTime || '22:00'} — ${data.endTime || '04:00'}`,
  location: data.location || 'Por definir',
  availabilityText: `CUPO MÁX. ${data.maxCapacity || 150} ·`,
  theme: data.theme || 'custom',
  exactAddress: data.location || '',
  imageUrl: data.artImage || './assets/images/fondo_a.webp',
  description: `Organizado por ${data.hostName || 'Comunidad +1'}. Acceso en puerta con código QR.`,
  isVipOrFree: true,
});

export interface HomeScreenProps {
  onNavigate?: (route: string) => void;
  user?: UserProfile;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, user: propUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<VipFlyerItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(mockUserProfile.unreadNotifications);
  
  // Estado reactivo de eventos públicos desde Firestore (arranca vacío [])
  const [events, setEvents] = useState<VipFlyerItem[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState<boolean>(true);

  // Escucha reactiva en tiempo real de eventos públicos
  useEffect(() => {
    const q = query(collection(db, 'events'), where('type', '==', 'public'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveEvents = snapshot.docs.map((d) => mapDocToVipFlyer(d.id, d.data()));
        setEvents(liveEvents);
        setIsEventsLoading(false);
      },
      (error) => {
        console.warn('Error escuchando eventos públicos de Firestore:', error);
        setEvents([]);
        setIsEventsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Estado para la barra flotante dinámica (inicialmente oculta)
  const [isNavVisible, setIsNavVisible] = useState<boolean>(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollYRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  
  const user = propUser || mockUserProfile;

  // Temporizador para auto-ocultar la barra tras 4 segundos de inactividad
  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setIsNavVisible(false);
    }, 4000);
  }, []);

  const showNav = useCallback(() => {
    setIsNavVisible(true);
    resetHideTimer();
  }, [resetHideTimer]);

  const hideNav = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    setIsNavVisible(false);
  }, []);

  // Limpiar temporizador al desmontar
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // Manejadores de interacción por scroll, wheel y touch
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentY = e.currentTarget.scrollTop;
    const diff = currentY - lastScrollYRef.current;

    if (diff > 4) {
      // Scroll hacia abajo (usuario explora contenido) -> mostrar barra
      showNav();
    } else if (diff < -15) {
      // Scroll opuesto prolongado -> ocultar barra
      hideNav();
    } else if (isNavVisible) {
      resetHideTimer();
    }
    lastScrollYRef.current = currentY;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const currentY = e.touches[0].clientY;
    const diff = touchStartYRef.current - currentY; // positivo = arrastre hacia arriba

    if (diff > 8) {
      showNav();
    } else if (diff < -18) {
      hideNav();
    } else if (isNavVisible) {
      resetHideTimer();
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY > 4) {
      showNav();
    } else if (e.deltaY < -15) {
      hideNav();
    } else if (isNavVisible) {
      resetHideTimer();
    }
  };

  const handleCanvasClick = () => {
    // Tap en cualquier zona neutra del canvas / pantalla
    showNav();
  };

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
    handleNavigate('/scanner');
  };

  const handleTabSelect = (tab: TabType) => {
    setActiveTab(tab);
    resetHideTimer();
    if (tab === 'passes') {
      handleNavigate('/passes');
    } else if (tab === 'search') {
      setIsSearchOpen(true);
    }
  };

  return (
    <div
      onClick={handleCanvasClick}
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onWheel={handleWheel}
      className="w-full min-h-[100dvh] relative bg-[#000000] flex flex-col justify-between overflow-y-auto overflow-x-hidden font-sans select-none"
    >
      {/* Fondo con textura/patrón fondo_a.webp */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-cover bg-center"
        style={{
          backgroundImage: "url('./assets/images/fondo_a.webp')",
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

        {/* 2. SALUDO PRINCIPAL: HEY, [NOMBRE DE USUARIO] */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
          className="px-6 pt-1 pb-1"
        >
          <h1 className="font-display text-white text-[38px] sm:text-[42px] font-black tracking-tight leading-none uppercase">
            HEY, {user.name || 'CHRIS G.'}
          </h1>
        </motion.div>

        {/* 3. ENCABEZADO INDEPENDIENTE: EVENTOS PARA TI (FUERA DE LA TARJETA) */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: 0.15 }}
          className="px-6 pt-1 pb-1 mt-2"
        >
          <h2 className="font-sans text-[#9CA3AF] text-sm sm:text-base font-semibold tracking-wider uppercase m-0 leading-none">
            EVENTOS PARA TI
          </h2>
        </motion.div>

        {/* 4. CARRUSEL COVER FLOW DE TARJETAS COMPLETAS O ESTADO VACÍO */}
        <motion.main
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="flex-1 flex flex-col items-center justify-center my-auto py-1"
        >
          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-[340px] sm:max-w-[360px] h-[460px] sm:h-[480px] bg-[#16171B] border border-[#26282E] rounded-[28px] p-6 flex flex-col items-center justify-center text-center shadow-xl select-none mx-auto"
            >
              <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl mb-4">
                🎪
              </div>
              <p className="font-sans text-neutral-300 text-sm sm:text-base font-medium tracking-wide uppercase leading-relaxed max-w-[260px]">
                NO HAY EVENTOS PÚBLICOS ACTIVOS · SÉ EL PRIMERO EN CREAR UNO
              </p>
              <button
                onClick={handleCreateEvent}
                className="mt-6 py-3 px-6 rounded-2xl bg-[#12C061] hover:bg-[#10a855] text-black font-display font-black text-sm tracking-wider uppercase transition-transform active:scale-95 shadow-lg shadow-[#12C061]/25 cursor-pointer"
              >
                [ + ] CREAR EVENTO
              </button>
            </motion.div>
          ) : (
            <FullCardCoverFlow
              flyers={events}
              onApplyVipClick={handleApplyVip}
              onSelectEvent={(event) => {
                setSelectedEvent(event);
                setIsDetailModalOpen(true);
              }}
            />
          )}
        </motion.main>

        {/* 5. BARRA DE ACCIÓN FLOTANTE: [ + ] CREAR EVENTO + [ ⛶ ESCANEAR QR ] (INMEDIATAMENTE DEBAJO DEL CARRUSEL) */}
        <div className="pt-2 pb-2">
          <ActionFooter
            onCreateEventClick={handleCreateEvent}
            onScanQrClick={handleScanQr}
          />
        </div>

      </div>

      {/* 6. BOTTOM NAVIGATION BAR FLOTANTE DINÁMICA (Auto-Hiding Floating Capsule) */}
      <BottomNav
        activeTab={activeTab}
        onTabSelect={handleTabSelect}
        visible={isNavVisible}
        variant="floating"
      />

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
        events={events}
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
        onNavigate={handleNavigate}
      />
    </div>
  );
};

export default HomeScreen;
