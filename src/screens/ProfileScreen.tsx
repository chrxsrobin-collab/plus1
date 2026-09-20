import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, CreatedEventItem } from '../types/home';
import { mockUserProfile, mockSouvenirs } from '../data/mockData';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { computeEventEndTimestamp } from '../lib/dateUtils';
import '../styles/fonts.css';

export interface ProfileScreenProps {
  user?: UserProfile;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
  onUpdateName?: (newName: string) => void;
  onUpdateAvatar?: (newAvatarUrl: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user = mockUserProfile,
  onBack,
  onNavigate,
  onUpdateName,
  onUpdateAvatar,
}) => {
  const [activeModal, setActiveModal] = useState<
    'events' | 'created_events' | 'streak' | 'store' | 'subscription' | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userEvents, setUserEvents] = useState<CreatedEventItem[]>([]);
  const [attendedPasses, setAttendedPasses] = useState<{
    id: string;
    title: string;
    checkedInAt?: number | string;
    location?: string;
    hostName?: string;
  }[]>([]);

  // Estado reactivo del perfil de usuario y modo edición inline
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>(() => {
    return (
      auth.currentUser?.displayName ||
      (auth.currentUser?.isAnonymous ? "INVITADO #" + auth.currentUser.uid.slice(-4).toUpperCase() : null) ||
      user.name ||
      'CHRIS G.'
    );
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(displayName);
  const [isSavingName, setIsSavingName] = useState(false);

  // Estado del Avatar y Uploader con Lápiz flotante
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return (
      auth.currentUser?.photoURL ||
      user.avatarUrl ||
      './assets/images/foto_perfil.webp'
    );
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Escucha en tiempo real del documento propio del usuario conectado
  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserProfileData(data);
        if (data.name) {
          setDisplayName(data.name);
          setEditNameValue(data.name);
        }
        if (data.photoUrl) {
          setAvatarUrl(data.photoUrl);
        } else if (auth.currentUser?.photoURL) {
          setAvatarUrl(auth.currentUser.photoURL);
        }
      }
    });
    return () => unsubscribe();
  }, [auth.currentUser]);

  // Carga y compresión de la nueva foto de perfil (Canvas 400x400 max, calidad 0.8)
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona una imagen válida');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 400;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setIsUploadingAvatar(false);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          let compressedBase64 = canvas.toDataURL('image/webp', 0.8);
          if (!compressedBase64.startsWith('data:image/webp')) {
            compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          }

          // Feedback inmediato local
          setAvatarUrl(compressedBase64);
          if (onUpdateAvatar) {
            onUpdateAvatar(compressedBase64);
          }

          // Persistir en Firebase Auth & Firestore
          if (auth.currentUser) {
            try {
              await updateProfile(auth.currentUser, { photoURL: compressedBase64 });
              await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                photoUrl: compressedBase64,
              });
            } catch (fbErr) {
              console.warn('Fallback setDoc para avatar:', fbErr);
              await setDoc(
                doc(db, 'users', auth.currentUser.uid),
                { photoUrl: compressedBase64 },
                { merge: true }
              );
            }
          }

          setIsUploadingAvatar(false);
          showToast('✦ Foto de perfil actualizada');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error al procesar la imagen de perfil:', err);
      setIsUploadingAvatar(false);
      showToast('Error al actualizar la foto');
    }
  };

  const handleSaveName = async () => {
    const trimmed = editNameValue.trim();
    if (!trimmed) {
      showToast('El nombre no puede estar vacío');
      return;
    }

    setIsSavingName(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: trimmed });
        await setDoc(doc(db, 'users', auth.currentUser.uid), { name: trimmed }, { merge: true });
      }
      setDisplayName(trimmed);
      if (onUpdateName) {
        onUpdateName(trimmed);
      }
      setIsEditingName(false);
      showToast('🟢 NOMBRE ACTUALIZADO');
    } catch (err) {
      console.error('Error al actualizar nombre:', err);
      showToast('Error al actualizar el nombre');
    } finally {
      setIsSavingName(false);
    }
  };

  const isPartner = Boolean(userProfileData?.isPartner);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribePartner = async () => {
    if (!auth.currentUser) {
      showToast('Debes iniciar sesión para suscribirte');
      return;
    }

    setIsSubscribing(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        isPartner: true,
        partnerTier: 'SOCIO_PLUS',
        subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      }, { merge: true });
      showToast('⭐ ¡MEMBRESÍA SOCIO + ACTIVADA!');
      setActiveModal(null);
    } catch (err) {
      console.error('Error al activar suscripción:', err);
      showToast('Error al activar suscripción');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleCancelPartner = async () => {
    if (!auth.currentUser) return;
    setIsSubscribing(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        isPartner: false,
        partnerTier: null,
        subscriptionExpiresAt: null,
      }, { merge: true });
      showToast('Membresía pausada');
      setActiveModal(null);
    } catch (err) {
      console.error('Error al pausar membresía:', err);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('Sesión cerrada');
      if (onBack) {
        onBack();
      } else if (onNavigate) {
        onNavigate('/');
      }
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      showToast('Error al cerrar sesión');
    }
  };

  // Escucha reactiva en tiempo real de eventos creados por el usuario activo
  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      setUserEvents([]);
      return;
    }

    const q = query(
      collection(db, 'events'),
      where('hostUserId', '==', currentUserId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const myEvents: CreatedEventItem[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          const eventEnd = d.endTimestamp || computeEventEndTimestamp(d.date, d.endTime, d.startTime);
          const isFinished = eventEnd <= now;
          return {
            id: doc.id,
            title: d.title || 'Evento sin título',
            dateStr: `${d.date || 'Próximamente'} · ${d.startTime || '22:00'}`,
            status: isFinished ? 'Finalizado' : 'Activo',
            isFinished: isFinished,
            endTimestamp: eventEnd,
            guestsCount: d.confirmedCount || d.guestsCount || 0,
            maxCapacity: d.maxCapacity || d.guestLimit || 150,
          };
        });
        setUserEvents(myEvents);
      },
      (err) => {
        console.warn('Error escuchando eventos en ProfileScreen:', err);
        setUserEvents([]);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Escucha reactiva en tiempo real de pases usados (eventos asistidos)
  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      setAttendedPasses([]);
      return;
    }

    const q = query(
      collection(db, 'passes'),
      where('userId', '==', currentUserId),
      where('status', '==', 'used')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.eventTitle || data.title || 'EVENTO +1',
            checkedInAt: data.checkedInAt || data.usedAt || data.updatedAt,
            location: data.location || data.venue || 'Club / Recinto Oficial',
            hostName: data.hostName || 'Anfitrión +1',
          };
        });
        setAttendedPasses(list);
      },
      (err) => {
        console.warn('Error escuchando eventos asistidos en ProfileScreen:', err);
        setAttendedPasses([]);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  const formatCheckedInTime = (timestamp?: number | string) => {
    if (!timestamp) return 'Ingreso validado en puerta';
    const num = typeof timestamp === 'number' ? timestamp : parseInt(timestamp, 10);
    if (isNaN(num)) return String(timestamp);
    const date = new Date(num);
    const day = date.getDate();
    const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const month = monthNames[date.getMonth()] || '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} · ${hours}:${minutes} HS`;
  };

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
    } else {
      console.log('[Navigation] -> Back to Home');
    }
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator
        .share({
          title: '+1 (Más Uno) - App de Eventos',
          text: '¡Descarga +1 para gestionar tus eventos y pases VIP con lista de puerta!',
          url: window.location.origin,
        })
        .catch(() => showToast('Enlace copiado al portapapeles'));
    } else {
      navigator.clipboard?.writeText(window.location.origin);
      showToast('Enlace copiado al portapapeles');
    }
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#000000] text-white flex flex-col justify-between overflow-x-hidden font-sans select-none pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Fondo abstracto sutil fondo_b.webp */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-cover bg-center"
        style={{
          backgroundImage: "url('./assets/images/fondo_b.webp')",
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      />

      {/* Degradado superior para navegación */}
      <div className="fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-[#000000] via-[#000000]/70 to-transparent pointer-events-none z-10" />

      {/* Contenedor central móvil */}
      <div className="relative z-20 flex-1 flex flex-col w-full max-w-md mx-auto px-5">
        
        {/* 1. TOP BAR */}
        <header className="flex items-center justify-between pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-2 w-full relative z-30">
          {/* Flecha retroceso: ← */}
          <button
            onClick={handleBack}
            aria-label="Regresar"
            className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 focus:outline-none"
          >
            <span className="text-xl font-bold leading-none">←</span>
          </button>

          {/* Título o branding sutil */}
          <span className="font-display text-neutral-400 text-sm font-bold tracking-widest uppercase">
            MI PERFIL
          </span>

          {/* Botón Configuración / Usuario: Ⓞ */}
          <button
            onClick={() => showToast('Ajustes de cuenta')}
            aria-label="Ajustes de cuenta"
            className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-all active:scale-90 focus:outline-none"
          >
            <svg
              className="w-5 h-5 stroke-current fill-none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </button>
        </header>

        {/* 2. AVATAR Y DATOS DE PERFIL */}
        <div className="flex flex-col items-center justify-center pt-3 pb-4 text-center">
          {/* Avatar circular con aro salmón #E87A72 y botón flotante de edición */}
          <div className="relative inline-block">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: 'backOut' }}
              className="relative w-24 h-24 rounded-full p-1 border-2 border-[#E87A72] bg-[#16171B] shadow-2xl flex items-center justify-center overflow-hidden"
            >
              <img
                src={avatarUrl || user.avatarUrl || './assets/images/foto_perfil.webp'}
                alt={user.name || 'Chris G.'}
                className="w-full h-full object-cover rounded-full"
              />
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center rounded-full">
                  <div className="w-5 h-5 border-2 border-[#E87A72] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </motion.div>

            {/* Botón Lápiz Flotante */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Cambiar foto de perfil"
              title="Cambiar foto de perfil"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#16171B] hover:bg-[#22252C] border border-white/20 hover:border-[#E87A72] flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer z-10"
            >
              <svg
                className="w-3.5 h-3.5 text-[#E87A72] stroke-current fill-none"
                viewBox="0 0 24 24"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>

            {/* Input de archivo oculto */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Nombre de usuario con botón de edición (lápiz) */}
          {!isEditingName ? (
            <div className="flex items-center justify-center space-x-2.5 mt-3 group">
              <h2 className="font-display text-white text-[32px] sm:text-[36px] font-black tracking-tight uppercase leading-none">
                {displayName}
              </h2>
              <button
                onClick={() => {
                  setEditNameValue(displayName);
                  setIsEditingName(true);
                }}
                aria-label="Editar nombre de usuario"
                className="w-7 h-7 rounded-full bg-[#16171B] hover:bg-neutral-800 border border-[#26282E] flex items-center justify-center text-[#9CA3AF] hover:text-[#E87A72] transition-colors active:scale-90 focus:outline-none cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5 stroke-current fill-none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-center space-x-2 max-w-xs w-full mx-auto">
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  else if (e.key === 'Escape') setIsEditingName(false);
                }}
                autoFocus
                placeholder="TU NOMBRE"
                className="flex-1 h-11 px-3.5 rounded-xl bg-[#101114] border border-[#E87A72] text-white font-display text-lg font-black tracking-wide uppercase outline-none focus:ring-1 focus:ring-[#E87A72]"
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName}
                className="h-11 px-3.5 rounded-xl bg-[#12C061] hover:bg-[#0fa854] text-black font-display font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {isSavingName ? '...' : 'GUARDAR'}
              </button>
              <button
                onClick={() => setIsEditingName(false)}
                className="h-11 w-9 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white font-sans text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Badge de Membresía: solo si el usuario ya es Socio + activo */}
          {isPartner && (
            <div className="mt-2 flex items-center justify-center">
              <span className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-[#FAB205] text-black font-display font-black text-xs uppercase tracking-wider shadow-sm">
                <span>👑</span>
                <span>SOCIO +</span>
              </span>
            </div>
          )}
        </div>

        {/* 3. GRID DE 3 MÉTRICAS DE GAMIFICACIÓN */}
        <div className="grid grid-cols-3 gap-2.5 w-full mt-2">
          
          {/* Tarjeta 1: EVENTOS ASISTIDOS */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveModal('events')}
            className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg"
          >
            <div className="text-xl mb-1">📅</div>
            <span className="font-display text-white text-3xl sm:text-[34px] font-black tracking-tight leading-none my-1">
              {attendedPasses.length}
            </span>
            <span className="font-display text-neutral-400 text-[11px] font-bold tracking-wider uppercase">
              EVENTOS
            </span>
          </motion.div>

          {/* Tarjeta 2: RACHA DE ASISTENCIA */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveModal('streak')}
            className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#F17D02]/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg"
          >
            <div className="text-xl mb-1">⏱️</div>
            <div className="flex items-center justify-center space-x-1 my-1">
              <span className="text-2xl filter drop-shadow">🔥</span>
              <span className="font-display text-white text-3xl sm:text-[34px] font-black tracking-tight leading-none">
                {userProfileData?.streak ?? user.streakCount ?? 3}
              </span>
            </div>
            <span className="font-display text-neutral-400 text-[11px] font-bold tracking-wider uppercase">
              RACHA
            </span>
          </motion.div>

          {/* Tarjeta 3: PLUSCOINS */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveModal('store')}
            className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#FAB205]/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg"
          >
            <div className="text-xl mb-1">⭐</div>
            <span className="font-display text-[#FAB205] text-2xl sm:text-[28px] font-black tracking-tight leading-tight my-auto text-center">
              {userProfileData?.points ?? user.plusPoints ?? 380}
            </span>
            <span className="font-display text-neutral-400 text-[11px] font-bold tracking-wider uppercase mt-1">
              PLUSCOINS
            </span>
          </motion.div>

        </div>

        {/* 4. SECCIÓN CUENTA */}
        <div className="w-full mt-7">
          <h3 className="font-display text-white text-lg font-black tracking-wider uppercase mb-3 px-1">
            CUENTA
          </h3>

          <div className="space-y-2.5">
            {/* Botón Suscripción */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveModal('subscription')}
              className="w-full p-4 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/50 flex items-center justify-between cursor-pointer transition-colors shadow-md"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg">
                  💳
                </div>
                <div className="text-left">
                  <span className="font-display text-white text-base sm:text-lg font-black tracking-tight uppercase block leading-tight">
                    {isPartner ? 'MEMBRESÍA SOCIO + (ACTIVA)' : 'HAZTE SOCIO + POR $US 4.99/MES'}
                  </span>
                  <span className="font-sans text-neutral-400 text-xs block">
                    Diseñado para promotores, clubes y organizadores
                  </span>
                </div>
              </div>
              <span className="text-neutral-500 font-bold text-lg">›</span>
            </motion.div>

            {/* Botón Mis Eventos Creados (Anfitrión) */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveModal('created_events')}
              className="w-full p-4 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/50 flex items-center justify-between cursor-pointer transition-colors shadow-md"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg">
                  🎪
                </div>
                <div className="text-left">
                  <span className="font-display text-white text-base sm:text-lg font-black tracking-tight uppercase block leading-tight">
                    MIS EVENTOS CREADOS
                  </span>
                  <span className="font-sans text-neutral-400 text-xs block">
                    Gestiona listas y capacidad de tus eventos
                  </span>
                </div>
              </div>
              <span className="text-neutral-500 font-bold text-lg">›</span>
            </motion.div>

            {/* Botón Compartir App */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShareApp}
              className="w-full p-4 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/50 flex items-center justify-between cursor-pointer transition-colors shadow-md"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg">
                  🔗
                </div>
                <div className="text-left">
                  <span className="font-display text-white text-base sm:text-lg font-black tracking-tight uppercase block leading-tight">
                    COMPARTIR APP
                  </span>
                  <span className="font-sans text-neutral-400 text-xs block">
                    Invita a tus amigos y gana 50 Pluscoins
                  </span>
                </div>
              </div>
              <span className="text-neutral-500 font-bold text-lg">›</span>
            </motion.div>
          </div>

          {/* Botón Cerrar Sesión */}
          <div className="mt-8 text-center pb-4">
            <button
              onClick={handleLogout}
              className="font-display text-xs sm:text-sm font-bold tracking-widest text-[#EF4444] uppercase hover:underline focus:outline-none cursor-pointer"
            >
              CERRAR SESIÓN
            </button>
          </div>
        </div>

      </div>

      {/* MODAL 1: GESTIÓN DE EVENTOS */}
      {/* MODAL 1: HISTORIAL DE EVENTOS ASISTIDOS */}
      <AnimatePresence>
        {activeModal === 'events' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left flex flex-col max-h-[82vh]"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center space-x-2.5 mb-1">
                <span className="text-xl">📅</span>
                <h3 className="font-display text-white text-xl font-black tracking-wide uppercase">
                  EVENTOS ASISTIDOS
                </h3>
              </div>
              <p className="font-sans text-neutral-400 text-xs mb-3">
                Historial de eventos validados con tu código QR en puerta:
              </p>

              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                {attendedPasses.length === 0 ? (
                  <div className="py-10 px-4 text-center bg-neutral-900/80 border border-neutral-800 rounded-2xl my-2 flex flex-col items-center">
                    <span className="text-3xl block mb-2">🎟️</span>
                    <p className="font-sans text-neutral-400 text-xs sm:text-sm font-bold uppercase tracking-wider leading-relaxed px-3">
                      AÚN NO HAS ASISTIDO A NINGÚN EVENTO CON TU PASE QR
                    </p>
                  </div>
                ) : (
                  attendedPasses.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800/90 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display text-white text-base font-black uppercase leading-tight truncate">
                          {evt.title}
                        </h4>
                        <span className="text-[10px] font-display font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-[#12C061]/15 text-[#12C061] border border-[#12C061]/40 flex-shrink-0">
                          🟢 ASISTIDO
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-neutral-300 font-sans">
                        <span className="text-[#FAB205]">⏱️</span>
                        <span>{formatCheckedInTime(evt.checkedInAt)}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-sans truncate">
                        📍 {evt.location || evt.hostName}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-neutral-800">
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-neutral-400 hover:text-white font-display text-xs font-bold tracking-wider uppercase border border-neutral-800 transition-colors cursor-pointer"
                >
                  CERRAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1.B: GESTIÓN DE EVENTOS CREADOS (ANFITRIÓN) */}
      <AnimatePresence>
        {activeModal === 'created_events' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[24px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left flex flex-col max-h-[82vh]"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <h3 className="font-display text-white text-xl font-black tracking-wide uppercase mb-3">
                MIS EVENTOS
              </h3>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                {userEvents.length === 0 ? (
                  <div className="py-10 px-4 text-center bg-neutral-900/80 border border-neutral-800 rounded-2xl my-2 flex flex-col items-center justify-center space-y-3">
                    <span className="text-3xl block">🎪</span>
                    <p className="font-sans text-neutral-300 text-xs sm:text-sm font-semibold uppercase tracking-wider leading-relaxed px-2">
                      AÚN NO HAS CREADO NINGÚN EVENTO · CREA TU PRIMER EVENTO PARA GESTIONARLO AQUÍ
                    </p>
                  </div>
                ) : (
                  userEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-display text-white text-sm font-black uppercase leading-tight">
                            {evt.title}
                          </h4>
                          <span className="font-sans text-neutral-400 text-xs mt-0.5 block">
                            {evt.dateStr}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-display font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex-shrink-0 ${
                            evt.isFinished
                              ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                              : 'bg-[#12C061]/20 text-[#12C061] border border-[#12C061]/40'
                          }`}
                        >
                          {evt.isFinished ? '⚪ FINALIZADO' : '🟢 ACTIVO / PRÓXIMO'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-xs">
                        <span className="font-sans text-neutral-400">
                          {evt.guestsCount} / {evt.maxCapacity} invitados
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setActiveModal(null);
                              if (onNavigate) {
                                onNavigate(`/create-event?edit=${evt.id}`);
                              }
                            }}
                            className="font-display text-neutral-400 hover:text-white text-xs font-bold uppercase cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setActiveModal(null);
                              if (onNavigate) {
                                onNavigate(`/manage-event/${evt.id}`);
                              }
                            }}
                            className="font-display text-[#12C061] hover:text-[#0fa854] text-xs font-black uppercase cursor-pointer flex items-center gap-1 bg-[#12C061]/10 border border-[#12C061]/30 px-2 py-1 rounded-lg active:scale-95"
                          >
                            👥 VER ASISTENTES
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Botón Principal al pie del modal */}
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  if (onNavigate) onNavigate('/create-event');
                }}
                className="w-full h-12 rounded-2xl bg-[#E87A72] hover:bg-[#e06d65] text-black font-display font-black text-sm sm:text-base tracking-wider uppercase mt-4 flex items-center justify-center shadow-lg active:scale-98 transition-all cursor-pointer flex-shrink-0"
              >
                [ + ] CREAR NUEVO EVENTO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: INFORMATIVO DE RACHAS ACTIVAS */}
      <AnimatePresence>
        {activeModal === 'streak' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-6 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-3xl mb-3">
                🔥
              </div>

              <h3 className="font-display text-white text-2xl font-black tracking-wide uppercase mb-1">
                TUS RACHAS ACTIVAS
              </h3>

              <p className="font-sans text-neutral-400 text-xs mb-3 leading-relaxed">
                Cantidad de eventos consecutivos asistidos de un mismo anfitrión o club:
              </p>

              {/* Desglose por organizador con diseño brutalista mate */}
              <div className="space-y-2.5 my-4">
                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                  <div className="text-left">
                    <h4 className="font-display text-white text-sm font-black uppercase">Club Cacao</h4>
                    <span className="font-sans text-neutral-400 text-[11px]">Recinto VIP · Electrónica</span>
                  </div>
                  <span className="font-display text-[#FAB205] text-xs font-black px-2.5 py-1 rounded-full bg-[#FAB205]/10 border border-[#FAB205]/30">
                    🔥 3 eventos seguidos
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                  <div className="text-left">
                    <h4 className="font-display text-white text-sm font-black uppercase">Drop Sessions</h4>
                    <span className="font-sans text-neutral-400 text-[11px]">Club Nocturno · Underground</span>
                  </div>
                  <span className="font-display text-[#FAB205] text-xs font-black px-2.5 py-1 rounded-full bg-[#FAB205]/10 border border-[#FAB205]/30">
                    🔥 2 eventos seguidos
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 rounded-xl bg-[#F17D02] text-black font-display font-black text-sm tracking-wider uppercase hover:bg-orange-500 transition-colors cursor-pointer"
              >
                ENTENDIDO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: PLUSCOINS & RECOMPENSAS */}
      <AnimatePresence>
        {activeModal === 'store' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-6 shadow-2xl relative text-left flex flex-col"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="w-14 h-14 rounded-2xl bg-[#FAB205]/15 border border-[#FAB205]/30 flex items-center justify-center text-3xl mb-3">
                ⭐
              </div>

              <h3 className="font-display text-white text-2xl font-black tracking-wide uppercase mb-2">
                PLUSCOINS & RECOMPENSAS
              </h3>

              <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800/80 mb-4">
                <span className="font-display text-[#FAB205] text-3xl font-black tracking-tight block">
                  {userProfileData?.points ?? user.plusPoints ?? 380}
                </span>
                <span className="font-sans text-neutral-400 text-xs uppercase font-semibold">
                  Tus Pluscoins Disponibles
                </span>
              </div>

              <p className="font-sans text-neutral-300 text-sm leading-relaxed mb-6 font-medium">
                Tus Pluscoins acumuladas por asistencia y rachas. Úsalas para canjear merch oficial de +1
              </p>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3.5 rounded-xl bg-[#FAB205] text-black font-display font-black text-sm tracking-wider uppercase hover:bg-yellow-400 transition-colors cursor-pointer shadow-lg shadow-[#FAB205]/20 active:scale-98"
              >
                ENTENDIDO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: SUSCRIPCIÓN PLUS */}
      <AnimatePresence>
        {activeModal === 'subscription' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-6 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              {/* Cabecera: Insignia amarilla con texto negro SOCIO + */}
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FAB205] text-black font-display font-black text-xs uppercase tracking-wider mb-3.5 shadow-md">
                <span>👑</span>
                <span>SOCIO +</span>
              </div>

              {/* Precio destacado */}
              <h3 className="font-display text-white text-3xl sm:text-4xl font-black tracking-tight uppercase leading-tight">
                $US 4.99 / MES
              </h3>

              {/* Público objetivo y propuesta */}
              <p className="font-sans text-neutral-400 text-xs sm:text-sm mt-1 mb-4 leading-relaxed">
                Diseñado para promotores, clubes y organizadores con alta afluencia de gente.
              </p>

              {/* Vista previa de beneficios (Coming Soon) */}
              <div className="p-4 rounded-2xl bg-black/40 border border-[#26282E] space-y-3 font-sans text-xs sm:text-sm text-neutral-300 mb-6">
                <div className="flex items-start space-x-2.5">
                  <span className="text-[#FAB205] font-bold text-base leading-none">✦</span>
                  <span className="leading-snug">Herramientas avanzadas de gestión de puerta y staff.</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <span className="text-[#FAB205] font-bold text-base leading-none">✦</span>
                  <span className="leading-snug">Métricas de asistencia y rendimiento de promotores.</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <span className="text-[#FAB205] font-bold text-base leading-none">✦</span>
                  <span className="leading-snug">Enlaces de listas VIP y eventos sin límite de cupos.</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="space-y-2.5">
                {isPartner ? (
                  <button
                    onClick={handleCancelPartner}
                    disabled={isSubscribing}
                    className="w-full h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-display font-black text-sm tracking-wider uppercase transition-colors shadow-lg active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isSubscribing ? 'ACTUALIZANDO...' : 'PAUSAR MEMBRESÍA (TEST)'}
                  </button>
                ) : (
                  <button
                    onClick={handleSubscribePartner}
                    disabled={isSubscribing}
                    className="w-full h-12 sm:h-14 rounded-xl bg-[#FAB205] hover:bg-yellow-400 active:scale-98 text-black font-display font-black text-sm sm:text-base tracking-wider uppercase transition-all shadow-xl cursor-pointer disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSubscribing ? 'ACTIVANDO...' : 'SUSCRIBIRME POR $US 4.99/MES'}
                  </button>
                )}

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full h-11 rounded-xl bg-[#101114] border border-[#26282E] text-neutral-400 hover:text-white font-display font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  VOLVER
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
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#E87A72] text-black font-display text-xs font-black px-4 py-2.5 rounded-xl shadow-2xl tracking-wider uppercase z-50 whitespace-nowrap"
        >
          {toastMessage}
        </motion.div>
      )}
    </div>
  );
};

export default ProfileScreen;
