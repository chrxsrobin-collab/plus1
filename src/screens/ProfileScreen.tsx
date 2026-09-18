import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, CreatedEventItem } from '../types/home';
import { mockUserProfile, mockSouvenirs } from '../data/mockData';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import BottomNav from '../components/BottomNav';
import '../styles/fonts.css';

export interface ProfileScreenProps {
  user?: UserProfile;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
  onUpdateName?: (newName: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user = mockUserProfile,
  onBack,
  onNavigate,
  onUpdateName,
}) => {
  const [activeModal, setActiveModal] = useState<
    'events' | 'streak' | 'store' | 'subscription' | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userEvents, setUserEvents] = useState<CreatedEventItem[]>([]);

  // Estado del nombre de usuario y modo edición inline
  const [displayName, setDisplayName] = useState<string>(() => {
    return (
      auth.currentUser?.displayName ||
      user.name ||
      (typeof window !== 'undefined' ? localStorage.getItem('plus1_display_name') : null) ||
      'CHRIS G.'
    );
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(displayName);
  const [isSavingName, setIsSavingName] = useState(false);

  React.useEffect(() => {
    if (user.name) {
      setDisplayName(user.name);
    }
  }, [user.name]);

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
      if (typeof window !== 'undefined') {
        localStorage.setItem('plus1_display_name', trimmed);
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

  // Escucha reactiva en tiempo real de eventos creados
  React.useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    const eventsRef = collection(db, 'events');
    const q = currentUid
      ? query(eventsRef, where('hostUserId', '==', currentUid))
      : eventsRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CreatedEventItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || 'Evento sin título',
            dateStr: `${data.date || 'Próximamente'} · ${data.startTime || '22:00'}`,
            status: data.type === 'private' ? 'Privado' : 'Activo',
            guestsCount: 0,
            maxCapacity: data.maxCapacity || 150,
          };
        });
        setUserEvents(list);
      },
      (err) => {
        console.warn('Error escuchando eventos en ProfileScreen:', err);
        setUserEvents([]);
      }
    );

    return () => unsubscribe();
  }, []);

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
    <div className="relative w-full min-h-[100dvh] bg-[#000000] text-white flex flex-col justify-between overflow-x-hidden font-sans select-none pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
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
          {/* Avatar circular con aro salmón #E87A72 */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'backOut' }}
            className="relative w-24 h-24 rounded-full p-1 border-2 border-[#E87A72] bg-[#16171B] shadow-2xl flex items-center justify-center overflow-hidden"
          >
            <img
              src={user.avatarUrl}
              alt={user.name || 'Chris G.'}
              className="w-full h-full object-cover rounded-full"
            />
          </motion.div>

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

          {/* Badge de Membresía: PLUS MEMBER (oro) / REGULAR */}
          <div className="mt-2">
            {user.isPlusMember ? (
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#FAB205] text-black font-display font-black text-xs uppercase tracking-wider shadow-md">
                PLUS MEMBER
              </span>
            ) : (
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#26282E] text-neutral-300 font-display font-bold text-xs uppercase tracking-wider">
                USUARIO REGULAR
              </span>
            )}
          </div>
        </div>

        {/* 3. GRID DE 3 MÉTRICAS DE GAMIFICACIÓN */}
        <div className="grid grid-cols-3 gap-2.5 w-full mt-2">
          
          {/* Tarjeta 1: EVENTOS */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveModal('events')}
            className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg"
          >
            <div className="text-xl mb-1">📅</div>
            <span className="font-display text-white text-3xl sm:text-[34px] font-black tracking-tight leading-none my-1">
              {userEvents.length}
            </span>
            <span className="font-display text-neutral-400 text-[11px] font-bold tracking-wider uppercase">
              EVENTOS
            </span>
          </motion.div>

          {/* Tarjeta 2: RACHA (Sustituye a STREAK) */}
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
                {user.streakCount ?? 4}
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
              {user.plusPoints ?? 380}
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
                    SUBSCRIPTION ($5/MONTH)
                  </span>
                  <span className="font-sans text-neutral-400 text-xs block">
                    Cupos ilimitados, analíticas y soporte VIP
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

      {/* 5. BOTTOM NAVIGATION BAR FIJA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto w-full">
        <BottomNav activeTab="home" onTabSelect={(tab) => {
          if (tab === 'home') onNavigate ? onNavigate('/') : handleBack();
          else if (tab === 'passes') onNavigate ? onNavigate('/passes') : null;
          else if (tab === 'search') onNavigate ? onNavigate('/explore') : null;
        }} />
      </div>

      {/* MODAL 1: GESTIÓN DE EVENTOS */}
      <AnimatePresence>
        {activeModal === 'events' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[24px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              >
                ✕
              </button>

              <h3 className="font-display text-white text-xl font-black tracking-wide uppercase mb-3">
                MIS EVENTOS
              </h3>

              {/* Botón Crear Nuevo Evento */}
              <button
                onClick={() => {
                  setActiveModal(null);
                  if (onNavigate) onNavigate('/create-event');
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#E87A72] text-black font-display font-black text-sm tracking-wider uppercase mb-3.5 flex items-center justify-center shadow active:scale-98"
              >
                [ + ] CREAR NUEVO EVENTO
              </button>

              <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                {userEvents.length === 0 ? (
                  <div className="py-8 px-4 text-center bg-neutral-900/80 border border-neutral-800 rounded-2xl my-2">
                    <span className="text-3xl block mb-2">🎪</span>
                    <p className="font-sans text-neutral-300 text-xs sm:text-sm font-semibold uppercase tracking-wider leading-relaxed">
                      NO HAS CREADO NINGÚN EVENTO TODAVÍA
                    </p>
                    <p className="font-sans text-neutral-500 text-[11px] mt-1">
                      Crea un evento público o privado para emitir listas y pases QR
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
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            evt.status === 'Activo'
                              ? 'bg-[#12C061]/20 text-[#12C061] border border-[#12C061]/40'
                              : evt.status === 'Finalizado'
                              ? 'bg-neutral-800 text-neutral-400'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-xs">
                        <span className="font-sans text-neutral-400">
                          {evt.guestsCount} / {evt.maxCapacity} invitados
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setActiveModal(null);
                              if (onNavigate) {
                                onNavigate(`/create-event?edit=${evt.id}`);
                              }
                            }}
                            className="font-display text-neutral-300 hover:text-white font-bold uppercase cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => showToast(`Control de puerta: ${evt.title}`)}
                            className="font-display text-[#12C061] hover:underline font-bold uppercase cursor-pointer"
                          >
                            Puerta
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: INFORMATIVO DE RACHA */}
      <AnimatePresence>
        {activeModal === 'streak' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[24px] bg-[#16171B] border border-[#26282E] p-6 shadow-2xl relative text-center"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              >
                ✕
              </button>

              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-3xl mx-auto mb-3">
                🔥
              </div>

              <h3 className="font-display text-white text-2xl font-black tracking-wide uppercase mb-2">
                RACHA DE 4 EVENTOS
              </h3>

              <p className="font-sans text-neutral-300 text-sm leading-relaxed mb-5">
                Llevas <strong>4 eventos consecutivos</strong> asistidos usando tu QR en puerta. ¡No pierdas tu racha este fin de semana para duplicar tus Pluscoins!
              </p>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 rounded-xl bg-[#F17D02] text-black font-display font-black text-sm tracking-wider uppercase hover:bg-orange-600 transition-colors"
              >
                CONTINUAR RACHA
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: TIENDA DE SOUVENIRS (PLUSCOINS) */}
      <AnimatePresence>
        {activeModal === 'store' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[24px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              >
                ✕
              </button>

              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xl">⭐</span>
                <h3 className="font-display text-white text-xl font-black tracking-wide uppercase">
                  380 PLUSCOINS · TIENDA +1
                </h3>
              </div>

              <p className="font-sans text-neutral-300 text-xs mb-3.5 leading-relaxed">
                Tus Pluscoins acumuladas por asistencia y rachas. Úsalas para canjear merchandising oficial y beneficios en puerta.
              </p>

              <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
                {mockSouvenirs.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-[#16171B] flex items-center justify-center text-xl">
                        {item.imageEmoji}
                      </div>
                      <div>
                        <h4 className="font-display text-white text-xs font-black uppercase line-clamp-1">
                          {item.name}
                        </h4>
                        <span className="font-sans text-[#FAB205] text-xs font-bold block mt-0.5">
                          {item.pointsCost} +COINS
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => showToast(`Canje solicitado: ${item.name}`)}
                      className="py-1.5 px-3 rounded-lg bg-white hover:bg-neutral-200 text-black font-display font-black text-xs uppercase tracking-wider"
                    >
                      Canjear
                    </button>
                  </div>
                ))}
              </div>
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
              className="w-full max-w-sm rounded-[24px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              >
                ✕
              </button>

              <div className="w-12 h-12 rounded-xl bg-[#FAB205]/10 border border-[#FAB205]/30 flex items-center justify-center text-2xl mb-2.5">
                👑
              </div>

              <h3 className="font-display text-white text-2xl font-black tracking-wide uppercase leading-tight">
                PLAN SUSCRIPCIÓN PLUS
              </h3>
              <p className="font-display text-[#FAB205] text-sm font-bold uppercase mb-4">
                $5 / MES (Bs. 35)
              </p>

              <div className="space-y-2.5 font-sans text-xs text-neutral-300 mb-5">
                <div className="flex items-start space-x-2">
                  <span className="text-[#FAB205]">✦</span>
                  <span><strong>Cupos ilimitados:</strong> Publica eventos masivos sin tope de 150 invitados.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#FAB205]">✦</span>
                  <span><strong>Analíticas en tiempo real:</strong> Conoce la hora pico de ingreso y tasa de asistencia.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#FAB205]">✦</span>
                  <span><strong>Enlaces RRPP:</strong> Asigna comisiones y listas personalizadas a promotores.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#FAB205]">✦</span>
                  <span><strong>Soporte Prioritario:</strong> Asistencia directa en puerta y línea exclusiva 24/7.</span>
                </div>
              </div>

              <button
                onClick={() => {
                  showToast('¡Suscripción Plus activada!');
                  setActiveModal(null);
                }}
                className="w-full py-3 rounded-xl bg-[#FAB205] text-black font-display font-black text-sm tracking-wider uppercase hover:bg-yellow-500 transition-colors shadow-lg"
              >
                ACTIVAR SUSCRIPCIÓN PLUS
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. BOTTOM NAVIGATION BAR FIJA AL FONDO */}
      <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto w-full">
        <BottomNav
          activeTab="home"
          onTabSelect={(tab) => {
            if (tab === 'home') {
              handleBack();
            } else if (tab === 'passes') {
              if (onNavigate) onNavigate('/passes');
            } else if (tab === 'search') {
              if (onNavigate) onNavigate('/explore');
            }
          }}
        />
      </div>

      {/* TOAST FLOTANTE */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#E87A72] text-black font-display text-xs font-black px-4 py-2.5 rounded-xl shadow-2xl tracking-wider uppercase z-50 whitespace-nowrap"
        >
          {toastMessage}
        </motion.div>
      )}
    </div>
  );
};

export default ProfileScreen;
