import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopHud } from '../components/TopHud';
import { FullCardCoverFlow } from '../components/FullCardCoverFlow';
import { ActionFooter } from '../components/ActionFooter';
import { BottomNav } from '../components/BottomNav';
import { NoEventsModal } from '../components/NoEventsModal';
import { SelectEventToScanSheet, HostScanEventItem } from '../components/SelectEventToScanSheet';
import { EventDetailModal } from '../components/EventDetailModal';
import { SearchEventsModal } from '../components/SearchEventsModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { db, auth } from '../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDocs,
  getDoc,
  addDoc,
  collectionGroup,
} from 'firebase/firestore';
import { mockUserProfile, mockNotifications } from '../data/mockData';
import { TabType, VipFlyerItem, NotificationItem, AppNotification, ConfirmedAttendee, EventSocialProof } from '../types/home';
import { computeEventEndTimestamp } from '../lib/dateUtils';
import '../styles/fonts.css';

export const formatCardDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parts[0].slice(-2);
    return `${parts[2]}.${parts[1]}.${year}`;
  }
  return dateStr;
};

// Mapeo seguro de documentos de Firestore a la interfaz VipFlyerItem
const mapDocToVipFlyer = (id: string, data: any): VipFlyerItem => ({
  id,
  hostUserId: data.hostUserId || '',
  hostName: data.hostName || (data.hostUserId ? 'ANFITRIÓN' : 'COMUNIDAD +1'),
  hostPhotoUrl: data.hostPhotoUrl || data.hostAvatar || undefined,
  typeBadge: data.type === 'public' ? 'EVENTO PÚBLICO' : 'FIESTA PRIVADA',
  title: data.title || 'SIN TÍTULO',
  subtitle: data.allowsPlusOne ? 'Pase +1 Habilitado' : 'Acceso Individual',
  dateDisplay: data.date ? formatCardDate(data.date.toString()) : 'PRÓXIMAMENTE',
  date: data.date || '',
  timeRange: `${data.startTime || '22:00'} — ${data.endTime || '04:00'}`,
  startTime: data.startTime || '',
  endTime: data.endTime || '',
  location: data.location || 'Por definir',
  availabilityText: `CUPO MÁX. ${data.maxCapacity || 150} ·`,
  theme: data.theme || 'custom',
  exactAddress: data.location || '',
  imageUrl: data.imageUrl || data.artImage || undefined,
  description: `Organizado por ${data.hostName || 'Comunidad +1'}. Acceso en puerta con código QR.`,
  isVipOrFree: true,
  tags: data.tags || [],
  endTimestamp: data.endTimestamp || computeEventEndTimestamp(data.date, data.endTime, data.startTime),
});

export interface HomeScreenProps {
  onNavigate?: (route: string) => void;
  user?: UserProfile;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, user: propUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSelectEventSheetOpen, setIsSelectEventSheetOpen] = useState<boolean>(false);
  const [hostEventsToScan, setHostEventsToScan] = useState<HostScanEventItem[]>([]);
  const [isCheckingScannerEvents, setIsCheckingScannerEvents] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<VipFlyerItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(mockUserProfile.unreadNotifications);
  
  // Estado reactivo de eventos públicos desde Firestore (arranca vacío [])
  const [events, setEvents] = useState<VipFlyerItem[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState<boolean>(true);

  // Escucha reactiva en tiempo real de eventos públicos con filtrado automático de expirados
  useEffect(() => {
    const q = query(collection(db, 'events'), where('type', '==', 'public'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const activeEvents = snapshot.docs
          .map((d) => mapDocToVipFlyer(d.id, d.data()))
          .filter((event) => {
            const eventEnd = event.endTimestamp || computeEventEndTimestamp(event.date, event.endTime, event.startTime);
            return eventEnd > now; // Solo eventos activos (futuros o en curso)
          });
        setEvents(activeEvents);
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

  // Estado reactivo del perfil del usuario conectado (por cada dispositivo)
  const [userProfile, setUserProfile] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data() as { name?: string });
      }
    });
    return () => unsubscribe();
  }, [auth.currentUser]);

  // Escucha reactiva en tiempo real de los pases del usuario (activos y pendientes)
  const [userPasses, setUserPasses] = useState<Record<string, string>>({});
  const [activeApprovedPasses, setActiveApprovedPasses] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'passes'),
      where('userId', '==', auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const passMap: Record<string, string> = {};
        const activeList: any[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (data.eventId) {
            passMap[data.eventId] = data.status || 'pending';
          }
          if (data.status === 'active' || data.status === 'confirmed') {
            activeList.push({ id: d.id, ...data });
          }
        });
        setUserPasses(passMap);
        setActiveApprovedPasses(activeList);
      },
      (error) => {
        console.warn('Error escuchando pases en HomeScreen:', error);
      }
    );
    return () => unsubscribe();
  }, [auth.currentUser]);

  // Escucha reactiva en tiempo real de notificaciones dedicadas del usuario
  const [realtimeNotifications, setRealtimeNotifications] = useState<AppNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  // Escucha reactiva en tiempo real de todos los pases para prueba social (asistentes, aforo restante, FOMO)
  const [socialProofMap, setSocialProofMap] = useState<Record<string, EventSocialProof>>({});

  useEffect(() => {
    const q = collection(db, 'passes');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const proofMap: Record<string, EventSocialProof> = {};
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        // Agrupar pases por eventId
        const passesByEvent: Record<string, any[]> = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.eventId) {
            if (!passesByEvent[data.eventId]) passesByEvent[data.eventId] = [];
            passesByEvent[data.eventId].push({ id: doc.id, ...data });
          }
        });

        // Procesar para cada evento registrado en passes
        Object.keys(passesByEvent).forEach((evtId) => {
          const eventPasses = passesByEvent[evtId];
          const activePasses = eventPasses.filter(
            (p) => p.status === 'active' || p.status === 'confirmed' || p.status === 'used'
          );

          const confirmedUsers: ConfirmedAttendee[] = activePasses
            .sort((a, b) => (b.approvedAt || b.createdAt || 0) - (a.approvedAt || a.createdAt || 0))
            .slice(0, 4)
            .map((p) => ({
              name: (p.userName || p.holderName || 'Asistente').replace(/\s*·\s*(\+1|INDIVIDUAL).*$/i, '').trim(),
              photoUrl: p.userAvatar || p.userPhotoUrl || p.photoURL || undefined,
            }));

          const recentRequests = eventPasses.filter(
            (p) => (p.createdAt || 0) > oneDayAgo || (p.requestedAt || 0) > oneDayAgo
          ).length;

          const targetEvt = events.find((e) => e.id === evtId);
          const guestLimit = targetEvt?.guestLimit || targetEvt?.maxCapacity || 100;
          const activePassesCount = activePasses.length;
          const remainingSpots = Math.max(0, guestLimit - activePassesCount);

          proofMap[evtId] = {
            activePassesCount,
            confirmedUsers,
            remainingSpots,
            recentRequestsCount: recentRequests > 0 ? recentRequests : (activePassesCount > 0 ? activePassesCount + 3 : 12),
          };
        });

        setSocialProofMap(proofMap);
      },
      (error) => {
        console.warn('Error escuchando pases globales para prueba social:', error);
      }
    );

    return () => unsubscribe();
  }, [events]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AppNotification[];
        // Ordenar más recientes primero
        notifs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRealtimeNotifications(notifs);
        const unread = notifs.filter((n) => !n.read).length;
        setUnreadNotifCount(unread);
        setUnreadCount(unread);
      },
      (error) => {
        console.warn('Error escuchando notifications en HomeScreen:', error);
      }
    );
    return () => unsubscribe();
  }, [auth.currentUser]);

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

  // Combinar eventos con su prueba social y aforo restante en tiempo real
  const eventsWithSocialProof: VipFlyerItem[] = events.map((event) => {
    const proof = socialProofMap[event.id];
    const guestLimit = event.guestLimit || event.maxCapacity || 100;
    if (proof) {
      return {
        ...event,
        ...proof,
      };
    }
    return {
      ...event,
      activePassesCount: 0,
      confirmedUsers: [],
      remainingSpots: guestLimit,
      recentRequestsCount: 12,
    };
  });

  const handleApplyVip = (flyerId: string) => {
    const targetEvt = eventsWithSocialProof.find((e) => e.id === flyerId);
    if (targetEvt) {
      setSelectedEvent(targetEvt);
      setIsDetailModalOpen(true);
    } else {
      handleNavigate(`/vip/${flyerId}`);
    }
  };

  const handleRequestVipDirect = async (flyer: VipFlyerItem) => {
    if (!auth.currentUser) {
      showToast('Inicia sesión para solicitar tu pase VIP');
      return;
    }

    // Actualización reactiva optimista local
    setUserPasses((prev) => ({ ...prev, [flyer.id]: 'pending' }));
    showToast('⏳ Solicitud VIP enviada al anfitrión');

    try {
      const cleanTitle = (flyer.title || 'Evento +1').replace(/^FLYER.*?:\s*/i, '').trim();
      const passDocRef = await addDoc(collection(db, 'passes'), {
        eventId: flyer.id,
        eventTitle: cleanTitle,
        eventDate: flyer.dateDisplay || flyer.date || '',
        eventTime: flyer.timeRange ? flyer.timeRange.split('—')[0].trim() : (flyer.startTime || flyer.time || '22:00'),
        eventLocation: flyer.location || flyer.exactAddress || '',
        eventImageUrl: flyer.imageUrl || '',
        hostUserId: flyer.hostUserId || '',
        userId: auth.currentUser.uid,
        holderName: auth.currentUser.displayName || (auth.currentUser.isAnonymous ? "Invitado #" + auth.currentUser.uid.slice(-4).toUpperCase() : 'Invitado'),
        userName: auth.currentUser.displayName || (auth.currentUser.isAnonymous ? "Invitado #" + auth.currentUser.uid.slice(-4).toUpperCase() : 'Invitado'),
        userPhotoUrl: auth.currentUser.photoURL || '',
        userAvatar: auth.currentUser.photoURL || '',
        accessTier: 'VIP',
        status: 'pending',
        createdAt: Date.now(),
      });

      // DISPARADOR A: Notificación reactiva para el ANFITRIÓN
      if (flyer.hostUserId && flyer.hostUserId !== auth.currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: flyer.hostUserId,
          type: 'VIP_REQUEST',
          title: 'NUEVA SOLICITUD VIP ⚡',
          message: `${auth.currentUser.displayName || (auth.currentUser.isAnonymous ? 'Invitado #' + auth.currentUser.uid.slice(-4).toUpperCase() : 'Un usuario')} ha solicitado pase VIP para ${cleanTitle}.`,
          eventId: flyer.id,
          eventTitle: cleanTitle,
          eventImageUrl: flyer.imageUrl || '',
          passId: passDocRef.id,
          senderName: auth.currentUser.displayName || (auth.currentUser.isAnonymous ? 'Invitado #' + auth.currentUser.uid.slice(-4).toUpperCase() : 'Invitado'),
          senderId: auth.currentUser.uid,
          senderPhotoUrl: auth.currentUser.photoURL || '',
          read: false,
          createdAt: Date.now(),
        });
      }
    } catch (err) {
      console.error('Error enviando solicitud VIP directa:', err);
      showToast('Error al enviar la solicitud');
      setUserPasses((prev) => {
        const copy = { ...prev };
        delete copy[flyer.id];
        return copy;
      });
    }
  };

  const handleCreateEvent = () => {
    setIsModalOpen(false);
    handleNavigate('/create-event');
  };

  const handleScanQr = async () => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      // Usuario no autenticado -> No abrir cámara ni pedir permisos
      setIsModalOpen(true);
      return;
    }

    try {
      setIsCheckingScannerEvents(true);

      // 1. Eventos donde es anfitrión
      const q = query(collection(db, 'events'), where('hostUserId', '==', currentUserId));
      const snapshot = await getDocs(q);
      const hostEvents = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as HostScanEventItem[];

      // 2. Eventos donde tiene rol DOOR como Staff de Puerta
      let staffEvents: HostScanEventItem[] = [];
      try {
        const staffQuery = query(
          collectionGroup(db, 'staff'),
          where('userId', '==', currentUserId),
          where('role', '==', 'DOOR')
        );
        const staffSnapshot = await getDocs(staffQuery);
        for (const staffDoc of staffSnapshot.docs) {
          const evRef = staffDoc.ref.parent.parent;
          if (evRef) {
            const evSnap = await getDoc(evRef);
            if (evSnap.exists()) {
              staffEvents.push({ id: evSnap.id, ...evSnap.data() } as HostScanEventItem);
            }
          }
        }
      } catch (err) {
        console.warn('Fallback checking staff door pairing:', err);
      }

      // 3. Respaldo local de Staff de Puerta vinculado
      const localDoorEventId = typeof window !== 'undefined' ? localStorage.getItem('plus1_active_door_event') : null;
      if (localDoorEventId && !staffEvents.some((se) => se.id === localDoorEventId)) {
        try {
          const evSnap = await getDoc(doc(db, 'events', localDoorEventId));
          if (evSnap.exists()) {
            staffEvents.push({ id: evSnap.id, ...evSnap.data() } as HostScanEventItem);
          }
        } catch (e) {
          console.warn('Local staff doc check error:', e);
        }
      }

      // Combinar eventos únicos autorizados
      const allAuthorizedEvents = [
        ...hostEvents,
        ...staffEvents.filter((se) => !hostEvents.some((he) => he.id === se.id)),
      ];

      if (allAuthorizedEvents.length === 0) {
        // CASO A: EL USUARIO NO TIENE EVENTOS COMO HOST NI COMO STAFF
        // No intentes abrir la cámara ni pidas permisos de video
        setIsModalOpen(true);
      } else if (allAuthorizedEvents.length === 1) {
        // CASO B: EL USUARIO TIENE EXACTAMENTE 1 EVENTO HABILITADO
        handleNavigate(`/scanner?eventId=${allAuthorizedEvents[0].id}`);
      } else {
        // CASO C: TIENE MÁS DE 1 EVENTO
        setHostEventsToScan(allAuthorizedEvents);
        setIsSelectEventSheetOpen(true);
      }
    } catch (error) {
      console.warn('Error consultando eventos para escanear:', error);
      setIsModalOpen(true);
    } finally {
      setIsCheckingScannerEvents(false);
    }
  };

  const handleSelectEventForScan = (eventId: string) => {
    setIsSelectEventSheetOpen(false);
    handleNavigate(`/scanner?eventId=${eventId}`);
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
      className="w-full min-h-[100dvh] relative bg-[#000000] flex flex-col justify-between overflow-y-auto overflow-x-hidden font-sans select-none bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage: "url('./assets/images/fondo_a.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Degradado superior sutil para HUD */}
      <div className="fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-[#000000] via-[#000000]/70 to-transparent pointer-events-none z-10" />

      {/* Contenedor central móvil estructurado */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-md mx-auto pb-28">
        
        {/* 1. TOP BAR / HUD (Logo +1 en #E87A72, Notificaciones y Avatar) */}
        <TopHud
          user={{ ...user, unreadNotifications: unreadCount }}
          onNotificationsClick={() => {
            setIsNotificationsOpen(true);
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
            HEY, {userProfile?.name || auth.currentUser?.displayName || (auth.currentUser?.isAnonymous ? "INVITADO #" + auth.currentUser.uid.slice(-4).toUpperCase() : (user.name || 'USUARIO'))}
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
          {isEventsLoading ? (
            <div className="w-full max-w-[340px] sm:max-w-[360px] h-[460px] sm:h-[480px] bg-[#16171B]/50 border border-[#26282E] rounded-[28px] p-6 flex flex-col items-center justify-center text-center shadow-xl select-none mx-auto animate-pulse">
              <div className="w-12 h-12 rounded-full border-2 border-[#E87A72] border-t-transparent animate-spin mb-4" />
              <span className="font-display text-neutral-400 text-xs font-bold tracking-widest uppercase">
                CARGANDO EVENTOS...
              </span>
            </div>
          ) : events.length === 0 ? (
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
              flyers={eventsWithSocialProof}
              userPasses={userPasses}
              onRequestVip={handleRequestVipDirect}
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

      {/* MODAL DE ADVERTENCIA: NO TIENES EVENTOS ACTIVOS */}
      <NoEventsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateEvent={handleCreateEvent}
      />

      {/* BOTTOM SHEET DE SELECCIÓN CUANDO HAY MÁS DE 1 EVENTO */}
      <SelectEventToScanSheet
        isOpen={isSelectEventSheetOpen}
        events={hostEventsToScan}
        onClose={() => setIsEventSelectSheetOpen(false)}
        onSelectEvent={handleSelectEventForScan}
      />

      {/* MODAL DE DETALLE DEL EVENTO PÚBLICO */}
      <EventDetailModal
        selectedEvent={selectedEvent}
        event={selectedEvent}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onApplyVip={handleApplyVip}
        onNavigate={handleNavigate}
      />

      {/* MODAL DE BÚSQUEDA Y DESCUBRIMIENTO DE EVENTOS */}
      <AnimatePresence>
        {isSearchOpen && (
          <SearchEventsModal
            isOpen={isSearchOpen}
            onClose={() => {
              setIsSearchOpen(false);
              setActiveTab('home');
            }}
            events={eventsWithSocialProof}
            onSelectEvent={(event) => {
              setSelectedEvent(event);
              setIsDetailModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* MODAL DE NOTIFICACIONES DESLIZABLE */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={auth.currentUser ? realtimeNotifications : (realtimeNotifications.length > 0 ? realtimeNotifications : mockNotifications)}
        onViewPass={() => handleNavigate('/tickets')}
        onNavigate={handleNavigate}
        onMarkAllAsRead={() => {
          setUnreadCount(0);
          setUnreadNotifCount(0);
        }}
      />

      {/* TOAST FLOTANTE DE CONFIRMACIÓN */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#E87A72] text-black font-display text-xs font-black px-4 py-2.5 rounded-xl shadow-2xl tracking-wider uppercase z-50 whitespace-nowrap pointer-events-none"
        >
          {toastMessage}
        </motion.div>
      )}
    </div>
  );
};

export default HomeScreen;
