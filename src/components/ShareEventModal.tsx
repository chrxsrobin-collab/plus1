import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateStoryImage, StoryEventData } from '../lib/generateStoryImage';
import { formatCardDate } from '../lib/dateUtils';

export interface ShareEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: StoryEventData;
  isNewlyCreated?: boolean;
  onNavigateHome?: () => void;
}

export const ShareEventModal: React.FC<ShareEventModalProps> = ({
  isOpen,
  onClose,
  event,
  isNewlyCreated = false,
  onNavigateHome,
}) => {
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}#/e/${event.id || ''}`;
  const formattedDate = formatCardDate(event.dateDisplay || event.date) || 'Próximamente';
  const formattedText = `¡Mira este plan en +1!\n🔥 ${event.title}\n📅 ${formattedDate} · ${event.timeRange || event.startTime || '22:00'}\n📍 ${event.location || event.exactAddress || 'Por confirmar'}\n\nRevisa los detalles y pide tu pase aquí:\n${shareUrl}`;

  // Botón 1: Difusión en WhatsApp
  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(formattedText)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Botón 2: Generar Historia para Instagram (Canvas 9:16)
  const handleGenerateStory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGeneratingStory) return;
    setIsGeneratingStory(true);

    try {
      const result = await generateStoryImage(event, shareUrl);
      if (result.success) {
        showToast(result.message);
      } else {
        showToast('Error al generar la historia. Intenta nuevamente.');
      }
    } catch (err) {
      console.error('Error generando historia de Instagram:', err);
      showToast('No se pudo generar la historia');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // Acción adicional: Copiar enlace al portapapeles
  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('¡Enlace copiado al portapapeles!');
    } catch {
      // Fallback clásico
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showToast('¡Enlace copiado al portapapeles!');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-5 select-none overflow-hidden">
          {/* Fondo desenfocado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Tarjeta del Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-[#16171B] border border-[#E87A72] rounded-[28px] p-5 sm:p-6 text-center shadow-2xl z-10 flex flex-col"
          >
            {/* Botón de cierre superior derecho */}
            <button
              onClick={onClose}
              aria-label="Cerrar modal de compartir"
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white flex items-center justify-center text-sm z-20 border border-neutral-700/60 focus:outline-none transition-colors cursor-pointer"
            >
              ✕
            </button>

            {/* Badge de encabezado */}
            <div className="mb-2">
              {isNewlyCreated ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#12C061]/15 border border-[#12C061]/35">
                  <span className="font-display text-[#12C061] text-xs font-black tracking-wider uppercase">
                    ✦ EVENTO PUBLICADO CON ÉXITO
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E87A72]/15 border border-[#E87A72]/35">
                  <span className="font-display text-[#E87A72] text-xs font-black tracking-wider uppercase">
                    DIFUSIÓN DEL EVENTO
                  </span>
                </div>
              )}
            </div>

            {/* Flyer / Miniatura del evento */}
            <div className="relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden my-3 border border-white/10 bg-[#121316] shadow-md flex-shrink-0">
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1F2228] to-[#121316] flex flex-col items-center justify-center p-4 text-center">
                  <span className="text-3xl mb-1">🎫</span>
                  <span className="font-display text-sm text-white font-bold uppercase tracking-wider">
                    {event.title}
                  </span>
                </div>
              )}
            </div>

            {/* Título y Metadatos breves */}
            <h3 className="font-display text-white text-xl sm:text-2xl font-black tracking-tight uppercase leading-tight line-clamp-2 mt-1 mb-1">
              {event.title}
            </h3>
            <p className="font-sans text-xs text-[#9CA3AF] mb-5 flex items-center justify-center gap-1.5 flex-wrap">
              <span>📅 {formattedDate}</span>
              <span>·</span>
              <span>⏰ {event.timeRange || event.startTime || '22:00'}</span>
              <span>·</span>
              <span className="truncate max-w-[130px]">📍 {event.location || event.exactAddress || 'Por definir'}</span>
            </p>

            {/* ACCIONES DE DIFUSIÓN DE ALTO IMPACTO */}
            <div className="flex flex-col gap-2.5">
              {/* Botón 1: WhatsApp */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#16171B] hover:bg-[#1E2025] border border-[#12C061] text-white font-sans font-semibold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">💬</span>
                <span>ENVIAR A GRUPO DE WHATSAPP</span>
              </button>

              {/* Botón 2: Instagram Stories (Canvas 9:16) */}
              <button
                type="button"
                onClick={handleGenerateStory}
                disabled={isGeneratingStory}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#16171B] hover:bg-[#1E2025] border border-[#E87A72] text-white font-sans font-semibold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-wait group"
              >
                {isGeneratingStory ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-[#E87A72] border-t-transparent animate-spin" />
                    <span className="font-display tracking-wider text-xs uppercase">GENERANDO STORY 9:16...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base group-hover:scale-110 transition-transform">📸</span>
                    <span>GENERAR HISTORIA PARA INSTAGRAM</span>
                  </>
                )}
              </button>

              {/* Botón 3: Copiar Enlace Directo */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-3 rounded-xl bg-[#1F2228]/80 hover:bg-[#26282E] border border-white/10 text-neutral-300 font-sans text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-98 cursor-pointer"
              >
                <span>🔗</span>
                <span>Copiar Enlace Directo</span>
              </button>

              {/* Botón Secundario si es recién creado: Retorno */}
              {isNewlyCreated && onNavigateHome && (
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="mt-1 py-2 text-neutral-500 hover:text-white font-sans text-xs tracking-wider uppercase transition-colors cursor-pointer"
                >
                  IR AL INICIO
                </button>
              )}
            </div>

            {/* Toast flotante */}
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#E87A72] text-black font-display text-xs font-black px-4 py-2 rounded-xl shadow-2xl tracking-wider uppercase z-50 whitespace-nowrap pointer-events-none max-w-[90%]"
              >
                {toastMessage}
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShareEventModal;
