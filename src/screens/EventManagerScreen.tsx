import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { db, auth } from '../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { GuestPassItem } from '../types/home';
import { GENTLE_MESSAGES } from '../data/mockData';
import '../styles/fonts.css';

export interface EventManagerScreenProps {
  eventId: string;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
}

export const EventManagerScreen: React.FC<EventManagerScreenProps> = ({
  eventId,
  onBack,
  onNavigate,
}) => {
  const [eventData, setEventData] = useState<{
    title: string;
    date?: string;
    startTime?: string;
    location?: string;
    maxCapacity: number;
    type?: string;
    hostUserId?: string;
    imageUrl?: string;
    doorSecretToken?: string;
  } | null>(null);

  const [passes, setPasses] = useState<GuestPassItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isRevokingToken, setIsRevokingToken] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // 1. Cargar detalles del evento
  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;

    const fetchEvent = async () => {
      try {
        const snap = await getDoc(doc(db, 'events', eventId));
        if (snap.exists() && isMounted) {
          const d = snap.data();
          let token = d.doorSecretToken;
          if (!token) {
            token = `door_${eventId.slice(-4)}_${Math.random().toString(36).substring(2, 8)}`;
            updateDoc(doc(db, 'events', eventId), { doorSecretToken: token }).catch(console.warn);
          }
          setEventData({
            title: d.title || 'Evento sin título',
            date: d.date || '',
            startTime: d.startTime || '22:00',
            location: d.location || 'Por definir',
            maxCapacity: Number(d.maxCapacity || d.guestLimit || 150),
            type: d.type || 'public',
            hostUserId: d.hostUserId,
            imageUrl: d.imageUrl || d.artImage || d.flyerImage || '',
            doorSecretToken: token,
          });
        }
      } catch (err) {
        console.warn('Error al cargar datos del evento en EventManager:', err);
      }
    };

    fetchEvent();
    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // Revocación y regeneración de llaves de staff de puerta
  const handleRevokeStaffAccess = async () => {
    setIsRevokingToken(true);
    try {
      const newToken = `door_${eventId.slice(-4)}_${Math.random().toString(36).substring(2, 8)}`;
      await updateDoc(doc(db, 'events', eventId), {
        doorSecretToken: newToken,
        doorSecretRevokedAt: Date.now(),
      });
      setEventData((prev) => (prev ? { ...prev, doorSecretToken: newToken } : null));
      showToast('🔑 ACCESOS REVOCADOS · NUEVO CÓDIGO GENERADO');
    } catch (err) {
      console.error('Error al revocar accesos de puerta:', err);
      showToast('Error al revocar accesos en Firestore');
    } finally {
      setIsRevokingToken(false);
    }
  };

  // 2. Escucha reactiva en tiempo real de todos los pases del evento
  useEffect(() => {
    if (!eventId) return;

    const q = query(
      collection(db, 'passes'),
      where('eventId', '==', eventId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const livePasses: GuestPassItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            eventId: data.eventId,
            eventTitle: data.eventTitle,
            eventImageUrl: data.eventImageUrl || '',
            userId: data.userId || 'anon',
            userName: data.userName || 'Invitado',
            userAvatar: data.userAvatar || null,
            withPlusOne: Boolean(data.withPlusOne),
            status: data.status || 'pending',
            requestedAt: data.requestedAt || (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now()),
            approvedAt: data.approvedAt,
            usedAt: data.usedAt,
            updatedAt: data.updatedAt,
          };
        });

        // Ordenar: más recientes primero
        livePasses.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
        setPasses(livePasses);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Error al escuchar pases en EventManager:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  // Métricas calculadas
  const pendingPasses = useMemo(
    () => passes.filter((p) => p.status === 'pending'),
    [passes]
  );
  const activePasses = useMemo(
    () => passes.filter((p) => p.status === 'active'),
    [passes]
  );
  const usedPasses = useMemo(
    () => passes.filter((p) => p.status === 'used'),
    [passes]
  );
  const confirmedTotal = activePasses.length + usedPasses.length;

  // Filtrado de confirmados por búsqueda
  const filteredConfirmedPasses = useMemo(() => {
    const combined = passes.filter((p) => p.status === 'active' || p.status === 'used');
    if (!searchQuery.trim()) return combined;
    const lower = searchQuery.toLowerCase().trim();
    return combined.filter((p) => p.userName.toLowerCase().includes(lower));
  }, [passes, searchQuery]);

  // Aprobación de solicitud VIP
  const handleApprovePass = async (passId: string, userName: string) => {
    setActionLoadingId(passId);
    try {
      await updateDoc(doc(db, 'passes', passId), {
        status: 'active',
        approvedAt: Date.now(),
        updatedAt: Date.now(),
      });

      // DISPARADOR B: Notificación para el ASISTENTE
      const passItem = passes.find((p) => p.id === passId);
      if (passItem && passItem.userId) {
        const currentTitle = eventData?.title || passItem.eventTitle || 'Evento +1';
        let currentImageUrl = eventData?.imageUrl || passItem.eventImageUrl || '';

        if (!currentImageUrl && (passItem.eventId || eventId)) {
          try {
            const evDoc = await getDoc(doc(db, 'events', passItem.eventId || eventId));
            if (evDoc.exists()) {
              const evData = evDoc.data();
              currentImageUrl = evData.imageUrl || evData.artImage || evData.flyerImage || '';
            }
          } catch (e) {
            console.warn('Fallback al consultar flyer de evento:', e);
          }
        }

        await addDoc(collection(db, 'notifications'), {
          userId: passItem.userId,
          type: 'VIP_APPROVED',
          title: currentTitle,
          message: `Tu acceso para ${currentTitle} ya está activo. Toca para ver tu ticket QR en tu billetera.`,
          eventId: passItem.eventId || eventId,
          eventTitle: currentTitle,
          eventImageUrl: currentImageUrl,
          passId: passId,
          senderName: auth.currentUser?.displayName || 'Anfitrión',
          senderId: auth.currentUser?.uid || '',
          read: false,
          createdAt: Date.now(),
        });
      }

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#12C061', '#FFFFFF', '#FAB205'],
        });
      } catch {
        // Ignorar si confetti falla
      }

      showToast(`🟢 SOLICITUD APROBADA: ${userName.toUpperCase()}`);
    } catch (err) {
      console.error('Error al aprobar pase:', err);
      showToast('Error al actualizar pase en Firestore');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Declinación amable por límite de aforo alcanzado
  const handleDeclineRequest = async (passId: string, userName: string) => {
    setActionLoadingId(passId);
    const randomMessage = GENTLE_MESSAGES[Math.floor(Math.random() * GENTLE_MESSAGES.length)];

    try {
      await updateDoc(doc(db, 'passes', passId), {
        status: 'capacity_reached',
        declineReason: randomMessage,
        feedbackMessage: randomMessage,
        updatedAt: Date.now(),
      });

      // DISPARADOR B: Notificación para el ASISTENTE
      const passItem = passes.find((p) => p.id === passId);
      if (passItem && passItem.userId) {
        const currentTitle = eventData?.title || passItem.eventTitle || 'Evento +1';
        let currentImageUrl = eventData?.imageUrl || passItem.eventImageUrl || '';

        if (!currentImageUrl && (passItem.eventId || eventId)) {
          try {
            const evDoc = await getDoc(doc(db, 'events', passItem.eventId || eventId));
            if (evDoc.exists()) {
              const evData = evDoc.data();
              currentImageUrl = evData.imageUrl || evData.artImage || evData.flyerImage || '';
            }
          } catch (e) {
            console.warn('Fallback al consultar flyer de evento:', e);
          }
        }

        await addDoc(collection(db, 'notifications'), {
          userId: passItem.userId,
          type: 'VIP_DECLINED',
          eventId: passItem.eventId || eventId,
          eventTitle: currentTitle,
          eventImageUrl: currentImageUrl,
          title: currentTitle,
          message: randomMessage,
          passId: passId,
          senderName: auth.currentUser?.displayName || 'Anfitrión',
          senderId: auth.currentUser?.uid || '',
          read: false,
          createdAt: Date.now(),
          metadata: {
            declineReason: randomMessage,
          },
        });
      }

      showToast(`AFORO COMPLETADO · COMUNICADO A ${userName.toUpperCase()}`);
    } catch (err) {
      console.error('Error al declinar solicitud por aforo:', err);
      showToast('Error al actualizar pase en Firestore');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Alternar ingreso en puerta (usado / activo)
  const handleToggleUsed = async (pass: GuestPassItem) => {
    setActionLoadingId(pass.id);
    const newStatus = pass.status === 'used' ? 'active' : 'used';
    try {
      await updateDoc(doc(db, 'passes', pass.id), {
        status: newStatus,
        usedAt: newStatus === 'used' ? Date.now() : null,
        checkedInAt: newStatus === 'used' ? Date.now() : null,
        updatedAt: Date.now(),
      });
      showToast(
        newStatus === 'used'
          ? `🟢 INGRESO REGISTRADO: ${pass.userName.toUpperCase()}`
          : `ESTADO REVERTIDO A ESPERANDO: ${pass.userName.toUpperCase()}`
      );
    } catch (err) {
      console.error('Error al registrar ingreso:', err);
      showToast('Error al actualizar estado en puerta');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Simulador rápido para pruebas: Generar solicitud de prueba instantánea
  const handleGenerateTestPass = async () => {
    try {
      const randomNames = ['Sofía V.', 'Mateo R.', 'Camila L.', 'Diego M.', 'Valentina G.'];
      const randomName = randomNames[Math.floor(Math.random() * randomNames.length)] + ` #${Math.floor(100 + Math.random() * 900)}`;
      await addDoc(collection(db, 'passes'), {
        eventId: eventId,
        eventTitle: eventData?.title || 'Evento +1',
        userId: 'test_user_' + Date.now(),
        userName: randomName,
        userAvatar: null,
        withPlusOne: Math.random() > 0.4,
        status: 'pending',
        requestedAt: Date.now(),
        createdAt: serverTimestamp(),
      });
      showToast('✦ Solicitud de prueba generada en vivo');
    } catch (err) {
      console.error('Error al generar solicitud de prueba:', err);
      showToast('Error al conectar con Firestore');
    }
  };

  const formatTimestamp = (ts?: number) => {
    if (!ts) return 'Reciente';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="relative w-full min-h-[100dvh] bg-[#000000] text-white flex flex-col justify-between overflow-x-hidden font-sans select-none pb-[calc(6rem+env(safe-area-inset-bottom,0px))]"
      style={{
        backgroundImage: "url('./assets/images/fondo_b.webp')",
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Degradado superior */}
      <div className="fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-[#000000] via-[#000000]/70 to-transparent pointer-events-none z-10" />

      {/* Contenedor central móvil */}
      <div className="relative z-20 flex-1 flex flex-col w-full max-w-md mx-auto px-4 sm:px-5">
        
        {/* 1. TOP BAR */}
        <header className="flex items-center justify-between pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3 w-full relative z-30">
          <button
            onClick={onBack || (() => onNavigate?.('/profile'))}
            aria-label="Regresar a perfil"
            className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 focus:outline-none cursor-pointer"
          >
            <span className="text-xl font-bold leading-none">←</span>
          </button>

          <div className="text-center flex-1 px-2">
            <span className="text-[10px] font-display font-black tracking-widest text-[#E87A72] uppercase block">
              PANEL DE CONTROL DEL ANFITRIÓN
            </span>
            <h1 className="font-display text-white text-base sm:text-lg font-black tracking-wider uppercase truncate max-w-[220px] sm:max-w-[260px] mx-auto">
              {eventData?.title || 'CARGANDO EVENTO...'}
            </h1>
          </div>

          <button
            onClick={() => onNavigate?.('/scanner')}
            title="Ir a modo escáner en puerta"
            className="w-10 h-10 rounded-full bg-[#12C061]/20 hover:bg-[#12C061]/30 border border-[#12C061]/40 flex items-center justify-center text-[#12C061] transition-all active:scale-90 focus:outline-none cursor-pointer"
          >
            <span className="text-lg">📷</span>
          </button>
        </header>

        {/* 2. TARJETAS MÉTRICAS EN VIVO */}
        <section className="grid grid-cols-3 gap-2 sm:gap-2.5 my-3">
          {/* Tarjeta 1: Confirmados */}
          <div className="bg-[#16171B]/90 border border-[#26282E] rounded-2xl p-2.5 sm:p-3 text-center flex flex-col justify-between shadow-lg">
            <span className="text-[9px] sm:text-[10px] font-display font-black tracking-wider text-neutral-400 uppercase">
              CONFIRMADOS
            </span>
            <div className="my-1">
              <span className="font-display text-xl sm:text-2xl font-black text-[#12C061] leading-none">
                {confirmedTotal}
              </span>
              <span className="font-sans text-[10px] sm:text-xs text-neutral-400 font-semibold block mt-0.5">
                / {eventData?.maxCapacity || 150}
              </span>
            </div>
            <span className="text-[9px] text-neutral-400 font-medium">Cupos ocupados</span>
          </div>

          {/* Tarjeta 2: Pendientes */}
          <div className="bg-[#16171B]/90 border border-[#26282E] rounded-2xl p-2.5 sm:p-3 text-center flex flex-col justify-between shadow-lg relative overflow-hidden">
            {pendingPasses.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FAB205] animate-ping" />
            )}
            <span className="text-[9px] sm:text-[10px] font-display font-black tracking-wider text-neutral-400 uppercase">
              SOLICITUDES
            </span>
            <div className="my-1">
              <span className="font-display text-xl sm:text-2xl font-black text-[#FAB205] leading-none">
                {pendingPasses.length}
              </span>
              <span className="font-sans text-[10px] sm:text-xs text-neutral-400 font-semibold block mt-0.5">
                Pendientes
              </span>
            </div>
            <span className="text-[9px] text-[#FAB205] font-medium">Por aprobar</span>
          </div>

          {/* Tarjeta 3: En Puerta */}
          <div className="bg-[#16171B]/90 border border-[#26282E] rounded-2xl p-2.5 sm:p-3 text-center flex flex-col justify-between shadow-lg">
            <span className="text-[9px] sm:text-[10px] font-display font-black tracking-wider text-neutral-400 uppercase">
              EN PUERTA
            </span>
            <div className="my-1">
              <span className="font-display text-xl sm:text-2xl font-black text-[#E87A72] leading-none">
                {usedPasses.length}
              </span>
              <span className="font-sans text-[10px] sm:text-xs text-neutral-400 font-semibold block mt-0.5">
                Ingresados
              </span>
            </div>
            <span className="text-[9px] text-neutral-400 font-medium">Admitidos</span>
          </div>
        </section>

        {/* BOTÓN VINCULAR STAFF DE PUERTA (QR MAESTRO) */}
        <button
          type="button"
          onClick={() => setIsStaffModalOpen(true)}
          className="w-full py-3 px-4 rounded-2xl bg-[#16171B] hover:bg-[#202227] border border-[#FAB205]/40 hover:border-[#FAB205]/70 text-[#FAB205] font-display text-xs sm:text-sm font-black tracking-wider uppercase flex items-center justify-center space-x-2 transition-all active:scale-98 shadow-md mb-3 cursor-pointer"
        >
          <span className="text-base">🔑</span>
          <span>VINCULAR STAFF DE PUERTA</span>
        </button>

        {/* 3. PESTAÑAS SEGMENTADAS DE GESTIÓN (TABS) */}
        <div className="flex bg-[#16171B] p-1 rounded-2xl border border-[#26282E] mb-3 relative">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2.5 rounded-xl font-display text-xs sm:text-sm font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-[#FAB205] text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>SOLICITUDES VIP</span>
            {pendingPasses.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'pending'
                    ? 'bg-black text-[#FAB205]'
                    : 'bg-[#FAB205] text-black'
                }`}
              >
                {pendingPasses.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('confirmed')}
            className={`flex-1 py-2.5 rounded-xl font-display text-xs sm:text-sm font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'confirmed'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>ASISTENTES</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'confirmed'
                  ? 'bg-black text-white'
                  : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {confirmedTotal}
            </span>
          </button>
        </div>

        {/* 4. CONTENIDO DE LAS PESTAÑAS */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-2.5">
          
          {/* PESTAÑA 1: SOLICITUDES VIP PENDIENTES */}
          {activeTab === 'pending' && (
            <div className="space-y-2.5">
              {isLoading ? (
                <div className="py-12 text-center text-neutral-400 font-sans text-xs">
                  Cargando solicitudes en tiempo real...
                </div>
              ) : pendingPasses.length === 0 ? (
                <div className="py-10 px-4 text-center bg-[#16171B]/80 border border-[#26282E] rounded-3xl space-y-3">
                  <span className="text-4xl block">✨</span>
                  <h3 className="font-display text-white text-base sm:text-lg font-black tracking-wide uppercase">
                    NO HAY SOLICITUDES PENDIENTES
                  </h3>
                  <p className="font-sans text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    Cuando los invitados pulsen "SOLICITAR VIP" en el enlace de tu evento, aparecerán aquí para que los apruebes con un solo toque.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateTestPass}
                    className="mt-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-[#FAB205] border border-[#FAB205]/40 rounded-xl font-display text-xs font-black tracking-wider uppercase transition-all active:scale-95 cursor-pointer"
                  >
                    + SIMULAR SOLICITUD DE PRUEBA
                  </button>
                </div>
              ) : (
                pendingPasses.map((pass) => (
                  <motion.div
                    key={pass.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                  >
                    {/* Info del usuario solicitante */}
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 text-white font-display font-black text-sm">
                        {pass.userAvatar ? (
                          <img
                            src={pass.userAvatar}
                            alt={pass.userName}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          pass.userName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-display text-white text-sm sm:text-base font-black uppercase tracking-wide truncate">
                            {pass.userName}
                          </h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                              pass.withPlusOne
                                ? 'bg-[#FAB205]/20 text-[#FAB205] border border-[#FAB205]/30'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {pass.withPlusOne ? 'Tú + 1' : 'Individual'}
                          </span>
                        </div>
                        <span className="font-sans text-[11px] text-neutral-400 block mt-0.5">
                          Solicitado a las {formatTimestamp(pass.requestedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Botones de acción 1 toque */}
                    <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto">
                      <button
                        type="button"
                        disabled={actionLoadingId === pass.id}
                        onClick={() => handleDeclineRequest(pass.id, pass.userName)}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-400 hover:text-[#E87A72] font-display text-xs font-bold tracking-wider uppercase transition-colors active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        DECLINAR
                      </button>

                      <button
                        type="button"
                        disabled={actionLoadingId === pass.id}
                        onClick={() => handleApprovePass(pass.id, pass.userName)}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#12C061] hover:bg-[#0fa854] text-black font-display text-xs font-black tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        APROBAR
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* PESTAÑA 2: LISTA DE ASISTENTES CONFIRMADOS */}
          {activeTab === 'confirmed' && (
            <div className="space-y-3">
              {/* Buscador rápido por nombre */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre de invitado..."
                  className="w-full h-11 pl-10 pr-4 bg-[#16171B] border border-[#26282E] rounded-xl text-white font-sans text-xs sm:text-sm placeholder-neutral-500 focus:outline-none focus:border-white/50 transition-colors"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                  🔍
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {filteredConfirmedPasses.length === 0 ? (
                <div className="py-10 px-4 text-center bg-[#16171B]/80 border border-[#26282E] rounded-3xl space-y-2">
                  <span className="text-3xl block">🎟️</span>
                  <h3 className="font-display text-white text-sm sm:text-base font-black tracking-wide uppercase">
                    {searchQuery
                      ? 'NO SE ENCONTRARON INVITADOS'
                      : 'NO HAY ASISTENTES CONFIRMADOS AÚN'}
                  </h3>
                  <p className="font-sans text-xs text-neutral-400 max-w-xs mx-auto">
                    {searchQuery
                      ? 'Prueba con otro término de búsqueda.'
                      : 'Los pases aprobados y confirmados aparecerán aquí.'}
                  </p>
                </div>
              ) : (
                filteredConfirmedPasses.map((pass) => (
                  <div
                    key={pass.id}
                    className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 text-white font-display font-black text-sm">
                        {pass.userAvatar ? (
                          <img
                            src={pass.userAvatar}
                            alt={pass.userName}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          pass.userName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-display text-white text-sm sm:text-base font-black uppercase tracking-wide truncate">
                          {pass.userName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="font-sans text-[11px] text-neutral-400">
                            {pass.withPlusOne ? '✦ Con acompañante (+1)' : '• Pase individual'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Estado en Puerta y Acción */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={actionLoadingId === pass.id}
                        onClick={() => handleToggleUsed(pass)}
                        title={pass.status === 'used' ? 'Tocar para desmarcar' : 'Tocar para registrar ingreso'}
                        className={`text-[10px] font-display font-black px-2.5 py-1.5 rounded-xl uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
                          pass.status === 'used'
                            ? 'bg-[#12C061]/20 text-[#12C061] border border-[#12C061]/40 hover:bg-neutral-800'
                            : 'bg-yellow-500/15 text-[#FAB205] border border-[#FAB205]/30 hover:bg-yellow-500/25'
                        }`}
                      >
                        {pass.status === 'used' ? (
                          <>
                            <span>🟢</span>
                            <span>ADMITIDO</span>
                          </>
                        ) : (
                          <>
                            <span>⏳</span>
                            <span>ESPERANDO</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

      </div>

      {/* MODAL QR MAESTRO DE PUERTA (STAFF) */}
      <AnimatePresence>
        {isStaffModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-[#16171B] border border-[#26282E] rounded-3xl p-5 sm:p-6 text-center shadow-2xl relative flex flex-col items-center select-none"
            >
              {/* Botón cerrar */}
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center text-sm font-bold active:scale-90 transition-all cursor-pointer"
              >
                ✕
              </button>

              {/* Badge superior */}
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FAB205]/15 border border-[#FAB205]/40 text-[#FAB205] text-[10px] font-display font-black tracking-widest uppercase mb-3">
                <span>🔑</span>
                <span>ROL DE PUERTA</span>
              </div>

              {/* Título */}
              <h2 className="font-display text-white text-xl sm:text-2xl font-black tracking-wider uppercase mb-1.5 leading-tight">
                ACCESO DE PUERTA (STAFF)
              </h2>

              {/* Subtexto */}
              <p className="font-sans text-xs text-neutral-400 leading-relaxed max-w-xs mb-5">
                Pide a tu guardia o amigo que escanee este código desde su app +1 para habilitar el lector de entradas de este evento.
              </p>

              {/* Contenedor QR Maestro */}
              <div className="relative w-[210px] h-[210px] bg-white rounded-2xl p-3 shadow-2xl flex items-center justify-center mb-4 overflow-hidden border-2 border-white/20">
                <svg className="w-full h-full text-black fill-current" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="#FFFFFF" />
                  <rect x="6" y="6" width="28" height="28" fill="#000000" rx="3" />
                  <rect x="12" y="12" width="16" height="16" fill="#FFFFFF" rx="1.5" />
                  <rect x="16" y="16" width="8" height="8" fill="#000000" rx="1" />
                  <rect x="66" y="6" width="28" height="28" fill="#000000" rx="3" />
                  <rect x="72" y="12" width="16" height="16" fill="#FFFFFF" rx="1.5" />
                  <rect x="76" y="16" width="8" height="8" fill="#000000" rx="1" />
                  <rect x="6" y="66" width="28" height="28" fill="#000000" rx="3" />
                  <rect x="12" y="72" width="16" height="16" fill="#FFFFFF" rx="1.5" />
                  <rect x="16" y="76" width="8" height="8" fill="#000000" rx="1" />
                  <rect x="40" y="8" width="8" height="8" fill="#000000" />
                  <rect x="52" y="8" width="6" height="14" fill="#000000" />
                  <rect x="40" y="24" width="14" height="6" fill="#000000" />
                  <rect x="8" y="40" width="8" height="16" fill="#000000" />
                  <rect x="22" y="40" width="6" height="8" fill="#000000" />
                  <rect x="20" y="52" width="14" height="6" fill="#000000" />
                  <rect x="40" y="40" width="20" height="20" fill="#000000" rx="2" />
                  <rect x="44" y="44" width="12" height="12" fill="#FFFFFF" rx="1" />
                  <rect x="48" y="48" width="4" height="4" fill="#000000" />
                  <rect x="68" y="40" width="12" height="6" fill="#000000" />
                  <rect x="84" y="40" width="8" height="16" fill="#000000" />
                  <rect x="66" y="52" width="10" height="8" fill="#000000" />
                  <rect x="40" y="68" width="6" height="18" fill="#000000" />
                  <rect x="52" y="66" width="10" height="8" fill="#000000" />
                  <rect x="48" y="80" width="14" height="10" fill="#000000" />
                  <rect x="68" y="68" width="10" height="10" fill="#000000" />
                  <rect x="82" y="66" width="10" height="24" fill="#000000" />
                </svg>
                {/* Badge central con icono de llave */}
                <div className="absolute inset-0 m-auto w-10 h-10 rounded-xl bg-black border-2 border-white flex items-center justify-center shadow-lg">
                  <span className="text-base leading-none">🔑</span>
                </div>
              </div>

              {/* Botón copiar payload de vinculación */}
              <button
                type="button"
                onClick={() => {
                  const payload = `plus1://pair-door?eventId=${eventId}&token=${eventData?.doorSecretToken || 'temp_key'}`;
                  navigator.clipboard?.writeText(payload);
                  showToast('📋 ENLACE DE VINCULACIÓN COPIADO');
                }}
                className="text-neutral-400 hover:text-white font-sans text-[11px] font-semibold tracking-wide flex items-center space-x-1.5 mb-5 bg-neutral-900/60 hover:bg-neutral-800/80 px-3 py-1.5 rounded-xl border border-neutral-800 transition-all active:scale-95 cursor-pointer"
              >
                <span>📋</span>
                <span>Copiar enlace de vinculación</span>
              </button>

              {/* Botón Revocar accesos */}
              <button
                type="button"
                disabled={isRevokingToken}
                onClick={handleRevokeStaffAccess}
                className="w-full py-3 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 hover:border-red-500 text-red-400 hover:text-red-300 font-display text-xs sm:text-sm font-black tracking-wider uppercase transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>⚠️</span>
                <span>{isRevokingToken ? 'REVOCANDO...' : 'REVOCAR ACCESOS DE PUERTA'}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST FLOTANTE */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-[#12C061] text-black font-display text-xs font-black px-4 py-2.5 rounded-xl shadow-2xl tracking-wider uppercase z-50 whitespace-nowrap"
        >
          {toastMessage}
        </motion.div>
      )}
    </div>
  );
};

export default EventManagerScreen;
