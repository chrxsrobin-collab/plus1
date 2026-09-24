import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { CreateEventFormData, AVAILABLE_CATEGORIES, AVAILABLE_EVENT_TAGS } from '../types/home';
import { LocationPickerModal, Coordinates } from '../components/LocationPickerModal';
import { ShareEventModal } from '../components/ShareEventModal';
import { computeEventEndTimestamp, formatVipCutoffDisplay } from '../lib/dateUtils';
import '../styles/fonts.css';

export { AVAILABLE_CATEGORIES, AVAILABLE_EVENT_TAGS };

export interface CreateEventScreenProps {
  eventId?: string;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
}

export const CreateEventScreen: React.FC<CreateEventScreenProps> = ({
  eventId,
  onBack,
  onNavigate,
}) => {
  const isEditMode = Boolean(eventId);

  // Estado del formulario (inicialmente limpio si es nuevo, o precargado al editar)
  const [formData, setFormData] = useState<CreateEventFormData>({
    artImage: null,
    imageUrl: null,
    name: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    coordinates: null,
    privacy: 'public',
    allowPlusOne: true,
    maxCapacity: 150,
    vipCutoffTime: null,
  });

  const [isVipCutoffActive, setIsVipCutoffActive] = useState<boolean>(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [eventHostUserId, setEventHostUserId] = useState<string | null>(null);

  // Cargar datos del evento existente desde Firestore cuando se pasa eventId
  useEffect(() => {
    if (!eventId) return;

    let isMounted = true;
    const fetchEventData = async () => {
      try {
        const eventRef = doc(db, 'events', eventId);
        const snap = await getDoc(eventRef);
        if (snap.exists() && isMounted) {
          const d = snap.data();
          const currentUserId = auth.currentUser?.uid;

          // Validación de autoría: el usuario actual solo puede editar sus propios eventos
          if (d.hostUserId && currentUserId && d.hostUserId !== currentUserId) {
            alert('No tienes permisos para editar este evento.');
            handleBack();
            return;
          }

          setEventHostUserId(d.hostUserId || null);
          setFormData({
            artImage: d.imageUrl || d.artImage || null,
            imageUrl: d.imageUrl || d.artImage || null,
            name: d.title || '',
            startDate: d.date || '',
            startTime: d.startTime || '',
            endDate: d.endDate || d.date || '',
            endTime: d.endTime || '',
            location: d.location || '',
            coordinates: d.coordinates || null,
            privacy: (d.type as 'public' | 'private') || 'public',
            allowPlusOne: d.allowsPlusOne !== undefined ? Boolean(d.allowsPlusOne) : true,
            maxCapacity: d.guestLimit || d.maxCapacity || 150,
            vipCutoffTime: d.vipCutoffTime || null,
          });
          setIsVipCutoffActive(Boolean(d.vipCutoffTime));

          if (d.tags && Array.isArray(d.tags)) {
            const normalized = d.tags.map((t: string) => {
              if (t === 'indie') return 'rock_indie';
              if (t === 'cocktails') return 'arte_cocktails';
              if (t === 'rooftops' || t === 'deportes') return 'deportes_salud';
              const found = AVAILABLE_EVENT_TAGS.find((at) => at.id === t || at.label === t);
              return found ? found.id : t;
            });
            setSelectedTags(normalized);
          }
        }
      } catch (err) {
        console.error('Error al cargar datos del evento para editar:', err);
      }
    };

    fetchEventData();
    return () => {
      isMounted = false;
    };
  }, [eventId, auth.currentUser]);

  // Estado de publicación y modales
  const [isPublished, setIsPublished] = useState(false);
  const [createdEventData, setCreatedEventData] = useState<{
    id: string;
    title: string;
    date: string;
    startTime: string;
    location: string;
    coordinates?: Coordinates | null;
    imageUrl?: string | null;
  } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isBestPracticesOpen, setIsBestPracticesOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleToggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagId));
    } else {
      if (selectedTags.length >= 3) {
        showToast('Máximo 3 etiquetas permitidas');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }
        return;
      }
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('/');
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventId) return;
    if (eventHostUserId && auth.currentUser?.uid && eventHostUserId !== auth.currentUser.uid) {
      alert('No tienes permisos para eliminar este evento.');
      handleBack();
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'events', eventId));
      setIsDeleteModalOpen(false);
      showToast('🗑️ EVENTO ELIMINADO');
      setTimeout(() => {
        handleBack();
      }, 600);
    } catch (err) {
      console.error('[DeleteEvent] Error al eliminar evento:', err);
      showToast('Error al eliminar evento');
      setIsDeleting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Redimensionar con max width 800px manteniendo relación de aspecto
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Comprimir a formato WebP/JPEG con calidad 0.7
            let base64String = canvas.toDataURL('image/webp', 0.7);
            if (!base64String.startsWith('data:image/webp')) {
              base64String = canvas.toDataURL('image/jpeg', 0.7);
            }
            setFormData((prev) => ({
              ...prev,
              artImage: base64String,
              imageUrl: base64String,
            }));
            showToast('Arte de flyer optimizado y cargado');
          }
        };
        img.src = event.target?.result as string;
      };

      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData((prev) => ({
      ...prev,
      artImage: null,
      imageUrl: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const [isSaving, setIsSaving] = useState(false);

  const handlePublish = async () => {
    if (isPublished || isSaving) {
      return;
    }

    const eventTitle = formData.name.trim();
    if (!eventTitle) {
      showToast('Por favor, ingresa el nombre del evento');
      return;
    }

    if (isEditMode && eventId) {
      if (eventHostUserId && auth.currentUser?.uid && eventHostUserId !== auth.currentUser.uid) {
        alert('No tienes permisos para editar este evento.');
        handleBack();
        return;
      }
    }

    setIsSaving(true);

    const calculatedEndTimestamp = computeEventEndTimestamp(formData.startDate, formData.endTime, formData.startTime);

    try {
      if (isEditMode && eventId) {
        // Actualización atómica en Firestore
        await updateDoc(doc(db, 'events', eventId), {
          title: eventTitle,
          type: formData.privacy,
          tags: selectedTags.length > 0 ? selectedTags : ['previas'],
          date: formData.startDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          endTimestamp: calculatedEndTimestamp,
          location: formData.location || 'Por definir',
          coordinates: formData.coordinates || null,
          allowsPlusOne: formData.allowPlusOne,
          guestLimit: Number(formData.maxCapacity),
          maxCapacity: Number(formData.maxCapacity),
          imageUrl: formData.artImage || null,
          artImage: formData.artImage || null,
          vipCutoffTime: formData.vipCutoffTime || null,
          updatedAt: Date.now(),
        });

        setIsPublished(true);
        showToast('🟢 EVENTO ACTUALIZADO CORRECTAMENTE');
      } else {
        // Microinteracción con confeti de partículas brillantes
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#12C061', '#E87A72', '#FAB205', '#FFFFFF'],
          });
        } catch {
          // Fallback silencioso
        }

        // Resolver nombre y avatar del anfitrión desde la colección 'users' o auth.currentUser
        let resolvedHostName = auth.currentUser?.displayName || (auth.currentUser?.isAnonymous ? "Invitado #" + auth.currentUser.uid.slice(-4).toUpperCase() : 'Anfitrión');
        let resolvedHostPhoto: string | null = auth.currentUser?.photoURL || null;

        if (auth.currentUser?.uid) {
          try {
            const uDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (uDoc.exists()) {
              const uData = uDoc.data();
              if (uData.name) resolvedHostName = uData.name;
              if (uData.avatarUrl || uData.photoURL) resolvedHostPhoto = uData.avatarUrl || uData.photoURL;
            }
          } catch {
            // Fallback silencioso a auth
          }
        }

        // Inserción directa en Firestore garantizando sellado con UID del autor y timestamp de finalización
        const docRef = await addDoc(collection(db, 'events'), {
          title: eventTitle,
          type: formData.privacy,
          tags: selectedTags.length > 0 ? selectedTags : ['previas'],
          date: formData.startDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          endTimestamp: calculatedEndTimestamp,
          location: formData.location || 'Por definir',
          coordinates: formData.coordinates || null,
          allowsPlusOne: formData.allowPlusOne,
          guestLimit: Number(formData.maxCapacity),
          maxCapacity: Number(formData.maxCapacity),
          imageUrl: formData.artImage || null,
          artImage: formData.artImage || null,
          vipCutoffTime: formData.vipCutoffTime || null,
          hostUserId: auth.currentUser?.uid || null,
          hostName: resolvedHostName,
          hostPhotoUrl: resolvedHostPhoto,
          createdAt: Date.now(),
        });

        const newEventId = docRef.id;
        setCreatedEventData({
          id: newEventId,
          title: eventTitle,
          date: formData.startDate,
          startTime: formData.startTime,
          location: formData.location || 'Por definir',
          coordinates: formData.coordinates || null,
          imageUrl: formData.artImage || null,
          vipCutoffTime: formData.vipCutoffTime || null,
        });

        setIsPublished(true);
        setIsShareModalOpen(true);
        showToast('¡Evento publicado en vivo con éxito!');
      }

      // En modo edición, redirigir al Home tras guardar exitosamente
      if (isEditMode) {
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('/');
          } else if (onBack) {
            onBack();
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Error al guardar evento en Firestore:', err);
      showToast('Error al conectar con Firestore');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareEvent = (eventData: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    location: string;
  }) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#/e/${eventData.id}`;
    const shareText = `¡Te invito a mi evento en +1!\n🔥 ${eventData.title}\n📅 ${eventData.date} · ${eventData.startTime}\n📍 ${eventData.location}\n\nObtén tu pase aquí: ${shareUrl}`;

    if (navigator.share) {
      navigator
        .share({
          title: eventData.title,
          text: shareText,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText);
      }
      alert('Enlace copiado al portapapeles listo para enviar por WhatsApp.');
    }
  };

  const handleShare = () => {
    if (!isPublished) return;
    if (createdEventData) {
      handleShareEvent(createdEventData);
      return;
    }

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
              {isEditMode ? 'EDITAR EVENTO' : 'CREAR NUEVO EVENTO'}
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
              className="relative w-full aspect-square max-w-[340px] mx-auto rounded-2xl overflow-hidden bg-[#141518] border-2 border-dashed border-[#26282E] hover:border-[#E87A72] flex flex-col items-center justify-center cursor-pointer group transition-colors shadow-2xl"
            >
              {formData.imageUrl || formData.artImage ? (
                <>
                  <img
                    src={(formData.imageUrl || formData.artImage) as string}
                    alt="Arte del evento"
                    className="w-full h-full aspect-square object-cover rounded-2xl group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  {/* Botón flotante superior derecho para eliminar la foto */}
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    aria-label="Eliminar imagen"
                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-black border border-neutral-700/80 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all active:scale-90 cursor-pointer"
                  >
                    <span className="text-sm font-bold leading-none">✕</span>
                  </button>
                  {/* Overlay sutil para cambiar imagen al hacer hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                    <span className="font-sans text-white text-xs font-bold px-3.5 py-1.5 rounded-full bg-black/85 border border-neutral-700 uppercase tracking-wider backdrop-blur-sm">
                      Cambiar imagen
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none">
                  {/* Ícono minimalista de carga/imagen */}
                  <div className="w-14 h-14 rounded-2xl bg-[#1A1C20] border border-[#26282E] flex items-center justify-center text-[#E87A72] mb-3.5 group-hover:scale-105 group-hover:border-[#E87A72]/50 transition-all shadow-md">
                    <svg
                      className="w-7 h-7 stroke-current fill-none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      <line x1="12" y1="9" x2="12" y2="15" />
                      <line x1="9" y1="12" x2="15" y2="12" />
                    </svg>
                  </div>
                  {/* Texto principal en Cabinet Grotesk */}
                  <span className="font-sans text-white text-base font-bold tracking-tight">
                    SUBIR ARTE DEL EVENTO
                  </span>
                  {/* Subtexto sutil */}
                  <p className="font-sans text-[#6B7280] text-xs text-center mt-1 max-w-[220px] leading-relaxed">
                    Toca para seleccionar desde tu galería (JPG, PNG, WEBP)
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
              placeholder="Ej. FIESTA DE JOSIE 🔥"
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

          {/* CONTROL: CIERRE DE LISTA VIP (OPCIONAL) */}
          <div className="w-full">
            {!isVipCutoffActive && !formData.vipCutoffTime ? (
              /* ESTADO INACTIVO */
              <button
                type="button"
                onClick={() => {
                  setIsVipCutoffActive(true);
                  if (!formData.vipCutoffTime) {
                    setFormData((prev) => ({ ...prev, vipCutoffTime: '01:00' }));
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#16171B] hover:bg-[#1E2025] border border-[#26282E] text-[#8E8E93] hover:text-white font-display text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <span>+ DEFINIR HORA DE CIERRE DE LISTA VIP (OPCIONAL)</span>
              </button>
            ) : (
              /* ESTADO ACTIVO */
              <div className="p-3 rounded-xl bg-[#16171B] border border-[#26282E] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#E87A72] text-base">⏳</span>
                    <label className="font-display text-white text-xs font-bold tracking-wider uppercase truncate">
                      Cierre de Lista: {formData.vipCutoffTime ? formatVipCutoffDisplay(formData.vipCutoffTime) : '01:00 AM'}
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsVipCutoffActive(false);
                      setFormData((prev) => ({ ...prev, vipCutoffTime: null }));
                    }}
                    title="Remover límite de lista VIP"
                    className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-xs font-bold transition-all active:scale-90 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={formData.vipCutoffTime || '01:00'}
                    onChange={(e) => setFormData({ ...formData, vipCutoffTime: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl bg-[#101114] border border-[#26282E] focus:border-[#E87A72] text-white font-sans text-xs text-center outline-none transition-colors"
                  />
                </div>

                <p className="font-sans text-[#8E8E93] text-xs leading-relaxed">
                  Los pases VIP solicitados solo serán válidos para ingresar hasta esta hora.
                </p>
              </div>
            )}
          </div>

          {/* CAMPO 4: LUGAR / UBICACIÓN (INTERFAZ PROGRESIVA BASADA EN MAPA) */}
          <div className="space-y-1.5">
            <label className="font-display text-white text-xs font-bold tracking-wider uppercase block">
              LUGAR / UBICACIÓN
            </label>

            {!formData.location ? (
              /* ESTADO INICIAL (VACÍO / SIN UBICACIÓN FIJADA) */
              <button
                type="button"
                onClick={() => setIsLocationPickerOpen(true)}
                className="w-full h-12 rounded-xl bg-[#16171B] hover:bg-[#1E2025] border border-[#26282E] hover:border-[#E87A72]/60 text-white flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] group cursor-pointer shadow-sm"
              >
                <span className="text-[#E87A72] text-base group-hover:scale-110 transition-transform">
                  <svg
                    className="w-4 h-4 fill-none stroke-current inline-block"
                    viewBox="0 0 24 24"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <span className="font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-neutral-200 group-hover:text-white">
                  🗺️ SELECCIONAR EN EL MAPA
                </span>
              </button>
            ) : (
              /* ESTADO CONFIRMADO (UNA VEZ SELECCIONADO EL PUNTO EN EL MAPA) */
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full min-h-[48px] p-3 rounded-xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/50 flex items-center justify-between gap-2.5 transition-colors shadow-sm"
              >
                {/* Izquierda: Icono salmón y dirección legible */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-[#E87A72] text-base shrink-0">📍</span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-sans text-xs sm:text-sm font-semibold text-white truncate">
                      {formData.location}
                    </span>
                    {formData.coordinates && (
                      <span className="font-mono text-[10px] text-neutral-500">
                        GPS: {formData.coordinates.lat.toFixed(4)}, {formData.coordinates.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Derecha: Acción de Reajuste (Botón compacto pastilla CAMBIAR) */}
                <button
                  type="button"
                  onClick={() => setIsLocationPickerOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#1E2025] hover:bg-[#26282E] border border-[#26282E] hover:border-[#E87A72]/60 text-neutral-300 hover:text-white font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <span className="text-xs">🗺️</span>
                  <span>CAMBIAR</span>
                </button>
              </motion.div>
            )}
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

          {/* CAMPO 5.5: VIBE / GÉNERO DEL EVENTO (TAG AFFINITY SYSTEM) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-display text-white text-xs font-bold tracking-wider uppercase block">
                VIBE / GÉNERO DEL EVENTO
              </label>
              <span
                className={`font-sans text-xs font-bold transition-colors ${
                  selectedTags.length > 0 ? 'text-[#12C061]' : 'text-[#8E8E93]'
                }`}
              >
                ({selectedTags.length}/3 elegidas)
              </span>
            </div>
            <p className="font-sans text-xs text-[#8E8E93] px-1 leading-snug">
              Elige hasta 3 etiquetas para recomendar tu evento a las personas indicadas
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {AVAILABLE_EVENT_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <motion.button
                    key={tag.id}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleToggleTag(tag.id)}
                    className={`py-2 px-3 rounded-xl font-sans text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#E87A72]/20 border-[#E87A72] text-white font-bold shadow-[0_0_12px_rgba(232,122,114,0.22)]'
                        : 'bg-[#16171B] border-[#26282E] text-[#8E8E93] hover:border-white/20 hover:text-white font-medium'
                    }`}
                  >
                    {tag.label}
                  </motion.button>
                );
              })}
            </div>
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
              disabled={isSaving || isPublished || isDeleting}
              className={`w-full py-4 px-5 rounded-2xl font-display text-[26px] font-black tracking-wider uppercase flex items-center justify-center transition-all shadow-xl focus:outline-none ${
                isPublished
                  ? 'bg-neutral-900 text-[#12C061] border border-[#12C061]'
                  : isSaving
                  ? 'bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-wait'
                  : 'bg-[#12C061] hover:bg-[#0fa854] text-black active:scale-98'
              }`}
            >
              {isPublished
                ? (isEditMode ? '¡CAMBIOS GUARDADOS! ✓' : '¡EVENTO PUBLICADO! ✓')
                : isSaving
                ? (isEditMode ? 'GUARDANDO...' : 'PUBLICANDO...')
                : (isEditMode ? 'GUARDAR CAMBIOS' : 'PUBLICAR EVENTO')}
            </motion.button>

            {/* BOTÓN "ELIMINAR EVENTO" (SOLO EN MODO EDICIÓN) */}
            {isEditMode && (
              <div className="mt-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={isSaving || isDeleting}
                  className="w-full h-12 sm:h-14 rounded-2xl bg-[#DC2626] hover:bg-[#b91c1c] active:scale-98 text-white font-display text-lg sm:text-xl font-black tracking-wider uppercase flex items-center justify-center transition-all shadow-lg focus:outline-none cursor-pointer"
                >
                  ELIMINAR EVENTO
                </motion.button>
              </div>
            )}
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

              <div className="space-y-3.5 font-sans text-xs text-neutral-300 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <h4 className="font-display text-[#E87A72] text-xs font-bold uppercase tracking-wider">
                    1. Dimensiones del arte
                  </h4>
                  <p className="mt-0.5 text-neutral-400 leading-relaxed">
                    Usa relación cuadrada, mínimo de 1080x1080px y peso menor a 2mb para carga inmediata.
                  </p>
                </div>

                <div>
                  <h4 className="font-display text-[#E87A72] text-xs font-bold uppercase tracking-wider">
                    2. Composición y márgenes
                  </h4>
                  <p className="mt-0.5 text-neutral-400 leading-relaxed">
                    Mantén márgenes de seguridad limpios en los bordes, trata de no usar textos dentro de la imagen.
                  </p>
                </div>

                <div>
                  <h4 className="font-display text-[#E87A72] text-xs font-bold uppercase tracking-wider">
                    3. Horarios de inicio y cierre
                  </h4>
                  <p className="mt-0.5 text-neutral-400 leading-relaxed">
                    Define claramente el horario del evento para orientar a los invitados.
                  </p>
                </div>

                <div>
                  <h4 className="font-display text-[#E87A72] text-xs font-bold uppercase tracking-wider">
                    4. Público vs. Privado
                  </h4>
                  <p className="mt-0.5 text-neutral-400 leading-relaxed">
                    · <strong>Público:</strong> Visible en el feed, ideal para eventos grandes, clubs, etc.<br />
                    · <strong>Privado:</strong> Oculto, ideal para cumpleaños, bodas, etc.
                  </p>
                </div>

                <div>
                  <h4 className="font-display text-[#E87A72] text-xs font-bold uppercase tracking-wider">
                    5. Control de acceso (escaneo)
                  </h4>
                  <p className="mt-0.5 text-neutral-400 leading-relaxed">
                    Una vez publicado tu evento usa el modo escáner en puerta para validar pases QR en tiempo real, incluso sin conexión a internet.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800">
                <button
                  onClick={() => setIsBestPracticesOpen(false)}
                  className="w-full py-3 rounded-xl bg-[#12C061] hover:bg-[#0fa854] text-black font-display text-base font-black tracking-wider uppercase transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  ¡CAPISCO!
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL CONFIRMACIÓN DE ELIMINACIÓN */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl bg-[#16171B] border border-[#26282E] p-6 shadow-2xl text-center relative"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-[#DC2626] flex items-center justify-center mx-auto mb-4 text-xl">
                ⚠️
              </div>

              <h3 className="font-display text-white text-xl sm:text-2xl font-black tracking-wide uppercase mb-2">
                ¿ELIMINAR ESTE EVENTO?
              </h3>

              <p className="font-sans text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
                Esta acción es permanente. Se cancelará el evento y se revocarán todos los pases asociados de los invitados.
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={isDeleting}
                  className="w-full h-12 rounded-xl bg-[#DC2626] hover:bg-[#b91c1c] text-white font-display text-sm sm:text-base font-black tracking-wider uppercase transition-colors flex items-center justify-center cursor-pointer shadow-lg active:scale-98 disabled:opacity-50"
                >
                  {isDeleting ? 'ELIMINANDO...' : 'SÍ, ELIMINAR'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="w-full h-12 rounded-xl bg-[#1A1C20] border border-[#26282E] text-zinc-300 hover:text-white font-display text-sm sm:text-base font-bold tracking-wider uppercase transition-colors flex items-center justify-center cursor-pointer active:scale-98"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL DE EVENTO CREADO / COMPARTIR (ShareEventModal) */}
        {isShareModalOpen && createdEventData && (
          <ShareEventModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            event={createdEventData}
            isNewlyCreated={true}
            onNavigateHome={() => {
              setIsShareModalOpen(false);
              if (onNavigate) {
                onNavigate('/');
              } else if (onBack) {
                onBack();
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* MODAL SELECTOR DE UBICACIÓN INTERACTIVO CON MAPA */}
      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        initialCoordinates={formData.coordinates}
        initialAddress={formData.location}
        onConfirm={(address, coords) => {
          setFormData((prev) => ({
            ...prev,
            location: address,
            coordinates: coords,
          }));
          setIsLocationPickerOpen(false);
          showToast('📍 Ubicación fijada en el mapa');
        }}
      />

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
