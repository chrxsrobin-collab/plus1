import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PassItem } from '../types/home';
import { TicketsCoverFlow } from '../components/TicketsCoverFlow';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDoc, doc, getDocs } from 'firebase/firestore';
import { PullToRefresh } from '../components/PullToRefresh';
import '../styles/fonts.css';

export interface TicketsScreenProps {
  tickets?: PassItem[];
  initialPassId?: string;
  initialIndex?: number;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
}

export const TicketsScreen: React.FC<TicketsScreenProps> = ({
  tickets: propTickets = [],
  initialPassId,
  initialIndex = 0,
  onBack,
  onNavigate,
}) => {
  const [userPasses, setUserPasses] = useState<PassItem[]>(() => {
    return (propTickets || []).filter((t) => t.status === 'active');
  });
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Consulta reactiva estricta a Firestore: Solo pases con status == 'active'
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'passes'),
      where('userId', '==', auth.currentUser.uid),
      where('status', '==', 'active') // Solo pases aprobados
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activePasses: PassItem[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            const rawHolderName = (
              data.rawHolderName ||
              data.userName ||
              data.holderName ||
              auth.currentUser?.displayName ||
              'INVITADO'
            )
              .replace(/\s*·\s*(\+1(\s*INCLUIDO)?|INDIVIDUAL)$/i, '')
              .trim();

            const allowsPlusOne = Boolean(
              data.allowsPlusOne ??
                data.withPlusOne ??
                data.allowPlusOne ??
                false
            );

            const eventImg =
              data.eventImageUrl ||
              data.imageUrl ||
              data.artImage ||
              data.flyerImage ||
              '';

            const eventName = data.eventTitle || data.title || 'EVENTO +1';

            return {
              id: d.id,
              eventId: data.eventId,
              eventTitle: eventName,
              eventImageUrl: eventImg,
              title: eventName,
              emoji: '',
              dateStr: data.eventDate || data.dateStr || 'PRÓXIMAMENTE',
              timeStr: data.eventTime || data.timeStr || '22:00',
              location: data.eventLocation || data.location || 'CLUB OFICIAL +1',
              status: 'active' as const,
              statusText: 'PASE ACTIVO',
              companionsCount: allowsPlusOne ? 1 : 0,
              allowsPlusOne,
              withPlusOne: allowsPlusOne,
              accentBorderColor: '#12C061',
              holderName: rawHolderName,
              listType: 'VIP',
              ticketId: '#' + d.id.slice(0, 5).toUpperCase(),
              verifiedProvider: 'VERIFICADO CON GOOGLE',
              feedbackMessage: data.feedbackMessage,
              imageUrl: eventImg,
              qrCodeValue: data.qrCodeValue || d.id,
            };
          })
          .filter((p) => p.status === 'active'); // Regla estricta: solo active

        setUserPasses(activePasses);

        // Auto-resolución en segundo plano si algún pase no tenía flyer guardado
        activePasses.forEach(async (pass) => {
          if (!pass.eventImageUrl && pass.eventId) {
            try {
              const evSnap = await getDoc(doc(db, 'events', pass.eventId));
              if (evSnap.exists()) {
                const evData = evSnap.data();
                const flyerUrl =
                  evData.imageUrl || evData.artImage || evData.flyerImage || '';
                if (flyerUrl) {
                  setUserPasses((prev) =>
                    prev.map((p) =>
                      p.id === pass.id
                        ? { ...p, eventImageUrl: flyerUrl, imageUrl: flyerUrl }
                        : p
                    )
                  );
                }
              }
            } catch {
              // flyer resolution fallback
            }
          }
        });
      },
      () => {}
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Si propTickets cambia externamente, filtrar estrictamente activos
  useEffect(() => {
    if (propTickets && propTickets.length > 0) {
      const filtered = propTickets.filter((t) => t.status === 'active');
      if (filtered.length > 0) {
        setUserPasses(filtered);
      }
    }
  }, [propTickets]);

  // Si se pasa un passId específico, auto-enfocar ese ticket en el carrusel
  useEffect(() => {
    if (initialPassId && userPasses.length > 0) {
      const idx = userPasses.findIndex(
        (t) => t.id === initialPassId || t.eventId === initialPassId
      );
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [initialPassId, userPasses]);

  // Asegurar que el índice no supere el límite de pases disponibles
  useEffect(() => {
    if (currentIndex >= userPasses.length && userPasses.length > 0) {
      setCurrentIndex(userPasses.length - 1);
    }
  }, [userPasses.length, currentIndex]);

  const tickets = userPasses;
  const activeTicket = tickets[currentIndex] || tickets[0] || null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('/');
    }
  };

  const handleDownloadCopy = () => {
    if (!activeTicket) return;
    showToast(`Pase de "${activeTicket.title}" guardado en Fotos ✓`);
  };

  const handleRefresh = async () => {
    try {
      if (auth.currentUser) {
        const q = query(
          collection(db, 'passes'),
          where('userId', '==', auth.currentUser.uid),
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        const refreshedPasses: PassItem[] = snap.docs.map((d) => {
          const data = d.data();
          const rawHolderName = (
            data.rawHolderName ||
            data.userName ||
            data.holderName ||
            auth.currentUser?.displayName ||
            'INVITADO'
          )
            .replace(/\s*·\s*(\+1(\s*INCLUIDO)?|INDIVIDUAL)$/i, '')
            .trim();

          const allowsPlusOne = Boolean(
            data.allowsPlusOne ??
              data.withPlusOne ??
              data.allowPlusOne ??
              false
          );

          return {
            id: d.id,
            eventId: data.eventId || '',
            eventName: data.eventName || data.eventTitle || 'EVENTO +1',
            eventDate: data.eventDate || 'PRÓXIMAMENTE',
            eventTime: data.eventTime || data.timeRange || '22:00',
            eventLocation: data.eventLocation || data.location || 'UBICACIÓN RESERVADA',
            holderName: rawHolderName,
            status: data.status || 'active',
            qrCodeData: data.qrCodeData || data.qrCode || `PLUS1-PASS-${d.id}`,
            ticketType: allowsPlusOne ? '+1 VIP PASS' : 'VIP PASS INDIVIDUAL',
            allowsPlusOne,
            imageUrl: data.imageUrl || data.eventImage || undefined,
            checkInCode: data.checkInCode || d.id.slice(0, 6).toUpperCase(),
          };
        });
        setUserPasses(refreshedPasses);
      }
      showToast('Pases actualizados');
    } catch (err) {
      console.error('[TicketsScreen] Error al refrescar:', err);
    }
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#000000] text-white flex flex-col justify-between overflow-x-hidden font-sans select-none p-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      {/* Fondo abstracto con textura sutil fondo_iniciob.webp */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-cover bg-center"
        style={{
          backgroundImage: "url('./assets/images/fondo_iniciob.webp')",
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      />

      {/* Degradado superior para HUD */}
      <div className="fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-[#000000] via-[#000000]/70 to-transparent pointer-events-none z-10" />

      {/* Contenedor central móvil acotado con Pull-to-Refresh */}
      <PullToRefresh
        onRefresh={handleRefresh}
        className="relative z-20 flex-1 flex flex-col w-full max-w-md mx-auto px-4 justify-between"
      >
        {/* 1. TOP BAR */}
        <header className="flex items-center justify-between pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-1 w-full relative z-30">
          {/* Botón de retroceso (←) */}
          <button
            onClick={handleBack}
            aria-label="Regresar a inicio"
            className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 focus:outline-none cursor-pointer"
          >
            <span className="text-xl font-bold leading-none">←</span>
          </button>

          {/* Título central e indicador de cantidad de pases activos */}
          <div className="flex flex-col items-center justify-center text-center">
            <h1 className="font-display text-white text-xl sm:text-2xl font-black tracking-wide uppercase leading-none">
              MIS TICKETS
            </h1>
            <span className="font-sans text-[11px] text-[#8E8E93] tracking-wider uppercase font-semibold mt-0.5">
              {userPasses.length} {userPasses.length === 1 ? 'PASE ACTIVO' : 'PASES ACTIVOS'}
            </span>
          </div>

          {/* Espaciador simétrico */}
          <div className="w-10 h-10" />
        </header>

        {/* 2. CARRUSEL 3D COVER FLOW O ESTADO VACÍO */}
        {userPasses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[340px] sm:max-w-[360px] bg-[#16171B] border border-[#26282E] rounded-[28px] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl select-none mx-auto my-auto"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#1A1C22] border border-white/10 flex items-center justify-center text-3xl mb-4 shadow-inner">
              🎟️
            </div>
            <h3 className="font-display text-white text-lg sm:text-xl font-bold uppercase tracking-wide leading-tight mb-2">
              NO TIENES PASES ACTIVOS
            </h3>
            <p className="font-sans text-[#9CA3AF] text-xs sm:text-sm leading-relaxed max-w-[280px] mb-6">
              Cuando un anfitrión apruebe tu solicitud VIP o confirmes asistencia a un evento, tu ticket QR aparecerá aquí listo para entrar.
            </p>
            <button
              onClick={() => (onNavigate ? onNavigate('/') : onBack?.())}
              className="py-3 px-6 rounded-2xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display font-black text-xs sm:text-sm tracking-wider uppercase transition-transform active:scale-95 shadow-lg shadow-[#E87A72]/20 cursor-pointer flex items-center space-x-2"
            >
              <span>EXPLORAR EVENTOS</span>
              <span>🔍</span>
            </button>
          </motion.div>
        ) : (
          <>
            <main className="flex-1 flex flex-col items-center justify-center my-auto py-1">
              <TicketsCoverFlow
                tickets={tickets}
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
                onSelectTicket={(ticket) => {
                  showToast(`Ticket seleccionado: ${ticket.title}`);
                }}
              />

              {/* 3. PAGINADOR DE PUNTOS (DOTS) */}
              <div className="flex items-center justify-center space-x-2 pt-2 pb-1 select-none">
                {tickets.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    aria-label={`Ver ticket ${i + 1}`}
                    className={`transition-all duration-300 rounded-full focus:outline-none ${
                      i === currentIndex
                        ? 'w-6 h-1.5 bg-[#E87A72]'
                        : 'w-1.5 h-1.5 bg-neutral-700 hover:bg-neutral-500'
                    }`}
                  />
                ))}
              </div>
            </main>

            {/* 4. ACCIÓN INFERIOR: GUARDAR COPIA EN FOTOS */}
            <div className="w-full pt-2 pb-2 flex justify-center">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadCopy}
                className="w-full max-w-[340px] py-3.5 px-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-display text-sm sm:text-base font-black tracking-wider uppercase flex items-center justify-center space-x-2 transition-colors shadow-2xl focus:outline-none cursor-pointer mb-2"
              >
                <span className="text-lg leading-none">⬇</span>
                <span>GUARDAR COPIA EN FOTOS</span>
              </motion.button>
            </div>
          </>
        )}
      </PullToRefresh>

      {/* TOAST FLOTANTE */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#E87A72] text-black font-display text-xs font-black px-4 py-2.5 rounded-xl shadow-2xl tracking-wider uppercase z-50 whitespace-nowrap"
        >
          {toastMessage}
        </motion.div>
      )}
    </div>
  );
};

export default TicketsScreen;
