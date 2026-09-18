import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, confirmInviteInFirestore } from '../lib/firebase';
import { EventInviteData } from '../types/home';
import { mockEventInvites } from '../data/mockData';
import { TicketShape } from './TicketShape';
import '../styles/fonts.css';

export interface EventInviteModalProps {
  isOpen: boolean;
  inviteData?: EventInviteData;
  eventId?: string;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export const EventInviteModal: React.FC<EventInviteModalProps> = ({
  isOpen,
  inviteData,
  eventId,
  onClose,
  onNavigate,
}) => {
  const [firestoreInvite, setFirestoreInvite] = useState<EventInviteData | null>(null);

  // Carga reactiva de datos reales desde Firestore si se recibe un eventId dinámico
  useEffect(() => {
    if (!eventId) return;
    if (mockEventInvites[eventId]) return;

    let isMounted = true;
    getDoc(doc(db, 'events', eventId))
      .then((snap) => {
        if (snap.exists() && isMounted) {
          const d = snap.data();
          setFirestoreInvite({
            id: snap.id,
            title: d.title || 'Evento +1',
            subtitle: d.allowsPlusOne ? 'Pase +1 Habilitado' : 'Acceso Individual',
            hostName: d.hostName || 'Comunidad +1',
            isPrivate: d.type === 'private',
            flyerImage: d.imageUrl || d.artImage || undefined,
            theme: d.theme || 'custom',
            dateDisplay: d.date ? d.date.toString().toUpperCase() : 'PRÓXIMAMENTE',
            timeRange: `${d.startTime || '22:00'} — ${d.endTime || '04:00'}`,
            venueName: d.location || 'Por definir',
            exactAddress: d.location || '',
            confirmedCount: 1,
            confirmedAvatars: [],
            allowsPlusOne: d.allowsPlusOne !== undefined ? Boolean(d.allowsPlusOne) : true,
            description: `Organizado por ${d.hostName || 'Comunidad +1'}. Acceso en puerta con código QR.`,
          });
        }
      })
      .catch((err) => {
        console.warn('Error al cargar invitación de Firestore:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // Obtener datos del evento por prop, por Firestore, o por eventId del mock
  const invite: EventInviteData =
    inviteData ||
    firestoreInvite ||
    (eventId && mockEventInvites[eventId]) ||
    mockEventInvites['pepe-birthday'];

  // Estados interactivos
  const [plusOneSelected, setPlusOneSelected] = useState<boolean>(false);
  const [hasConfirmed, setHasConfirmed] = useState<boolean>(false);
  const [hasRequestedVip, setHasRequestedVip] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'invite' | 'ticket'>('invite');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !invite) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 65,
        origin: { y: 0.75 },
        colors: ['#12C061', '#E87A72', '#FFFFFF', '#FAB205'],
      });
    } catch {
      // Fallback silencioso
    }
  };

  // Confirmación de evento privado
  const handleConfirmPrivate = async () => {
    triggerConfetti();
    setHasConfirmed(true);
    setCurrentView('ticket');
    showToast('¡Asistencia confirmada! Pase QR generado');

    const currentUserId = auth.currentUser?.uid || 'guest_' + Date.now();
    const currentUserName = auth.currentUser?.displayName || 'Invitado #' + currentUserId.slice(-4).toUpperCase();

    // Sincronización en tiempo real con Firestore
    confirmInviteInFirestore(invite.id, {
      userId: currentUserId,
      userName: currentUserName,
      withPlusOne: plusOneSelected,
    }).catch((err) => {
      console.warn('[+1 Firestore] Sync invite error:', err);
    });

    try {
      await addDoc(collection(db, 'passes'), {
        eventId: invite.id,
        eventTitle: invite.title,
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: auth.currentUser?.photoURL || null,
        withPlusOne: plusOneSelected,
        status: 'active',
        requestedAt: Date.now(),
        approvedAt: Date.now(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Error guardando pase activo en passes:', err);
    }
  };

  // Solicitud VIP para evento público
  const handleRequestVip = async () => {
    triggerConfetti();
    setHasRequestedVip(true);
    showToast('Solicitud enviada al anfitrión');

    try {
      const currentUserId = auth.currentUser?.uid || 'guest_' + Date.now();
      const currentUserName = auth.currentUser?.displayName || 'Invitado #' + currentUserId.slice(-4).toUpperCase();
      await addDoc(collection(db, 'passes'), {
        eventId: invite.id,
        eventTitle: invite.title,
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: auth.currentUser?.photoURL || null,
        withPlusOne: plusOneSelected,
        status: 'pending',
        requestedAt: Date.now(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Error enviando solicitud VIP a passes:', err);
    }
  };

  // Descargar/Guardar en fotos
  const handleSaveToPhotos = () => {
    showToast('Pase guardado en Fotos');
  };

  // Añadir a calendario (.ics)
  const handleAddToCalendar = () => {
    try {
      const icsData = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PlusOne App//Event Invite//ES',
        'BEGIN:VEVENT',
        `SUMMARY:${invite.title}`,
        `DESCRIPTION:${invite.description || 'Pase oficial +1'}`,
        `LOCATION:${invite.exactAddress || invite.venueName}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invite.id}-invitacion.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Evento añadido al calendario');
    } catch {
      showToast('No se pudo generar archivo de calendario');
    }
  };

  const handleGoToWallet = () => {
    onClose();
    if (onNavigate) {
      onNavigate('/tickets');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none">
      {/* Fondo ambiental sutil */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20 bg-cover bg-center"
        style={{ backgroundImage: "url('./assets/images/fondo_iniciob.webp')" }}
      />

      {/* Tarjeta Principal Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-md max-h-[92vh] bg-[#16171B] border-[1.5px] border-[#26282E] rounded-3xl flex flex-col overflow-hidden shadow-2xl text-white font-sans"
      >
        {/* HEADER / FLYER CON BOTÓN DE CIERRE FLOTANTE */}
        <div className="relative w-full h-44 sm:h-48 flex-shrink-0 bg-neutral-900 overflow-hidden">
          {invite.flyerImage ? (
            <img
              src={invite.flyerImage}
              alt={invite.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1F222A] via-[#16171B] to-[#0A0C0E] flex items-center justify-center">
              <span className="text-5xl">🎉</span>
            </div>
          )}

          {/* Degradado inferior para transición suave al cuerpo */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#16171B] via-transparent to-black/60 pointer-events-none" />

          {/* Badge de tipo de invitación flotante */}
          <div className="absolute top-3.5 left-4 z-10">
            {invite.isPrivate ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-[#E87A72]/40 text-[#E87A72] text-[11px] font-display font-extrabold uppercase tracking-wider">
                <span>🔒</span>
                <span>FIESTA PRIVADA</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-[#12C061]/40 text-[#12C061] text-[11px] font-display font-extrabold uppercase tracking-wider">
                <span>🌐</span>
                <span>EVENTO PÚBLICO</span>
              </span>
            )}
          </div>

          {/* Botón flotante de cierre ✕ */}
          <button
            onClick={onClose}
            aria-label="Cerrar invitación"
            className="absolute top-3.5 right-4 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:text-white transition-transform active:scale-90 focus:outline-none"
          >
            <span className="text-sm font-bold leading-none">✕</span>
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL CON SCROLL VERTICAL */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {currentView === 'invite' ? (
            <>
              {/* 1. TÍTULO Y BADGE DEL ANFITRIÓN */}
              <div className="space-y-1">
                <div className="inline-block">
                  {invite.isPrivate ? (
                    <span className="text-[11px] font-display font-black tracking-widest text-[#E87A72] uppercase">
                      INVITACIÓN PRIVADA POR {invite.hostName}
                    </span>
                  ) : (
                    <span className="text-[11px] font-display font-black tracking-widest text-[#12C061] uppercase">
                      EVENTO PÚBLICO · LISTA VIP {invite.hostName}
                    </span>
                  )}
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight uppercase leading-tight text-white">
                  {invite.title}
                </h2>
                {invite.subtitle && (
                  <p className="font-sans text-xs text-neutral-400 font-medium">
                    {invite.subtitle}
                  </p>
                )}
              </div>

              {/* 2. BLOQUE DE FECHA Y HORA */}
              <div className="bg-[#1C1E24] border border-[#2A2D35] rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0 text-lg">
                  📅
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm sm:text-base font-black uppercase text-white tracking-wide truncate">
                    {invite.dateDisplay}
                  </p>
                  <p className="font-sans text-xs text-neutral-400 font-semibold tracking-wider">
                    {invite.timeRange}
                  </p>
                </div>
              </div>

              {/* 3. UBICACIÓN (DINÁMICA PÚBLICA / PRIVADA) */}
              <div className="bg-[#1C1E24] border border-[#2A2D35] rounded-2xl p-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0 text-lg mt-0.5">
                  📍
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm sm:text-base font-black uppercase text-white tracking-wide truncate">
                    {invite.venueName}
                  </p>

                  {invite.isPrivate ? (
                    hasConfirmed ? (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1"
                      >
                        <span className="text-[11px] font-bold text-[#12C061] flex items-center gap-1">
                          <span>🔓 Dirección desbloqueada:</span>
                        </span>
                        <p className="font-sans text-xs text-neutral-200 mt-0.5 font-medium leading-relaxed">
                          {invite.exactAddress}
                        </p>
                      </motion.div>
                    ) : (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
                        <span>🔒</span>
                        <span className="italic">
                          Dirección exacta visible tras confirmar asistencia
                        </span>
                      </div>
                    )
                  ) : (
                    <p className="font-sans text-xs text-neutral-400 mt-0.5 font-medium leading-relaxed">
                      {invite.exactAddress || 'Dirección disponible en puerta'}
                    </p>
                  )}
                </div>
              </div>

              {/* 4. SOCIAL WALL: AMIGOS CONFIRMADOS */}
              <div className="bg-[#1C1E24] border border-[#2A2D35] rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* Fila de Avatares superpuestos */}
                  <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
                    {invite.confirmedAvatars && invite.confirmedAvatars.length > 0 ? (
                      invite.confirmedAvatars.slice(0, 4).map((avatar, idx) => (
                        <img
                          key={idx}
                          src={avatar}
                          alt="Asistente confirmado"
                          className="inline-block w-7 h-7 rounded-full ring-2 ring-[#1C1E24] object-cover bg-neutral-800"
                        />
                      ))
                    ) : (
                      <>
                        <div className="w-7 h-7 rounded-full ring-2 ring-[#1C1E24] bg-neutral-700 flex items-center justify-center text-[10px]">
                          👤
                        </div>
                        <div className="w-7 h-7 rounded-full ring-2 ring-[#1C1E24] bg-neutral-600 flex items-center justify-center text-[10px]">
                          👤
                        </div>
                      </>
                    )}
                  </div>
                  <span className="font-sans text-xs font-semibold text-neutral-300">
                    {invite.confirmedCount + (hasConfirmed ? 1 : 0)} amigos confirmados
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-400 font-mono">
                  LISTA ACTIVA
                </span>
              </div>

              {/* DESCRIPCIÓN */}
              {invite.description && (
                <p className="font-sans text-xs text-neutral-400 leading-relaxed px-1">
                  {invite.description}
                </p>
              )}

              {/* 5. SELECTOR DE ACOMPAÑANTE (+1) */}
              {invite.allowsPlusOne && (
                <div className="space-y-2 pt-1">
                  <label className="block text-[11px] font-display font-extrabold uppercase tracking-wider text-neutral-400">
                    ACOMPAÑANTE (+1)
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#101114] rounded-2xl border border-[#26282E]">
                    {/* Opción 1: Solo yo */}
                    <button
                      type="button"
                      onClick={() => setPlusOneSelected(false)}
                      className={`py-2.5 px-3 rounded-xl font-display text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        !plusOneSelected
                          ? 'bg-neutral-800 text-white shadow-md border border-neutral-700'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>👤</span>
                      <span>SOLO YO</span>
                    </button>

                    {/* Opción 2: Voy con mi +1 */}
                    <button
                      type="button"
                      onClick={() => setPlusOneSelected(true)}
                      className={`py-2.5 px-3 rounded-xl font-display text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        plusOneSelected
                          ? 'bg-[#12C061] text-black shadow-lg shadow-[#12C061]/20 border border-[#12C061]'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>👥</span>
                      <span>VOY CON MI +1</span>
                    </button>
                  </div>

                  {/* Nota explicativa de capacidad */}
                  <p className="text-[11px] font-sans font-medium text-center">
                    {plusOneSelected ? (
                      <span className="text-[#12C061] font-semibold">
                        ✨ Tu pase QR habilitará 2 ingresos en puerta.
                      </span>
                    ) : (
                      <span className="text-neutral-400">
                        Tu pase QR será válido para 1 ingreso individual.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* VISTA DEL TICKET DIGITAL CON QR */
            <div className="py-2 space-y-4">
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={() => setCurrentView('invite')}
                  className="text-xs font-display font-bold text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <span>←</span>
                  <span>DETALLES DEL EVENTO</span>
                </button>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#12C061]/20 text-[#12C061] font-bold border border-[#12C061]/30">
                  PASE ACTIVO
                </span>
              </div>

              {/* TICKET CARD EMBEBIDO */}
              <div className="flex justify-center">
                <TicketShape>
                  {/* Cabecera del ticket */}
                  <div className="flex flex-col items-center justify-center text-center pt-2">
                    <span className="font-sans text-neutral-400 text-xs font-bold tracking-widest leading-none mb-1 uppercase">
                      {invite.isPrivate ? 'FIESTA PRIVADA' : 'LISTA VIP'}
                    </span>
                    <h3 className="font-display text-white text-2xl sm:text-3xl font-black tracking-tight leading-none uppercase truncate max-w-[240px]">
                      {invite.title}
                    </h3>
                  </div>

                  {/* Visor QR con esquinas en verde esmeralda */}
                  <div className="flex items-center justify-center my-3 relative">
                    <div className="relative w-[180px] h-[180px] sm:w-[190px] sm:h-[190px] flex items-center justify-center p-2.5">
                      {/* Esquinas verde esmeralda */}
                      <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-[#12C061] rounded-tl-lg pointer-events-none" />
                      <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-[#12C061] rounded-tr-lg pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-[#12C061] rounded-bl-lg pointer-events-none" />
                      <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-[#12C061] rounded-br-lg pointer-events-none" />

                      {/* SVG QR CODE */}
                      <div className="w-[150px] h-[150px] sm:w-[160px] sm:h-[160px] flex items-center justify-center p-1 rounded-md overflow-hidden bg-[#0A0C0E]">
                        <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                          {/* Ojo Superior Izquierdo */}
                          <rect x="5" y="5" width="28" height="28" rx="2" fill="currentColor" />
                          <rect x="9" y="9" width="20" height="20" fill="#0A0C0E" />
                          <rect x="13" y="13" width="12" height="12" rx="1" fill="currentColor" />

                          {/* Ojo Superior Derecho */}
                          <rect x="67" y="5" width="28" height="28" rx="2" fill="currentColor" />
                          <rect x="71" y="9" width="20" height="20" fill="#0A0C0E" />
                          <rect x="75" y="13" width="12" height="12" rx="1" fill="currentColor" />

                          {/* Ojo Inferior Izquierdo */}
                          <rect x="5" y="67" width="28" height="28" rx="2" fill="currentColor" />
                          <rect x="9" y="71" width="20" height="20" fill="#0A0C0E" />
                          <rect x="13" y="75" width="12" height="12" rx="1" fill="currentColor" />

                          {/* Módulos de datos */}
                          <rect x="38" y="6" width="6" height="6" fill="currentColor" />
                          <rect x="48" y="6" width="12" height="6" fill="currentColor" />
                          <rect x="38" y="16" width="6" height="12" fill="currentColor" />
                          <rect x="54" y="16" width="6" height="6" fill="currentColor" />
                          <rect x="48" y="26" width="12" height="6" fill="currentColor" />
                          <rect x="6" y="38" width="12" height="6" fill="currentColor" />
                          <rect x="22" y="38" width="6" height="6" fill="currentColor" />
                          <rect x="32" y="38" width="18" height="6" fill="currentColor" />
                          <rect x="56" y="38" width="12" height="6" fill="currentColor" />
                          <rect x="74" y="38" width="6" height="12" fill="currentColor" />
                          <rect x="86" y="38" width="8" height="6" fill="currentColor" />
                          <rect x="16" y="48" width="12" height="6" fill="currentColor" />
                          <rect x="34" y="48" width="6" height="18" fill="currentColor" />
                          <rect x="46" y="48" width="14" height="6" fill="currentColor" />
                          <rect x="66" y="48" width="8" height="6" fill="currentColor" />
                          <rect x="80" y="48" width="14" height="6" fill="currentColor" />
                          <rect x="6" y="58" width="6" height="6" fill="currentColor" />
                          <rect x="16" y="58" width="12" height="6" fill="currentColor" />
                          <rect x="46" y="58" width="6" height="12" fill="currentColor" />
                          <rect x="58" y="58" width="16" height="6" fill="currentColor" />
                          <rect x="86" y="58" width="8" height="12" fill="currentColor" />
                          <rect x="38" y="70" width="8" height="6" fill="currentColor" />
                          <rect x="52" y="70" width="12" height="6" fill="currentColor" />
                          <rect x="70" y="70" width="6" height="12" fill="currentColor" />
                          <rect x="82" y="70" width="12" height="6" fill="currentColor" />
                          <rect x="38" y="80" width="18" height="6" fill="currentColor" />
                          <rect x="62" y="80" width="8" height="14" fill="currentColor" />
                          <rect x="76" y="86" width="18" height="8" fill="currentColor" />
                          <rect x="44" y="90" width="12" height="5" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Titular e información de acceso */}
                  <div className="flex flex-col items-center justify-center text-center pb-2">
                    <h4 className="font-display text-white text-lg sm:text-xl font-black tracking-wide uppercase leading-tight">
                      CRIS G. · {plusOneSelected ? '+1 INCLUIDO (2 INGRESOS)' : 'ADMISIÓN INDIVIDUAL'}
                    </h4>
                    <p className="font-sans text-neutral-400 text-xs font-semibold tracking-wider uppercase mt-0.5">
                      ID: #INV-{invite.id.slice(0, 4).toUpperCase()} · LISTA PUERTA
                    </p>
                  </div>
                </TicketShape>
              </div>

              {/* Dirección Revelada Destacada */}
              {invite.exactAddress && (
                <div className="bg-[#1C1E24] border border-[#12C061]/30 rounded-2xl p-3 flex items-start gap-2.5">
                  <span className="text-base">📍</span>
                  <div className="text-xs">
                    <span className="text-[#12C061] font-bold block uppercase tracking-wider">
                      Dirección exacta confirmada:
                    </span>
                    <span className="text-neutral-200 mt-0.5 block font-medium">
                      {invite.exactAddress}
                    </span>
                  </div>
                </div>
              )}

              {/* Botones de acción del ticket */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveToPhotos}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-black font-display text-xs sm:text-sm font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
                >
                  <span>📸</span>
                  <span>GUARDAR COPIA EN FOTOS</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleAddToCalendar}
                    className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-display text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors border border-neutral-700"
                  >
                    <span>📅</span>
                    <span>CALENDARIO</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToWallet}
                    className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-[#12C061] font-display text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors border border-neutral-700"
                  >
                    <span>🎟️</span>
                    <span>VER EN BILLETERA</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER CON BOTÓN DE ACCIÓN (SOLO EN MODO INVITE) */}
        {currentView === 'invite' && (
          <div className="p-4 bg-[#16171B] border-t border-[#26282E]">
            {invite.isPrivate ? (
              hasConfirmed ? (
                <button
                  type="button"
                  onClick={() => setCurrentView('ticket')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#12C061] hover:bg-[#10a855] text-black font-display text-sm sm:text-base font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-[#12C061]/25"
                >
                  <span>🎟️</span>
                  <span>VER MI PASE QR CONFIRMADO</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmPrivate}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#12C061] hover:bg-[#10a855] text-black font-display text-sm sm:text-base font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-[#12C061]/25"
                >
                  <span>🎟️</span>
                  <span>ACEPTAR INVITACIÓN Y GENERAR QR</span>
                </button>
              )
            ) : hasRequestedVip ? (
              <div className="text-center space-y-1">
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-2xl bg-neutral-800/80 text-neutral-400 font-display text-xs sm:text-sm font-black tracking-wider uppercase flex items-center justify-center gap-2 border border-neutral-700 cursor-default"
                >
                  <span>⏳</span>
                  <span>SOLICITUD ENVIADA AL ANFITRIÓN (PENDIENTE)</span>
                </button>
                <p className="text-[11px] font-sans text-neutral-400">
                  Te notificaremos cuando el club apruebe tu cupo VIP.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRequestVip}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#E87A72] hover:bg-[#d66f67] text-white font-display text-sm sm:text-base font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-[#E87A72]/25"
              >
                <span>✨</span>
                <span>SOLICITAR PASE VIP</span>
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* TOAST FLOTANTE */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#12C061] text-black font-display text-xs font-black px-4 py-2.5 rounded-xl shadow-2xl tracking-wider uppercase z-[60] flex items-center gap-1.5"
          >
            <span>✓</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventInviteModal;
