import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationItem } from '../types/home';
import { mockNotifications } from '../data/mockData';

export interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: NotificationItem[];
  onViewPass?: (passId: string) => void;
  onNavigate?: (route: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications = mockNotifications,
  onViewPass,
  onNavigate,
}) => {
  const [items, setItems] = useState<NotificationItem[]>(notifications);
  const [actionFeedback, setActionFeedback] = useState<{ [id: string]: 'accepted' | 'rejected' }>({});

  const unreadCount = items.filter(
    (item) => !item.isRead && !actionFeedback[item.id]
  ).length;

  const handleAcceptInvitation = (id: string) => {
    setActionFeedback((prev) => ({ ...prev, [id]: 'accepted' }));
  };

  const handleRejectInvitation = (id: string) => {
    setActionFeedback((prev) => ({ ...prev, [id]: 'rejected' }));
  };

  const markAllAsRead = () => {
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
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
                    className="text-[11px] font-sans text-neutral-400 hover:text-white transition-colors focus:outline-none"
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
            <div className="flex-1 overflow-y-auto space-y-3 p-4">
              {items.map((notif) => {
                const feedback = actionFeedback[notif.id];

                return (
                  <div
                    key={notif.id}
                    className={`rounded-2xl p-3.5 border transition-all ${
                      notif.isRead || feedback
                        ? 'bg-[#121316] border-[#22242A] opacity-80'
                        : 'bg-[#1A1C22] border-[#2E313A] shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icono Izquierdo según tipo */}
                      <div className="flex-shrink-0 mt-0.5">
                        {notif.type === 'invitation' && (
                          <div className="w-9 h-9 rounded-xl bg-[#26282E] border border-[#E87A72]/40 flex items-center justify-center text-base">
                            🎟️
                          </div>
                        )}

                        {notif.type === 'vip_approved' && (
                          <div className="w-9 h-9 rounded-xl bg-[#12C061]/15 border border-[#12C061]/40 flex items-center justify-center text-[#12C061]">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
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
                          <h4 className="font-display text-white text-sm font-bold uppercase tracking-wide leading-tight">
                            {notif.title}
                          </h4>
                          <span className="font-sans text-[11px] text-[#8E8E93] ml-2 flex-shrink-0">
                            {notif.timeAgo}
                          </span>
                        </div>

                        <p className="font-sans text-neutral-300 text-xs mt-1 leading-relaxed">
                          {notif.message}
                        </p>

                        {/* Botón Ver mi QR (en solicitud VIP aprobada) */}
                        {notif.type === 'vip_approved' && (
                          <div className="mt-2.5">
                            <button
                              onClick={() => {
                                onViewPass?.(notif.passId || '4092');
                                onClose();
                              }}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#12C061]/15 border border-[#12C061]/40 hover:bg-[#12C061]/25 text-[#12C061] font-sans text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 focus:outline-none"
                            >
                              <span>Ver mi QR</span>
                              <span>🎟️</span>
                            </button>
                          </div>
                        )}

                        {/* Acciones de Invitación (Aceptar / Rechazar / Ver Enlace) */}
                        {notif.type === 'invitation' && !feedback && (
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <button
                              onClick={() => {
                                onNavigate?.('/e/pepe-birthday');
                                onClose();
                              }}
                              className="py-1.5 px-3.5 rounded-xl bg-[#12C061] hover:bg-[#10a855] text-black font-display text-xs font-black uppercase tracking-wider transition-all active:scale-95 focus:outline-none shadow"
                            >
                              Ver Invitación
                            </button>
                            <button
                              onClick={() => handleAcceptInvitation(notif.id)}
                              className="py-1.5 px-3 rounded-xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display text-xs font-black uppercase tracking-wider transition-all active:scale-95 focus:outline-none shadow"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() => handleRejectInvitation(notif.id)}
                              className="py-1.5 px-3 rounded-xl bg-transparent hover:bg-neutral-800 text-[#8E8E93] hover:text-white border border-[#26282E] font-sans text-xs transition-all active:scale-95 focus:outline-none"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}

                        {/* Feedback tras responder invitación */}
                        {notif.type === 'invitation' && feedback === 'accepted' && (
                          <div className="mt-2 text-xs font-sans font-bold text-[#12C061] flex items-center space-x-1">
                            <span>✓</span>
                            <span>¡Aceptaste la invitación! Tu pase está listo.</span>
                          </div>
                        )}

                        {notif.type === 'invitation' && feedback === 'rejected' && (
                          <div className="mt-2 text-xs font-sans text-neutral-500">
                            Invitación rechazada
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 text-2xl mb-3">
                    🔔
                  </div>
                  <h4 className="font-display text-white text-base font-bold uppercase tracking-wider">
                    NO TIENES NOTIFICACIONES
                  </h4>
                  <p className="font-sans text-neutral-400 text-xs mt-1 max-w-xs">
                    Te avisaremos cuando recibas invitaciones o novedades de tus eventos.
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
