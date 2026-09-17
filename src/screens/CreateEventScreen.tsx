import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CreateEventFormData } from '../types/home';
import '../styles/fonts.css';

export interface CreateEventScreenProps {
  onBack?: () => void;
  onNavigate?: (route: string) => void;
}

export const CreateEventScreen: React.FC<CreateEventScreenProps> = ({
  onBack,
  onNavigate,
}) => {
  // Estado del formulario
  const [formData, setFormData] = useState<CreateEventFormData>({
    artImage: './assets/images/pantalla_crear_evento.webp',
    name: '',
    startDate: '2026-09-20',
    startTime: '21:00',
    endDate: '2026-09-21',
    endTime: '04:30',
    location: '',
    privacy: 'public',
    allowPlusOne: true,
    maxCapacity: 150,
  });

  // Estado de publicación y modales
  const [isPublished, setIsPublished] = useState(false);
  const [isBestPracticesOpen, setIsBestPracticesOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('/');
    } else {
      console.log('[Navigation] -> Back to Home');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, artImage: imageUrl }));
      showToast('Arte de evento cargado');
    }
  };

  const handleCapacityChange = (delta: number) => {
    setFormData((prev) => {
      const next = prev.maxCapacity + delta;
      return {
        ...prev,
        maxCapacity: Math.min(150, Math.max(1, next)),
      };
    });
  };

  const handlePublish = () => {
    if (isPublished) {
      showToast('El evento ya fue publicado');
      return;
    }

    // Microinteracción con confeti de partículas brillantes
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#12C061', '#E87A72', '#FAB205', '#FFFFFF'],
      });
    } catch {
      // Fallback silencioso si confetti no está disponible
    }

    setIsPublished(true);
    showToast('¡Evento publicado con éxito!');
  };

  const handleShare = () => {
    if (!isPublished) return;

    if (navigator.share) {
      navigator
        .share({
          title: formData.name || 'Nuevo Evento +1',
          text: `¡Únete a mi evento en +1! ${formData.location ? 'en ' + formData.location : ''}`,
          url: window.location.href,
        })
        .catch(() => {
          showToast('Enlace copiado al portapapeles');
        });
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Enlace copiado al portapapeles');
    }
  };

  return (
    <div
      className="relative w-full min-h-[100dvh] bg-[#000000] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden font-sans select-none pb-[calc(7rem+env(safe-area-inset-bottom,0px))]"
      style={{
        backgroundImage: "url('./assets/images/fondo_c.webp')",
        backgroundSize: '100% auto',
        backgroundRepeat: 'repeat-y',
        backgroundPosition: 'top center',
        backgroundAttachment: 'local',
      }}
    >
      {/* Degradado superior sutil para navegación */}
      <div className="fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-[#000000] via-[#000000]/70 to-transparent pointer-events-none z-10" />

      {/* Contenedor central móvil acotado */}
      <div className="relative z-20 flex-1 flex flex-col w-full max-w-md mx-auto px-5">
        
        {/* 1. HEADER DE NAVEGACIÓN (TOP BAR) */}
        <header className="flex items-center justify-between pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3 w-full relative z-30">
          {/* Botón de retroceso: ← */}
          <button
            onClick={handleBack}
            aria-label="Regresar a inicio"
            className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 focus:outline-none"
          >
            <span className="text-xl font-bold leading-none">←</span>
          </button>

          {/* Título Clickeable: CREAR EVENTO (Abre Modal de Buenas Prácticas) */}
          <button
            onClick={() => setIsBestPracticesOpen(true)}
            className="flex items-center space-x-1.5 focus:outline-none group px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <h1 className="font-display text-white text-xl sm:text-2xl font-black tracking-wider uppercase">
              CREAR EVENTO
            </h1>
            <span className="text-neutral-500 group-hover:text-neutral-300 text-xs font-bold leading-none transition-colors">
              ⓘ
            </span>
          </button>

          {/* Botón de Compartir (Deshabilitado antes de publicar, iluminado tras publicar) */}
          <button
            onClick={handleShare}
            aria-label="Compartir evento"
            disabled={!isPublished}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all focus:outline-none ${
              isPublished
                ? 'bg-neutral-900 text-white border-neutral-700 hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-neutral-950 text-[#52525B] border-neutral-900 cursor-not-allowed pointer-events-none'
            }`}
          >
            <svg
              className="w-4 h-4 fill-none stroke-current"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </button>
        </header>

        {/* 2. FORMULARIO PRINCIPAL EN SCROLL */}
        <main className="flex-1 flex flex-col space-y-4 pt-2">
          
          {/* CAMPO 1: ARTE DEL EVENTO (UPLOADER CASI CUADRADO) */}
          <div className="flex flex-col items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-[#16171B] border-2 border-dashed border-[#26282E] hover:border-[#E87A72]/60 flex flex-col items-center justify-center cursor-pointer group transition-colors shadow-2xl"
            >
              {formData.artImage ? (
                <>
                  <img
                    src={formData.artImage}
                    alt="Arte del evento"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="font-display text-white text-xs font-black px-3 py-1.5 rounded-full bg-black/80 border border-neutral-700 uppercase tracking-wider">
                      CAMBIAR ARTE
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
                    🖼️
                  </div>
                  <span className="font-display text-white text-sm font-black uppercase tracking-wider">
                    SUBIR ARTE DEL EVENTO
                  </span>
                  <p className="font-sans text-neutral-400 text-xs mt-1">
                    Relación 1:1 o 9:16 · Máx 2MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CAMPO 2: NOMBRE DEL EVENTO */}
          <div className="space-y-1.5">
            <label className="font-display text-white text-xs font-bold tracking-wider uppercase block">
              NOMBRE DEL EVENTO
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. FIESTA DE PEPE ⚡"
              className="w-full h-12 px-4 rounded-xl bg-[#16171B] border border-[#26282E] focus:border-[#E87A72] text-white placeholder-[#8E8E93] font-sans text-sm outline-none transition-colors"
            />
          </div>

          {/* CAMPO 3: FECHA Y HORARIOS (2 COLUMNAS ALINEADAS CON LOS OTROS CAMPOS) */}
          <div className="w-full max-w-full min-w-0 grid grid-cols-2 gap-2.5 box-border">
            {/* Columna Inicio */}
            <div className="w-full min-w-0 max-w-full space-y-1.5 box-border">
              <label className="font-display text-white text-xs font-bold tracking-wider uppercase block truncate">
                INICIO
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full min-w-0 max-w-full h-11 px-2.5 rounded-xl bg-[#16171B] border border-[#26282E] focus:border-[#E87A72] text-white font-sans text-xs text-center outline-none transition-colors box-border"
              />
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full min-w-0 max-w-full h-11 px-2.5 rounded-xl bg-[#16171B] border border-[#26282E] focus:border-[#E87A72] text-white font-sans text-xs text-center outline-none transition-colors box-border"
              />
            </div>

            {/* Columna Fin */}
            <div className="w-full min-w-0 max-w-full space-y-1.5 box-border">
              <label className="font-display text-white text-xs font-bold tracking-wider uppercase block truncate">
                TÉRMINO
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full min-w-0 max-w-full h-11 px-2.5 rounded-xl bg-[#16171B] border border-[#26282E] focus:border-[#E87A72] text-white font-sans text-xs text-center outline-none transition-colors box-border"
              />
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full min-w-0 max-w-full h-11 px-2.5 rounded-xl bg-[#16171B] border border-[#26282E] focus:border-[#E87A72] text-white font-sans text-xs text-center outline-none transition-colors box-border"
              />
            </div>
          </div>

          {/* CAMPO 4: LUGAR / UBICACIÓN */}
          <div className="space-y-1.5">
            <label className="font-display text-white text-xs font-bold tracking-wider uppercase block">
              LUGAR / UBICACIÓN
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-neutral-500 text-sm pointer-events-none">
                📍
              </span>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Nombre del local, dirección o zona"
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-[#16171B] border border-[#26282E] focus:border-[#E87A72] text-white placeholder-[#8E8E93] font-sans text-sm outline-none transition-colors"
              />
            </div>
          </div>

          {/* CAMPO 5: PRIVACIDAD DEL EVENTO (SEGMENTED SELECTOR) */}
          <div className="space-y-1.5">
            <label className="font-display text-white text-xs font-bold tracking-wider uppercase block">
              PRIVACIDAD
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#16171B] border border-[#26282E]">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, privacy: 'public' })}
                className={`py-2 px-3 rounded-lg font-display text-xs font-black tracking-wider uppercase transition-all ${
                  formData.privacy === 'public'
                    ? 'bg-white text-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                PÚBLICO
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, privacy: 'private' })}
                className={`py-2 px-3 rounded-lg font-display text-xs font-black tracking-wider uppercase transition-all ${
                  formData.privacy === 'private'
                    ? 'bg-white text-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                PRIVADO
              </button>
            </div>
            <p className="font-sans text-neutral-400 text-xs px-1">
              {formData.privacy === 'public'
                ? 'Visible para todos los usuarios en la app y cartelera.'
                : 'Solo accesible mediante enlace de invitación directo.'}
            </p>
          </div>

          {/* CAMPO 6: MECÁNICA +1 Y CAPACIDAD MÁXIMA */}
          <div className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] space-y-3.5">
            {/* Switch Permitir +1 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display text-white text-sm font-black uppercase tracking-wide block">
                  PERMITIR +1 (ACOMPAÑANTE)
                </span>
                <span className="font-sans text-neutral-400 text-xs block mt-0.5">
                  Cada invitado confirmado puede registrar un acompañante
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => setFormData({ ...formData, allowPlusOne: !formData.allowPlusOne })}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none ${
                  formData.allowPlusOne ? 'bg-[#12C061]' : 'bg-neutral-800'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md ${
                    formData.allowPlusOne ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="h-px bg-neutral-800/80 w-full" />

            {/* Contador de Cupo Máximo */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display text-white text-xs font-bold tracking-wider uppercase block">
                  CUPO MÁXIMO (LÍMITE 150)
                </span>
                <span className="font-sans text-neutral-400 text-xs block mt-0.5">
                  Capacidad de admisión
                </span>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => handleCapacityChange(-5)}
                  className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white font-bold hover:bg-neutral-800 active:scale-90 transition-all focus:outline-none"
                >
                  -
                </button>
                <span className="font-display text-white text-lg font-black tracking-tight w-10 text-center">
                  {formData.maxCapacity}
                </span>
                <button
                  type="button"
                  onClick={() => handleCapacityChange(5)}
                  className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white font-bold hover:bg-neutral-800 active:scale-90 transition-all focus:outline-none"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 3. BOTÓN CTA "PUBLICAR EVENTO" */}
          <div className="pt-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handlePublish}
              className={`w-full py-4 px-5 rounded-2xl font-display text-[26px] font-black tracking-wider uppercase flex items-center justify-center transition-all shadow-xl focus:outline-none ${
                isPublished
                  ? 'bg-neutral-900 text-[#12C061] border border-[#12C061]'
                  : 'bg-[#12C061] hover:bg-[#0fa854] text-black active:scale-98'
              }`}
            >
              {isPublished ? '¡EVENTO PUBLICADO! ✓' : 'PUBLICAR EVENTO'}
            </motion.button>
          </div>

        </main>

      </div>

      {/* MODAL DE BUENAS PRÁCTICAS */}
      <AnimatePresence>
        {isBestPracticesOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[24px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left"
            >
              {/* Botón Cerrar ✕ */}
              <button
                onClick={() => setIsBestPracticesOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors focus:outline-none"
              >
                ✕
              </button>

              <h3 className="font-display text-white text-xl font-black tracking-wide uppercase mb-3 pr-8">
                BUENAS PRÁCTICAS PARA EVENTOS
              </h3>

              <div className="space-y-3 font-sans text-xs text-neutral-300 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <h4 className="font-display text-[#E87A72] text-xs font-bold uppercase tracking-wider">
                    1. DIMENSIONES DE ARTE
                  </h4>
                  <p className="mt-0.5 text-neutral-400 leading-relaxed">
                    Usa relación 9:16 (vertical) o casi cuadrada (1:1), mínimo 1080x1080px y peso menor a 2MB para carga inmediata.
                  </p>
                </div>

                <div>
                  <h4 className="font-display text-[#E87A72] text-xs font-bold uppercase tracking-wider">
                    2. COMPOSICIÓN Y MÁRGENES
                  </h4>
                  <p className="mt-0.5 text-neutral-400 leading-relaxed">
                    Mantén márgenes de seguridad limpios en los bordes para evitar que la interfaz o botones tapen textos clave.
                  </p>
                </div>

                <div>
                  <h4 className="font-display text-[#E87A72] text-xs font-bold uppercase tracking-wider">
                    3. HORARIOS DE INICIO Y CIERRE
                  </h4>
                  <p className="mt-0.5 text-neutral-400 leading-relaxed">
                    Define claramente el lapso del evento para orientar a los invitados y calcular el corte de listas.
                  </p>
                </div>

                <div>
                  <h4 className="font-display text-[#E87A72] text-xs font-bold uppercase tracking-wider">
                    4. PÚBLICO VS. PRIVADO
                  </h4>
                  <p className="mt-0.5 text-neutral-400 leading-relaxed">
                    <strong>Público:</strong> Visible en el carrusel de inicio y feed.<br />
                    <strong>Privado:</strong> Oculto; acceso exclusivo por enlace directo.
                  </p>
                </div>

                <div>
                  <h4 className="font-display text-[#E87A72] text-xs font-bold uppercase tracking-wider">
                    5. CONTROL DE ACCESO (ESCANEO)
                  </h4>
                  <p className="mt-0.5 text-neutral-400 leading-relaxed">
                    Usa el modo escáner en puerta para validar pases QR en tiempo real, incluso sin conexión a internet.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800">
                <button
                  onClick={() => setIsBestPracticesOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-display text-sm font-black tracking-wider uppercase hover:bg-neutral-200 transition-colors"
                >
                  ENTENDIDO
                </button>
              </div>
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

export default CreateEventScreen;
