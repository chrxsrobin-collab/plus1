import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationItem } from '../types/home';
import { mockNotifications, GENTLE_MESSAGES } from '../data/mockData';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, addDoc, collection, getDoc, deleteDoc } from 'firebase/firestore';

export interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: NotificationItem[];
  onViewPass?: (passId: string) => void;
  onNavigate?: (route: string) => void;
  onMarkAllAsRead?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications = mockNotifications,
  onViewPass,
  onNavigate,
  onMarkAllAsRead,
}) => {
  const [items, setItems] = useState<NotificationItem[]>(notifications);
  const [actionFeedback, setActionFeedback] = useState<{ [id: string]: 'approved' | 'declined' | 'accepted' | 'rejected' }>({});
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const resolvedNotifIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  // Swipe-to-delete: Elimina la notificación optimísticamente y en Firestore
  const handleDeleteNotification = async (notifId: string) => {
    // 1. Filtra inmediatamente el array del estado local
    setItems((prev) => prev.filter((n) => n.id !== notifId));

    // 2. Ejecuta el borrado permanente en Firestore
    try {
      if (notifId && !notifId.startsWith('mock_')) {
        await deleteDoc(doc(db, 'notifications', notifId));
      }
    } catch (err) {
      console.error('Error eliminando notificación de Firestore:', err);
    }
  };

  // Auto-resolver: Si una notificación de Firestore carecía de eventImageUrl o eventTitle, recuperarlos automáticamente
  useEffect(() => {
    const missing = items.filter(
      (n) =>
        !resolvedNotifIdsRef.current.has(n.id) &&
        (n.type === 'VIP_DECLINED' || (n.type as string) === 'capacity_reached' || n.type === 'VIP_APPROVED' || (n.type as string) === 'vip_approved') &&
        (!n.eventImageUrl || !n.eventTitle || n.eventTitle === 'CUPO COMPLETO · ACCESO LIMITADO' || n.title === 'CUPO COMPLETO · ACCESO LIMITADO') &&
        (n.eventId || n.passId)
    );

    if (missing.length === 0) return;
    missing.forEach((n) => resolvedNotifIdsRef.current.add(n.id));

    let isCancelled = false;

    const resolveMissingFlyers = async () => {
      const updates: { [id: string]: { eventImageUrl?: string; eventTitle?: string } } = {};

      for (const n of missing) {
        let img = n.eventImageUrl;
        let title = n.eventTitle && n.eventTitle !== 'CUPO COMPLETO · ACCESO LIMITADO' ? n.eventTitle : '';

        if (n.eventId) {
          try {
            const evSnap = await getDoc(doc(db, 'events', n.eventId));
            if (evSnap.exists()) {
              const d = evSnap.data();
              img = img || d.imageUrl || d.artImage || d.flyerImage || '';
              if (!title) title = d.title || '';
            }
          } catch (e) {
            console.warn('Error resolviendo evento para notificación:', e);
          }
        }

        if ((!img || !title) && n.passId) {
          try {
            const pSnap = await getDoc(doc(db, 'passes', n.passId));
            if (pSnap.exists()) {
              const d = pSnap.data();
              img = img || d.eventImageUrl || '';
              if (!title) title = d.eventTitle || '';
            }
          } catch (e) {
            console.warn('Error resolviendo pase para notificación:', e);
          }
        }

        if (img || title) {
          updates[n.id] = { eventImageUrl: img, eventTitle: title };
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setItems((prev) =>
          prev.map((it) => {
            if (updates[it.id]) {
              const resolvedTitle = updates[it.id].eventTitle || it.eventTitle;
              return {
                ...it,
                eventImageUrl: updates[it.id].eventImageUrl || it.eventImageUrl,
                eventTitle: resolvedTitle,
                title: resolvedTitle || (it.title === 'CUPO COMPLETO · ACCESO LIMITADO' ? resolvedTitle || it.title : it.title),
              };
            }
            return it;
          })
        );
      }
    };

    resolveMissingFlyers();
    return () => {
      isCancelled = true;
    };
  }, [items]);

  const unreadCount = items.filter(
    (item) => !item.isRead && !item.read && !actionFeedback[item.id]
  ).length;

  // Marcar todas como leídas en Firestore y estado local
  const markAllAsRead = async () => {
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true, read: true })));
    if (onMarkAllAsRead) onMarkAllAsRead();

    if (!auth.currentUser) return;
    try {
      const unreadItems = items.filter((it) => !it.isRead && !it.read);
      await Promise.all(
        unreadItems.map((it) => {
          if (it.id && !it.id.startsWith('notif_0') && !it.id.startsWith('mock_')) {
            return updateDoc(doc(db, 'notifications', it.id), { read: true });
          }
          return Promise.resolve();
        })
      );
    } catch (err) {
      console.warn('Error marcando notificaciones leídas en Firestore:', err);
    }
  };

  // 1-Tap: Anfitrión aprueba solicitud VIP directamente desde la campana
  const handleApproveVipRequest = async (notif: NotificationItem) => {
    setLoadingActionId(notif.id);
    setActionFeedback((prev) => ({ ...prev, [notif.id]: 'approved' }));

    try {
      // 1. Actualizar el pase a 'active'
      if (notif.passId) {
        await updateDoc(doc(db, 'passes', notif.passId), {
          status: 'active',
          approvedAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // 2. Identificar destinatario del pase y arte del evento
      let recipientUserId = notif.senderId;
      let eventImageUrl = notif.eventImageUrl || '';
      let targetTitle = notif.eventTitle || notif.title || 'Evento +1';
      if (notif.passId) {
        const passDoc = await getDoc(doc(db, 'passes', notif.passId));
        if (passDoc.exists()) {
          const pData = passDoc.data();
          if (!recipientUserId) recipientUserId = pData.userId;
          if (!eventImageUrl) eventImageUrl = pData.eventImageUrl || '';
          if (!targetTitle || targetTitle === 'Evento +1') targetTitle = pData.eventTitle || targetTitle;
        }
      }
      if (!eventImageUrl && notif.eventId) {
        try {
          const evDoc = await getDoc(doc(db, 'events', notif.eventId));
          if (evDoc.exists()) {
            const evData = evDoc.data();
            eventImageUrl = evData.imageUrl || evData.artImage || evData.flyerImage || '';
            if (!targetTitle || targetTitle === 'Evento +1') targetTitle = evData.title || targetTitle;
          }
        } catch (e) {
          console.warn('Fallback al consultar flyer de evento:', e);
        }
      }

      // 3. Crear notificación reactiva para el ASISTENTE
      if (recipientUserId) {
        await addDoc(collection(db, 'notifications'), {
          userId: recipientUserId,
          type: 'VIP_APPROVED',
          title: targetTitle,
          message: `Tu acceso para ${targetTitle} ya está activo. Toca para ver tu ticket QR en tu billetera.`,
          eventId: notif.eventId || '',
          eventTitle: targetTitle,
          eventImageUrl: eventImageUrl,
          passId: notif.passId || '',
          senderName: auth.currentUser?.displayName || 'Anfitrión',
          senderId: auth.currentUser?.uid || '',
          read: false,
          createdAt: Date.now(),
        });
      }

      // 4. Marcar esta notificación como leída y resuelta
      if (notif.id && !notif.id.startsWith('mock_') && !notif.id.startsWith('notif_0')) {
        await updateDoc(doc(db, 'notifications', notif.id), {
          read: true,
          actionTaken: 'approved',
        });
      }
    } catch (err) {
      console.error('Error aprobando solicitud VIP desde notificación:', err);
    } finally {
      setLoadingActionId(null);
    }
  };

  // 1-Tap: Anfitrión declina solicitud por aforo alcanzado (mensaje amable aleatorio)
  const handleDeclineVipRequest = async (notif: NotificationItem) => {
    setLoadingActionId(notif.id);
    setActionFeedback((prev) => ({ ...prev, [notif.id]: 'declined' }));

    const randomReason = GENTLE_MESSAGES[Math.floor(Math.random() * GENTLE_MESSAGES.length)];

    try {
      // 1. Actualizar el pase a 'capacity_reached' con motivo amable
      if (notif.passId) {
        await updateDoc(doc(db, 'passes', notif.passId), {
          status: 'capacity_reached',
          declineReason: randomReason,
          feedbackMessage: randomReason,
          updatedAt: Date.now(),
        });
      }

      // 2. Identificar destinatario del pase y arte del evento
      let recipientUserId = notif.senderId;
      let eventImageUrl = notif.eventImageUrl || '';
      let targetTitle = notif.eventTitle || notif.title || 'Evento +1';
      if (notif.passId) {
        const passDoc = await getDoc(doc(db, 'passes', notif.passId));
        if (passDoc.exists()) {
          const pData = passDoc.data();
          if (!recipientUserId) recipientUserId = pData.userId;
          if (!eventImageUrl) eventImageUrl = pData.eventImageUrl || '';
          if (!targetTitle || targetTitle === 'Evento +1') targetTitle = pData.eventTitle || targetTitle;
        }
      }
      if (!eventImageUrl && notif.eventId) {
        try {
          const evDoc = await getDoc(doc(db, 'events', notif.eventId));
          if (evDoc.exists()) {
            const evData = evDoc.data();
            eventImageUrl = evData.imageUrl || evData.artImage || evData.flyerImage || '';
            if (!targetTitle || targetTitle === 'Evento +1') targetTitle = evData.title || targetTitle;
          }
        } catch (e) {
          console.warn('Fallback al consultar flyer de evento:', e);
        }
      }

      // 3. Crear notificación reactiva para el ASISTENTE
      if (recipientUserId) {
        await addDoc(collection(db, 'notifications'), {
          userId: recipientUserId,
          type: 'VIP_DECLINED',
          eventId: notif.eventId || '',
          eventTitle: targetTitle,
          eventImageUrl: eventImageUrl,
          title: targetTitle,
          message: randomReason,
          passId: notif.passId || '',
          senderName: auth.currentUser?.displayName || 'Anfitrión',
          senderId: auth.currentUser?.uid || '',
          read: false,
          createdAt: Date.now(),
          metadata: {
            declineReason: randomReason,
          },
        });
      }

      // 4. Marcar esta notificación como leída y resuelta
      if (notif.id && !notif.id.startsWith('mock_') && !notif.id.startsWith('notif_0')) {
        await updateDoc(doc(db, 'notifications', notif.id), {
          read: true,
          actionTaken: 'declined',
        });
      }
    } catch (err) {
      console.error('Error declinando solicitud VIP desde notificación:', err);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleAcceptInvitation = (id: string) => {
    setActionFeedback((prev) => ({ ...prev, [id]: 'accepted' }));
  };

  const handleRejectInvitation = (id: string) => {
    setActionFeedback((prev) => ({ ...prev, [id]: 'rejected' }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-start items-center pt-[max(env(safe-area-inset-top),3.5rem)] px-3 pb-6 select-none overflow-hidden">
          {/* Backdrop con oscurecimiento y desenfoque intenso */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Tarjeta Modal Desplegable desde Arriba */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-[#16171B] border border-[#26282E] rounded-2xl max-h-[82vh] flex flex-col overflow-hidden shadow-2xl z-10"
          >
            {/* 1. HEADER FIJO DEL MODAL */}
            <div className="shrink-0 border-b border-[#26282E] p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <h3 className="font-display text-white text-xl font-black tracking-wide uppercase leading-none">
                  NOTIFICACIONES
                </h3>
                {unreadCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#E87A72]/15 border border-[#E87A72]/30 text-[#E87A72] font-display font-bold text-[11px] uppercase tracking-wider">
                    {unreadCount} NUEVAS
                  </span>
                ) : (
                  <span className="text-neutral-500 font-sans text-xs">
                    Al día
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-sans text-neutral-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
                  >
                    Marcar leídas
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Cerrar notificaciones"
                  className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors active:scale-95 focus:outline-none cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 2. LISTA VERTICAL DE NOTIFICACIONES (SCROLL DESCENDENTE) */}
            <div className="flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="popLayout">
                {items.map((notif) => {
                  const feedback = actionFeedback[notif.id] || notif.actionTaken;
                  const isRead = notif.isRead || notif.read || feedback;
                  const isVipRequest = notif.type === 'VIP_REQUEST';
                  const isVipApproved = notif.type === 'VIP_APPROVED' || notif.type === 'vip_approved';
                  const isVipDeclined = notif.type === 'VIP_DECLINED' || (notif.type as string) === 'capacity_reached';

                  return (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="relative overflow-hidden rounded-2xl mb-3 select-none"
                    >
                      {/* CAPA DE FONDO: Acción de Borrar (Roja con Basurero) */}
                      <div className="absolute inset-0 bg-[#DC2626] flex items-center justify-end px-5 rounded-2xl">
                        <span className="text-white text-lg">🗑️</span>
                      </div>

                      {/* CAPA FRONTAL: Tarjeta que se mueve con el dedo */}
                      <motion.div
                        drag="x"
                        dragDirectionLock
                        dragConstraints={{ left: -120, right: 0 }}
                        dragElastic={0.15}
                        onDragEnd={async (_, info) => {
                          // Si deslizó más de 80px a la izquierda o con velocidad alta
                          if (info.offset.x < -80 || info.velocity.x < -400) {
                            handleDeleteNotification(notif.id);
                          }
                        }}
                        className={`relative bg-[#16171B] border border-[#26282E] p-4 rounded-2xl touch-pan-y select-none cursor-grab active:cursor-grabbing transition-colors ${
                          isRead
                            ? 'opacity-85'
                            : 'shadow-md'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                      {/* Icono Izquierdo según tipo */}
                      <div className="flex-shrink-0 mt-0.5">
                        {isVipRequest && (
                          notif.senderPhotoUrl ? (
                            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white/10 bg-[#1F2228]">
                              <img
                                src={notif.senderPhotoUrl}
                                alt={notif.senderName || 'Solicitante'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-[#E87A72]/40 bg-[#1F2228] flex items-center justify-center shadow-inner">
                              <span className="font-display font-black text-white text-sm tracking-wider uppercase">
                                {(() => {
                                  const name = notif.senderName;
                                  if (!name) return 'IP';
                                  const clean = name.replace(/^Invitado\s*#?/i, '').trim();
                                  const parts = (clean || name).trim().split(/\s+/);
                                  if (parts.length >= 2 && parts[0] && parts[1]) {
                                    return (parts[0][0] + parts[1][0]).toUpperCase();
                                  }
                                  return (clean || name).slice(0, 2).toUpperCase();
                                })()}
                              </span>
                            </div>
                          )
                        )}

                        {isVipApproved && (
                          <div className="w-9 h-9 rounded-xl bg-[#12C061]/15 border border-[#12C061]/40 flex items-center justify-center text-[#12C061]">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          </div>
                        )}

                        {isVipDeclined && (
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#16171B] border border-white/10">
                            {notif.eventImageUrl ? (
                              <img
                                src={notif.eventImageUrl}
                                alt={notif.eventTitle}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#1E2025] text-white font-display text-[10px] text-center p-1 uppercase">
                                {notif.eventTitle ? notif.eventTitle.slice(0, 5) : "+1"}
                              </div>
                            )}
                          </div>
                        )}

                        {notif.type === 'invitation' && (
                          <div className="w-9 h-9 rounded-xl bg-[#26282E] border border-[#E87A72]/40 flex items-center justify-center text-base">
                            🎟️
                          </div>
                        )}

                        {notif.type === 'streak_alert' && (
                          <div className="w-9 h-9 rounded-xl bg-[#F17D02]/15 border border-[#F17D02]/40 flex items-center justify-center text-base">
                            🔥
                          </div>
                        )}

                        {notif.type === 'companion_confirmed' && (
                          <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white text-base">
                            👥
                          </div>
                        )}
                      </div>

                      {/* Contenido Central */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          {isVipDeclined ? (
                            <h4 className="font-display text-white text-base tracking-wide uppercase truncate">
                              {notif.eventTitle || notif.title}
                            </h4>
                          ) : (
                            <h4 className="font-display text-white text-sm font-bold uppercase tracking-wide leading-tight">
                              {notif.title}
                            </h4>
                          )}
                          <span className="font-sans text-[11px] text-[#8E8E93] ml-2 flex-shrink-0">
                            {notif.timeAgo || 'Reciente'}
                          </span>
                        </div>

                        <p className={`font-sans text-xs mt-1 leading-relaxed ${isVipDeclined ? 'text-[#9CA3AF]' : 'text-neutral-300'}`}>
                          {notif.message}
                        </p>

                        {/* ACCIÓN DIRECTA 1-TAP PARA EL ANFITRIÓN: SOLICITUD VIP RECIBIDA */}
                        {isVipRequest && !feedback && (
                          <div className="flex items-center space-x-2 mt-3">
                            <button
                              onClick={() => handleApproveVipRequest(notif)}
                              disabled={loadingActionId === notif.id}
                              className="flex-1 h-10 rounded-xl bg-[#12C061] hover:bg-[#10a855] text-black font-display font-bold text-xs uppercase tracking-wider transition-all active:scale-95 focus:outline-none shadow cursor-pointer disabled:opacity-50 flex items-center justify-center"
                            >
                              {loadingActionId === notif.id ? 'Aprobando...' : 'APROBAR ✓'}
                            </button>
                            <button
                              onClick={() => handleDeclineVipRequest(notif)}
                              disabled={loadingActionId === notif.id}
                              title="Aforo completo / Descartar"
                              aria-label="Aforo completo / Descartar"
                              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-[#26282E]/70 hover:bg-[#26282E] border border-neutral-700/50 text-[#9CA3AF] hover:text-white text-base transition-colors active:scale-95 focus:outline-none cursor-pointer disabled:opacity-50"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {/* FEEDBACK TRAS RESPONDER SOLICITUD VIP EL ANFITRIÓN */}
                        {isVipRequest && feedback === 'approved' && (
                          <div className="mt-2 text-xs font-sans font-bold text-[#12C061] flex items-center space-x-1">
                            <span>✓</span>
                            <span>Solicitud aprobada · Pase QR emitido al asistente.</span>
                          </div>
                        )}

                        {isVipRequest && feedback === 'declined' && (
                          <div className="mt-2 text-xs font-sans text-neutral-400 flex items-center space-x-1">
                            <span>⚪</span>
                            <span>Aforo completo comunicado diplomáticamente.</span>
                          </div>
                        )}

                        {/* ACCIÓN DIRECTA ASISTENTE: VER MI QR (SI FUE APROBADO) */}
                        {isVipApproved && (
                          <div className="mt-2.5">
                            <button
                              onClick={() => {
                                onViewPass?.(notif.passId || '');
                                onClose();
                                if (onNavigate) onNavigate('/tickets');
                              }}
                              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#12C061]/15 border border-[#12C061]/40 hover:bg-[#12C061]/25 text-[#12C061] font-display text-xs font-bold uppercase tracking-wider transition-all active:scale-95 focus:outline-none cursor-pointer shadow-sm"
                            >
                              <span>VER MI QR</span>
                              <span>🎟️</span>
                            </button>
                          </div>
                        )}

                        {/* ACCIÓN DIRECTA ASISTENTE: EXPLORAR EVENTOS (SI HUBO CUPO COMPLETO) */}
                        {isVipDeclined && (
                          <div className="mt-2.5">
                            <button
                              onClick={() => {
                                onClose();
                                if (onNavigate) onNavigate('/explore');
                              }}
                              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#E87A72]/15 border border-[#E87A72]/40 hover:bg-[#E87A72]/25 text-[#E87A72] font-display text-xs font-bold uppercase tracking-wider transition-all active:scale-95 focus:outline-none cursor-pointer shadow-sm"
                            >
                              <span>EXPLORAR EVENTOS</span>
                              <span>🔍</span>
                            </button>
                          </div>
                        )}

                        {/* Acciones de Invitación legacy */}
                        {notif.type === 'invitation' && !feedback && (
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <button
                              onClick={() => {
                                onNavigate?.('/e/pepe-birthday');
                                onClose();
                              }}
                              className="py-1.5 px-3.5 rounded-xl bg-[#12C061] hover:bg-[#10a855] text-black font-display text-xs font-black uppercase tracking-wider transition-all active:scale-95 focus:outline-none shadow cursor-pointer"
                            >
                              Ver Invitación
                            </button>
                            <button
                              onClick={() => handleAcceptInvitation(notif.id)}
                              className="py-1.5 px-3 rounded-xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display text-xs font-black uppercase tracking-wider transition-all active:scale-95 focus:outline-none shadow cursor-pointer"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() => handleRejectInvitation(notif.id)}
                              className="py-1.5 px-3 rounded-xl bg-transparent hover:bg-neutral-800 text-[#8E8E93] hover:text-white border border-[#26282E] font-sans text-xs transition-all active:scale-95 focus:outline-none cursor-pointer"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}

                        {notif.type === 'invitation' && feedback === 'accepted' && (
                          <div className="mt-2 text-xs font-sans font-bold text-[#12C061] flex items-center space-x-1">
                            <span>✓</span>
                            <span>¡Aceptaste la invitación! Tu pase está listo.</span>
                          </div>
                        )}

                        {notif.type === 'invitation' && feedback === 'rejected' && (
                          <div className="mt-2 text-xs font-sans text-neutral-500">
                            Invitación declinada
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>

              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 text-2xl mb-3">
                    🔔
                  </div>
                  <h4 className="font-display text-white text-base font-bold uppercase tracking-wider">
                    NO TIENES NOTIFICACIONES
                  </h4>
                  <p className="font-sans text-neutral-400 text-xs mt-1 max-w-xs">
                    Te avisaremos cuando recibas solicitudes VIP, pases aprobados o invitaciones.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationsModal;
