import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile } from '../types/home';

interface TopHudProps {
  user: UserProfile;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  user,
  onNotificationsClick,
  onProfileClick,
}) => {
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Escucha reactiva de notificaciones no leídas
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUnreadNotifCount(snapshot.docs.length);
      },
      (error) => {
        console.warn('Error escuchando notificaciones en TopHud:', error);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  const displayCount = auth.currentUser ? unreadNotifCount : (user.unreadNotifications || 0);
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center justify-between px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-2 w-full select-none z-20"
    >
      {/* Logo +1 en color Salmón / Coral #E87A72 */}
      <div className="flex items-center cursor-pointer group">
        <span className="font-display text-[#E87A72] text-[40px] font-black tracking-tight leading-none hover:opacity-90 transition-opacity">
          +1
        </span>
      </div>

      {/* Acciones Derecha: Campana con Badge Salmón y Avatar */}
      <div className="flex items-center space-x-3.5">
        {/* Notificaciones */}
        <button
          onClick={onNotificationsClick}
          aria-label="Notificaciones"
          className="relative p-1 text-white hover:text-[#E87A72] transition-colors focus:outline-none cursor-pointer"
        >
          <svg
            className="w-6 h-6 fill-current"
            viewBox="0 0 24 24"
          >
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
          </svg>

          {/* Badge Contador Salmón #E87A72 */}
          {displayCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-[#E87A72] text-black text-[10px] font-display font-black rounded-full w-4 h-4 flex items-center justify-center border border-black animate-pulse">
              {displayCount}
            </span>
          )}
        </button>

        {/* Avatar de Usuario interactivo (Dirige a /profile) */}
        <button
          onClick={onProfileClick}
          aria-label="Perfil de usuario"
          className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-[#E87A72] bg-[#16171B] overflow-hidden focus:outline-none transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer shadow-md flex items-center justify-center"
        >
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
          />
        </button>
      </div>
    </motion.header>
  );
};

export default TopHud;
