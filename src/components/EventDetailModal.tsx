import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ConfirmedAttendee } from '../types/home';
import { ShareEventModal } from './ShareEventModal';
import { formatCardDate, formatVipCutoffDisplay } from '../lib/dateUtils';

interface EventDetailModalProps {
  event?: any;
  selectedEvent?: any;
  isOpen: boolean;
  onClose: () => void;
  onApplyVip?: (eventId: string) => void;
  onNavigate?: (route: string) => void;
}

export const getResolvedAccessType = (event: any): 'FREE_PASS' | 'VIP' | 'VIP_PLUS_ONE' | 'PAID' => {
  if (!event) return 'FREE_PASS';
  if (event.isPaid || (event.ticketPrice && Number(event.ticketPrice) >= 20) || String(event.accessType).toUpperCase() === 'PAID') {
    return 'PAID';
  }
  if (event.accessType) {
    const raw = String(event.accessType).toUpperCase();
    if (raw === 'FREE_PASS' || raw === 'FREE') return 'FREE_PASS';
    if (raw === 'VIP_PLUS_ONE' || raw === 'VIP+1') return 'VIP_PLUS_ONE';
    if (raw === 'PAID') return 'PAID';
    if (raw === 'VIP') return 'VIP';
  }
  // Retrocompatibilidad con eventos creados previamente:
  if (event.allowsPlusOne || event.withPlusOne || event.allowPlusOne) {
    return 'VIP_PLUS_ONE';
  }
  if (event.accessTier === 'VIP' || event.isVip) {
    return 'VIP';
  }
  return 'FREE_PASS';
};

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event: propEvent,
  selectedEvent: propSelectedEvent,
  isOpen,
  onClose,
  onApplyVip,
  onNavigate,
}) => {
  const selectedEvent = propSelectedEvent || propEvent;
  const [passStatus, setPassStatus] = useState<'none' | 'pending' | 'active' | 'confirmed' | 'capacity_reached' | 'declined' | 'used'>('none');
  const [userPass, setUserPass] = useState<any | null>(null);
  const [existingPassId, setExistingPassId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Estados reactivos de Prueba Social y FOMO
  const [activePassesCount, setActivePassesCount] = useState<number>(selectedEvent?.activePassesCount || 0);
  const [confirmedUsers, setConfirmedUsers] = useState<ConfirmedAttendee[]>(selectedEvent?.confirmedUsers || []);
  const [recentRequestsCount, setRecentRequestsCount] = useState<number>(selectedEvent?.recentRequestsCount || 12);
  const [remainingSpots, setRemainingSpots] = useState<number>(
    typeof selectedEvent?.remainingSpots === 'number'
      ? selectedEvent.remainingSpots
      : Math.max(0, (selectedEvent?.guestLimit || selectedEvent?.maxCapacity || 100) - (selectedEvent?.activePassesCount || 0))
  );

  const handleShareEvent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedEvent) return;
    setIsShareModalOpen(true);
  };

  const handleOpenHostProfile = (hostUserId?: string) => {
    if (!hostUserId) return;
    onClose();
    onNavigate?.(`/profile/${hostUserId}`);
  };

  // Escucha del estado individual del pase del usuario
  useEffect(() => {
    if (!isOpen || !selectedEvent?.id || !auth.currentUser) {
      setPassStatus('none');
      setExistingPassId(null);
      setUserPass(null);
      return;
    }
    const q = query(
      collection(db, 'passes'),
      where('userId', '==', auth.currentUser.uid),
      where('eventId', '==', selectedEvent.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const pDoc = snap.docs[0];
        const pData = pDoc.data();
        setExistingPassId(pDoc.id);
        setUserPass({ id: pDoc.id, ...pData });
        setPassStatus((pData.status as any) || 'pending');
      } else {
        setExistingPassId(null);
        setUserPass(null);
        setPassStatus('none');
      }
    }, () => {});
    return () => unsub();
  }, [isOpen, selectedEvent?.id]);

  // Escucha reactiva en tiempo real de todos los pases del evento para Prueba Social
  useEffect(() => {
    if (!isOpen || !selectedEvent?.id) return;
    const q = query(
      collection(db, 'passes'),
      where('eventId', '==', selectedEvent.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const allEvtPasses = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const active = allEvtPasses.filter((p: any) =>
        p.status === 'active' || p.status === 'confirmed' || p.status === 'used'
      );

      const guestLimit = selectedEvent.guestLimit || selectedEvent.maxCapacity || 100;
      const actCount = active.length;
      setActivePassesCount(actCount);

      const users: ConfirmedAttendee[] = active
        .sort((a: any, b: any) => (b.approvedAt || b.createdAt || 0) - (a.approvedAt || a.createdAt || 0))
        .slice(0, 4)
        .map((p: any) => ({
          name: (p.userName || p.holderName || 'Asistente').replace(/\s*·\s*(\+1|INDIVIDUAL).*$/i, '').trim(),
          photoUrl: p.userAvatar || p.userPhotoUrl || p.photoURL || undefined,
        }));
      setConfirmedUsers(users);

      const rem = Math.max(0, guestLimit - actCount);
      setRemainingSpots(rem);

      const recent = allEvtPasses.filter(
        (p: any) => (p.createdAt || 0) > oneDayAgo || (p.requestedAt || 0) > oneDayAgo
      ).length;
      setRecentRequestsCount(recent > 0 ? recent : (actCount > 0 ? actCount + 3 : 12));
    }, () => {});
    return () => unsub();
  }, [isOpen, selectedEvent?.id, selectedEvent?.guestLimit, selectedEvent?.maxCapacity]);

  if (!selectedEvent) return null;
  const event = selectedEvent;

  const resolvedAccessType = getResolvedAccessType(selectedEvent);

  const handleActionClick = () => {
    // CASO A: TIENE PASE APROBADO
    const isApproved =
      userPass?.status === 'active' ||
      userPass?.status === 'confirmed' ||
      userPass?.status === 'approved' ||
      userPass?.status === 'accepted' ||
      passStatus === 'active' ||
      passStatus === 'confirmed';

    if (isApproved) {
      onClose();
      if (onNavigate) onNavigate('/tickets');
      return;
    }

    // CASO B: SOLICITUD EN ESPERA
    if (userPass?.status === 'pending' || passStatus === 'pending') {
      return;
    }

    // CASO C: SIN SOLICITUD O PREVIAMENTE DECLINADO
    if (resolvedAccessType === 'PAID') {
      setIsPaymentModalOpen(true);
      return;
    }

    handleRequestPass(resolvedAccessType);
  };

  const handleRequestPass = async (accessType: 'FREE_PASS' | 'VIP' | 'VIP_PLUS_ONE' | 'PAID') => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      const allowsPlusOne = accessType === 'VIP_PLUS_ONE';
      const tier = accessType === 'FREE_PASS' ? 'FREE' : (accessType === 'PAID' ? 'PAID' : 'VIP');
      const cleanTitle = (event.title || 'Evento +1').replace(/^FLYER.*?:\s*/i, '').trim();
      let passId = existingPassId;

      if (existingPassId) {
        // Reintentar pase previo rechazado o marcado con cupo lleno
        try {
          await updateDoc(doc(db, 'passes', existingPassId), {
            status: 'pending',
            tier,
            accessTier: tier,
            accessType,
            allowsPlusOne,
            withPlusOne: allowsPlusOne,
            companionsCount: allowsPlusOne ? 1 : 0,
            ticketPrice: accessType === 'PAID' ? (Number(event.ticketPrice) || 35) : 0,
            isPaid: accessType === 'PAID',
            updatedAt: Date.now(),
          });
        } catch {
          const passDocRef = await addDoc(collection(db, 'passes'), {
            eventId: event.id,
            eventTitle: cleanTitle,
            title: cleanTitle,
            eventDate: event.date || event.dateDisplay || '',
            eventTime: event.startTime || event.time || (event.timeRange ? event.timeRange.split('—')[0].trim() : '22:00'),
            eventLocation: event.location || event.exactAddress || '',
            eventImageUrl: event.imageUrl || '',
            hostUserId: event.hostUserId || '',
            userId: auth.currentUser.uid,
            holderName: auth.currentUser.displayName || (auth.currentUser.isAnonymous ? "Invitado #" + auth.currentUser.uid.slice(-4).toUpperCase() : 'Invitado'),
            userName: auth.currentUser.displayName || (auth.currentUser.isAnonymous ? "Invitado #" + auth.currentUser.uid.slice(-4).toUpperCase() : 'Invitado'),
            userPhotoUrl: auth.currentUser.photoURL || '',
            userAvatar: auth.currentUser.photoURL || '',
            tier,
            accessTier: tier,
            accessType,
            allowsPlusOne,
            withPlusOne: allowsPlusOne,
            companionsCount: allowsPlusOne ? 1 : 0,
            ticketPrice: accessType === 'PAID' ? (Number(event.ticketPrice) || 35) : 0,
            isPaid: accessType === 'PAID',
            status: 'pending',
            createdAt: Date.now(),
          });
          passId = passDocRef.id;
          setExistingPassId(passId);
        }
      } else {
        const passDocRef = await addDoc(collection(db, 'passes'), {
          eventId: event.id,
          eventTitle: cleanTitle,
          title: cleanTitle,
          eventDate: event.date || event.dateDisplay || '',
          eventTime: event.startTime || event.time || (event.timeRange ? event.timeRange.split('—')[0].trim() : '22:00'),
          eventLocation: event.location || event.exactAddress || '',
          eventImageUrl: event.imageUrl || '',
          hostUserId: event.hostUserId || '',
          userId: auth.currentUser.uid,
          holderName: auth.currentUser.displayName || (auth.currentUser.isAnonymous ? "Invitado #" + auth.currentUser.uid.slice(-4).toUpperCase() : 'Invitado'),
          userName: auth.currentUser.displayName || (auth.currentUser.isAnonymous ? "Invitado #" + auth.currentUser.uid.slice(-4).toUpperCase() : 'Invitado'),
          userPhotoUrl: auth.currentUser.photoURL || '',
          userAvatar: auth.currentUser.photoURL || '',
          tier,
          accessTier: tier,
          accessType,
          allowsPlusOne,
          withPlusOne: allowsPlusOne,
          companionsCount: allowsPlusOne ? 1 : 0,
          ticketPrice: accessType === 'PAID' ? (Number(event.ticketPrice) || 35) : 0,
          isPaid: accessType === 'PAID',
          status: 'pending',
          createdAt: Date.now(),
        });
        passId = passDocRef.id;
        setExistingPassId(passId);
      }
      setPassStatus('pending');
      setUserPass((prev: any) => ({
        ...(prev || {}),
        id: passId,
        status: 'pending',
        accessType,
        tier,
        accessTier: tier,
        allowsPlusOne,
      }));

      // Notificación reactiva para el anfitrión
      if (event.hostUserId && event.hostUserId !== auth.currentUser.uid) {
        try {
          let notifTitle = 'NUEVA SOLICITUD VIP ⚡';
          let notifMsg = `${auth.currentUser.displayName || 'Un invitado'} ha solicitado pase VIP para ${cleanTitle}.`;
          if (accessType === 'FREE_PASS') {
            notifTitle = 'NUEVA SOLICITUD FREE PASS 🎟️';
            notifMsg = `${auth.currentUser.displayName || 'Un invitado'} ha solicitado su Free Pass para ${cleanTitle}.`;
          } else if (accessType === 'VIP_PLUS_ONE') {
            notifTitle = 'SOLICITUD VIP +1 ⚡';
            notifMsg = `${auth.currentUser.displayName || 'Un invitado'} ha solicitado pase VIP (+1) para ${cleanTitle}.`;
          } else if (accessType === 'PAID') {
            notifTitle = 'NUEVA COMPRA DE ENTRADA 💰';
            notifMsg = `${auth.currentUser.displayName || 'Un invitado'} envió solicitud de compra de entrada (Bs. ${event.ticketPrice || 35}) para ${cleanTitle}.`;
          }

          await addDoc(collection(db, 'notifications'), {
            userId: event.hostUserId,
            type: accessType === 'PAID' ? 'PURCHASE_SUCCESS' : 'VIP_REQUEST',
            title: notifTitle,
            message: notifMsg,
            eventId: event.id,
            eventTitle: cleanTitle,
            eventImageUrl: event.imageUrl || '',
            passId: passId || '',
            senderName: auth.currentUser.displayName || (auth.currentUser.isAnonymous ? 'Invitado #' + auth.currentUser.uid.slice(-4).toUpperCase() : 'Invitado'),
            senderId: auth.currentUser.uid,
            senderPhotoUrl: auth.currentUser.photoURL || '',
            read: false,
            createdAt: Date.now(),
          });
        } catch (notifErr) {
          console.warn('[+1] Error guardando notificación para host:', notifErr);
        }
      }

      if (onApplyVip) onApplyVip(event.id);
    } catch (err) {
      console.error('Error procesando pase:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed md:absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-5 select-none overflow-hidden">
          {/* Fondo con oscurecimiento y desenfoque intenso (Backdrop Blur) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
          />

          {/* Tarjeta Centrada en Pantalla con Animación Zoom In Suave */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="relative w-full max-w-[345px] sm:max-w-[360px] max-h-[84%] bg-[#181A1E] border-2 border-[#E87A72] rounded-[28px] p-5 shadow-2xl z-10 flex flex-col overflow-hidden"
          >
            {/* Botón de Cierre Superior Derecho (✕) */}
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white flex items-center justify-center text-base z-20 border border-neutral-700/60 focus:outline-none transition-colors"
            >
              ✕
            </button>

            {/* Contenido con scroll vertical limpio */}
            <div className="overflow-y-auto no-scrollbar pr-1 pb-3 flex-1 min-h-0">
              
              {/* 1. CABECERA DINÁMICA CON FLYER DEL EVENTO */}
              <div className="relative w-full h-52 sm:h-60 rounded-2xl overflow-hidden bg-[#16171B] mb-4 flex-shrink-0">
                {selectedEvent?.imageUrl ? (
                  <img
                    src={selectedEvent.imageUrl}
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1F2228] to-[#121316] p-4 text-center">
                    <span className="font-display text-2xl text-white tracking-wide uppercase">
                      {selectedEvent?.title}
                    </span>
                    <span className="text-xs text-zinc-500 font-sans mt-1">
                      EVENTO SIN FLYER
                    </span>
                  </div>
                )}

                {/* Badge flotante de Cupos o Urgencia en la esquina inferior */}
                <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                  {remainingSpots === 0 ? (
                    <span className="text-xs font-display font-black text-[#DC2626] tracking-wider uppercase">
                      🔒 LISTA VIP COMPLETA
                    </span>
                  ) : remainingSpots <= 20 ? (
                    <span className="text-xs font-display font-black text-[#E87A72] tracking-wider uppercase">
                      ⏳ ÚLTIMOS {remainingSpots} CUPOS
                    </span>
                  ) : (
                    <span className="text-xs font-sans text-[#E87A72] font-semibold">
                      CUPO MÁX. {selectedEvent?.guestLimit || selectedEvent?.maxCapacity || 100}
                    </span>
                  )}
                </div>
              </div>

              {/* Título Principal */}
              <h3 className="font-display text-white text-xl sm:text-2xl font-black tracking-tight uppercase leading-tight">
                {selectedEvent.typeBadge ? `${selectedEvent.typeBadge}: ` : ''}{selectedEvent.title}
              </h3>

              {/* 2. Metadatos Completos */}
              <div className="mt-3.5 p-3.5 rounded-xl bg-[#121316] border border-neutral-800 space-y-2">
                <div className="flex items-center text-white/90 text-xs sm:text-sm font-sans">
                  <span className="w-5 text-center mr-2 text-base">📅</span>
                  <span className="font-display uppercase tracking-wide font-bold">
                    {formatCardDate(event.dateDisplay || event.date) || 'Próximamente'}
                  </span>
                </div>
                <div className="flex items-center text-neutral-300 text-xs sm:text-sm font-sans">
                  <span className="w-5 text-center mr-2 text-base">⏰</span>
                  <span>
                    {event.timeRange || (event.startTime ? `${event.startTime} — ${event.endTime || 'Cierre'}` : '22:00 — 04:00')}
                  </span>
                </div>
                <div className="flex items-center text-neutral-300 text-xs sm:text-sm font-sans">
                  <span className="w-5 text-center mr-2 text-base text-neutral-500">•</span>
                  <span>{event.exactAddress || event.location || 'Ubicación por confirmar'}</span>
                </div>
              </div>

              {/* Pastilla / Micro-badge de advertencia de Cierre de Lista VIP */}
              {(event.vipCutoffTime || selectedEvent.vipCutoffTime) && (
                <div className="mt-3 px-3.5 py-2 rounded-xl bg-[#E87A72]/15 border border-[#E87A72]/30 flex items-center space-x-2">
                  <span className="text-sm">⏳</span>
                  <span className="font-display text-[#E87A72] text-xs font-black tracking-wider uppercase">
                    LISTA VIP VÁLIDA HASTA: {formatVipCutoffDisplay(event.vipCutoffTime || selectedEvent.vipCutoffTime)}
                  </span>
                </div>
              )}

              {/* FILA DE ASISTENTES SOCIALES ("¿QUIÉN VA?") */}
              <div className="mt-4 p-3 rounded-xl bg-[#121316] border border-neutral-800 flex items-center space-x-3">
                {confirmedUsers && confirmedUsers.length > 0 ? (
                  <div className="flex -space-x-2 overflow-hidden shrink-0">
                    {confirmedUsers.slice(0, 4).map((u, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full border-2 border-[#16171B] overflow-hidden bg-[#26282E] flex items-center justify-center shrink-0"
                        title={u.name}
                      >
                        {u.photoUrl ? (
                          <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-display text-[11px] font-black uppercase">
                            {(u.name || 'A').slice(0, 1)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-[#16171B] bg-[#26282E] flex items-center justify-center shrink-0 text-xs">
                    🎟️
                  </div>
                )}
                <p className="font-sans text-[#8E8E93] text-xs leading-tight">
                  {activePassesCount > 0 ? (
                    activePassesCount === 1 ? (
                      <>
                        <strong className="text-white font-medium">{confirmedUsers[0]?.name || '1 persona'}</strong> ya tiene su pase
                      </>
                    ) : (
                      <>
                        <strong className="text-white font-medium">{confirmedUsers[0]?.name || '1 persona'}</strong> y{' '}
                        <strong className="text-white font-medium">{activePassesCount - 1} más</strong> ya tienen su pase
                      </>
                    )
                  ) : (
                    'Sé el primero en anotarte en la lista VIP'
                  )}
                </p>
              </div>

              {/* 3. Sección "Detalles y Motivo" */}
              {event.description && (
                <div className="mt-5">
                  <h4 className="font-display text-neutral-400 text-xs font-bold uppercase tracking-wider mb-1.5">
                    DETALLES Y TEMÁTICA
                  </h4>
                  <p className="font-sans text-neutral-200 text-xs sm:text-sm leading-relaxed">
                    {event.description}
                  </p>
                </div>
              )}

              {/* 4. Sección "Activaciones y Promociones" */}
              {event.promotions && event.promotions.length > 0 && (
                <div className="mt-5">
                  <h4 className="font-display text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2">
                    ACTIVACIONES Y BENEFICIOS VIP
                  </h4>
                  <ul className="space-y-1.5">
                    {event.promotions.map((promo, idx) => (
                      <li key={idx} className="flex items-start text-xs sm:text-sm text-neutral-300 font-sans">
                        <span className="text-[#E87A72] mr-2 leading-tight">✦</span>
                        <span>{promo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

            {/* 5. Barra Inferior de Acción y Conversión (Ticker de Actividad + Conversión + Compartir) */}
            <div className="pt-3 border-t border-neutral-800/80 mt-auto flex flex-col gap-2 flex-shrink-0">
              {/* Ticker de Actividad en Vivo */}
              <p className="font-sans text-[11px] text-zinc-400 text-center tracking-wide">
                🔥 Alta demanda: {recentRequestsCount > 0 ? recentRequestsCount : 12} solicitudes recibidas hoy
              </p>

              <div className="flex items-center gap-2.5">
                {/* Botón principal de conversión flex-1 */}
                <div className="flex-1">
                  {(userPass?.status === 'active' || userPass?.status === 'confirmed' || userPass?.status === 'approved' || userPass?.status === 'accepted' || passStatus === 'active' || passStatus === 'confirmed') ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleActionClick}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#12C061] hover:bg-[#0fa854] text-black font-display text-base font-black tracking-wider uppercase flex items-center justify-center transition-colors shadow-lg cursor-pointer active:scale-98"
                    >
                      🎟️ PASE ACTIVO · VER EN MIS TICKETS
                    </motion.button>
                  ) : (userPass?.status === 'pending' || passStatus === 'pending' || isSubmitting) ? (
                    <button
                      disabled
                      className="w-full py-3.5 px-4 rounded-xl bg-[#1E2025] border border-[#26282E] text-[#FAB205] font-display text-base font-black tracking-wider uppercase flex items-center justify-center cursor-not-allowed shadow-inner"
                    >
                      ⏳ SOLICITUD PENDIENTE
                    </button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleActionClick}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display text-base font-black tracking-wider uppercase flex items-center justify-center transition-colors shadow-lg focus:outline-none cursor-pointer active:scale-98"
                    >
                      {resolvedAccessType === 'FREE_PASS' && 'SOLICITAR FREE PASS'}
                      {resolvedAccessType === 'VIP' && 'SOLICITAR VIP'}
                      {resolvedAccessType === 'VIP_PLUS_ONE' && 'SOLICITAR VIP +1'}
                      {resolvedAccessType === 'PAID' && `COMPRAR ENTRADA · BS. ${event.ticketPrice || 35}`}
                    </motion.button>
                  )}
                </div>

              {/* Botón de compartir: botón cuadrado #16171B con borde #26282E e icono de compartir */}
              <button
                type="button"
                onClick={handleShareEvent}
                aria-label="Compartir evento"
                title="Compartir evento"
                className="w-14 h-12 rounded-xl bg-[#16171B] hover:bg-[#22252C] border border-[#26282E] hover:border-[#E87A72] flex items-center justify-center text-white active:scale-95 transition-all shadow-md cursor-pointer flex-shrink-0"
              >
                <svg
                  className="w-5 h-5 text-white stroke-current fill-none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Modal de Pago / Confirmación de Transferencia para Eventos PAID */}
    <AnimatePresence>
      {isPaymentModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPaymentModalOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative z-10 w-full max-w-md bg-[#16171B] border border-[#26282E] rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#26282E]">
              <h3 className="font-display text-lg font-black tracking-wider uppercase text-white">
                Comprar Entrada
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#121316] border border-neutral-800 space-y-2">
              <p className="font-display font-bold text-sm uppercase text-neutral-300">
                {selectedEvent.title}
              </p>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs font-sans text-neutral-400">Total a pagar:</span>
                <span className="font-display text-2xl font-black text-[#E87A72]">
                  Bs. {selectedEvent.ticketPrice || 35}
                </span>
              </div>
            </div>

            {(selectedEvent.paymentQrUrl || selectedEvent.hostQrUrl) ? (
              <div className="flex flex-col items-center justify-center p-3 bg-[#121316] rounded-xl border border-neutral-800">
                <p className="text-xs font-sans text-neutral-400 mb-2">Escanea el código QR para transferir:</p>
                <img
                  src={selectedEvent.paymentQrUrl || selectedEvent.hostQrUrl}
                  alt="QR Transferencia"
                  className="w-48 h-48 rounded-lg object-contain bg-white p-2"
                />
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#1E2025] border border-[#26282E] text-center space-y-2">
                <span className="text-3xl block">📲</span>
                <p className="font-sans text-xs text-neutral-300 leading-relaxed">
                  Realiza la transferencia de <strong className="text-white">Bs. {selectedEvent.ticketPrice || 35}</strong> vía Simple QR o transferencia bancaria al anfitrión.
                </p>
                <p className="font-sans text-[11px] text-neutral-400">
                  Una vez transferido, confirma aquí tu solicitud. Tu entrada quedará activa una vez que el anfitrión verifique el comprobante.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setIsPaymentModalOpen(false);
                  await handleRequestPass('PAID');
                }}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-[#12C061] hover:bg-[#0fa854] text-black font-display text-sm font-black tracking-wider uppercase flex items-center justify-center transition-colors shadow-lg cursor-pointer active:scale-98 disabled:opacity-50"
              >
                HE TRANSFERIDO / CONFIRMAR
              </button>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-full py-2.5 px-4 text-xs font-sans text-neutral-400 hover:text-white uppercase tracking-wider text-center transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {selectedEvent && (
      <ShareEventModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        event={{
          id: selectedEvent.id,
          title: selectedEvent.title || '',
          date: selectedEvent.date || selectedEvent.dateDisplay || '',
          dateDisplay: selectedEvent.dateDisplay || selectedEvent.date || '',
          startTime: selectedEvent.startTime || selectedEvent.time || '',
          timeRange: selectedEvent.timeRange || selectedEvent.startTime || '',
          location: selectedEvent.location || selectedEvent.exactAddress || '',
          exactAddress: selectedEvent.exactAddress || selectedEvent.location || '',
          imageUrl: selectedEvent.imageUrl || selectedEvent.image || selectedEvent.flyerUrl || null,
          guestLimit: selectedEvent.guestLimit || selectedEvent.maxCapacity || 100,
        }}
      />
    )}
  </>
  );
};

export default EventDetailModal;
