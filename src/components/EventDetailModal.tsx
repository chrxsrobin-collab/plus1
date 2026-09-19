import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { VipFlyerItem } from '../types/home';

interface EventDetailModalProps {
  event?: any;
  selectedEvent?: any;
  isOpen: boolean;
  onClose: () => void;
  onApplyVip?: (eventId: string) => void;
  onNavigate?: (route: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event: propEvent,
  selectedEvent: propSelectedEvent,
  isOpen,
  onClose,
  onApplyVip,
  onNavigate,
}) => {
  const selectedEvent = propSelectedEvent || propEvent;
  const [passStatus, setPassStatus] = useState<'none' | 'pending' | 'active' | 'capacity_reached' | 'used'>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !selectedEvent?.id || !auth.currentUser) {
      setPassStatus('none');
      return;
    }
    const q = query(
      collection(db, 'passes'),
      where('userId', '==', auth.currentUser.uid),
      where('eventId', '==', selectedEvent.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const pData = snap.docs[0].data();
        setPassStatus((pData.status as any) || 'pending');
      } else {
        setPassStatus('none');
      }
    }, (err) => {
      console.warn('Error escuchando estado del pase en modal:', err);
    });
    return () => unsub();
  }, [isOpen, selectedEvent?.id]);

  if (!selectedEvent) return null;
  const event = selectedEvent;

  const handleRequestVip = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      const passDocRef = await addDoc(collection(db, 'passes'), {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date || event.dateDisplay || '',
        eventTime: event.startTime || event.time || (event.timeRange ? event.timeRange.split('—')[0].trim() : ''),
        eventLocation: event.location || event.exactAddress || '',
        eventImageUrl: event.imageUrl || '',
        hostUserId: event.hostUserId || '',
        userId: auth.currentUser.uid,
        holderName: auth.currentUser.displayName || (auth.currentUser.isAnonymous ? "Invitado #" + auth.currentUser.uid.slice(-4).toUpperCase() : 'Invitado'),
        accessTier: 'VIP',
        status: 'pending', // 'pending' | 'active' | 'capacity_reached' | 'used'
        createdAt: Date.now(),
      });
      setPassStatus('pending');

      // DISPARADOR A: Notificación reactiva para el ANFITRIÓN
      if (event.hostUserId && event.hostUserId !== auth.currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: event.hostUserId,
          type: 'VIP_REQUEST',
          title: 'NUEVA SOLICITUD VIP ⚡',
          message: `${auth.currentUser.displayName || (auth.currentUser.isAnonymous ? 'Invitado #' + auth.currentUser.uid.slice(-4).toUpperCase() : 'Un usuario')} ha solicitado pase VIP para ${event.title}.`,
          eventId: event.id,
          eventTitle: event.title,
          eventImageUrl: event.imageUrl || '',
          passId: passDocRef.id,
          senderName: auth.currentUser.displayName || (auth.currentUser.isAnonymous ? 'Invitado #' + auth.currentUser.uid.slice(-4).toUpperCase() : 'Invitado'),
          senderId: auth.currentUser.uid,
          senderPhotoUrl: auth.currentUser.photoURL || '',
          read: false,
          createdAt: Date.now(),
        });
      }

      if (onApplyVip) onApplyVip(event.id);
    } catch (err) {
      console.error('Error solicitando VIP:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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

                {/* Badge flotante de Cupos o Tipo de Evento en la esquina inferior */}
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                  <span className="text-xs font-sans text-[#E87A72] font-semibold">
                    CUPO MÁX. {selectedEvent?.guestLimit || selectedEvent?.maxCapacity || 100}
                  </span>
                </div>
              </div>

              {/* Título Principal */}
              <h3 className="font-display text-white text-xl sm:text-2xl font-black tracking-tight uppercase leading-tight">
                {selectedEvent.typeBadge ? `${selectedEvent.typeBadge}: ` : ''}{selectedEvent.title}
              </h3>

              {/* Atribución del Anfitrión / Creador */}
              <div className="flex items-center space-x-2 mt-2">
                {selectedEvent.hostPhotoUrl ? (
                  <img
                    src={selectedEvent.hostPhotoUrl}
                    alt={selectedEvent.hostName || 'Anfitrión'}
                    className="w-[18px] h-[18px] rounded-full object-cover border border-white/20 shrink-0"
                  />
                ) : (
                  <div className="w-[18px] h-[18px] rounded-full bg-[#26282E] border border-white/10 flex items-center justify-center shrink-0 text-[9px] text-[#E87A72] font-display font-black">
                    {(selectedEvent.hostName || 'A').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="font-display text-xs sm:text-sm font-bold tracking-wider text-[#9CA3AF] uppercase flex items-center gap-1">
                  BY <span className="text-[#E87A72]">{selectedEvent.hostName || 'ANFITRIÓN'}</span>
                </span>
              </div>

              {selectedEvent.subtitle && (
                <p className="font-sans text-[#E87A72] text-xs sm:text-sm font-semibold mt-1">
                  {selectedEvent.subtitle}
                </p>
              )}

              {/* 2. Metadatos Completos */}
              <div className="mt-4 p-3.5 rounded-xl bg-[#121316] border border-neutral-800 space-y-2">
                <div className="flex items-center text-white/90 text-xs sm:text-sm font-sans">
                  <span className="w-5 text-center mr-2 text-base">📅</span>
                  <span className="font-display uppercase tracking-wide font-bold">
                    {event.dateDisplay || event.date || 'Próximamente'}
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

            {/* 5. Botón de Conversión Fijo al pie del modal: SOLICITAR VIP */}
            <div className="pt-3 border-t border-neutral-800/80 mt-auto">
              {passStatus === 'pending' || isSubmitting ? (
                <button
                  disabled
                  className="w-full py-3.5 px-4 rounded-full bg-[#22242A] border border-neutral-700 text-neutral-400 font-display text-base font-black tracking-wider uppercase flex items-center justify-center cursor-not-allowed shadow-inner"
                >
                  SOLICITUD ENVIADA ⏳
                </button>
              ) : passStatus === 'active' ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    onClose();
                    if (onNavigate) onNavigate('/tickets');
                  }}
                  className="w-full py-3.5 px-4 rounded-full bg-[#12C061] hover:bg-[#0fa854] text-black font-display text-base font-black tracking-wider uppercase flex items-center justify-center transition-colors shadow-lg cursor-pointer active:scale-98"
                >
                  VER MI PASE QR 🎟️
                </motion.button>
              ) : passStatus === 'capacity_reached' ? (
                <button
                  disabled
                  className="w-full py-3.5 px-4 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 font-display text-base font-black tracking-wider uppercase flex items-center justify-center cursor-not-allowed"
                >
                  AFORO COMPLETADO ⏳
                </button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleRequestVip}
                  className="w-full py-3.5 px-4 rounded-full bg-[#E87A72] hover:bg-[#d66f67] text-black font-display text-base font-black tracking-wider uppercase flex items-center justify-center transition-colors shadow-lg focus:outline-none cursor-pointer active:scale-98"
                >
                  SOLICITAR VIP
                </motion.button>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EventDetailModal;
