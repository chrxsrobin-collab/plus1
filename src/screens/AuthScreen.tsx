import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import '../styles/fonts.css';

export interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      if (user) {
        const userName = user.displayName || "USUARIO VIP";
        await setDoc(doc(db, "users", user.uid), { name: userName, streak: 1, points: 0 }, { merge: true });
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error al autenticar con Google:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('No se pudo completar el acceso con Google. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* 1. VIDEO DE FONDO EN LOOP CONTINUO */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      >
        <source src="./assets/video/fondo_login.mp4" type="video/mp4" />
      </video>

      {/* Capa de contraste y degradado oscuro sobre el video */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black pointer-events-none" />
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-none" />

      {/* 2. CONTENIDO SUPERIOR / BRANDING */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pt-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          {/* Logo gigante +1 en Salmón #E87A72 con Antonio Bold */}
          <h1 className="font-display text-[96px] sm:text-[120px] font-black tracking-tighter text-[#E87A72] leading-none drop-shadow-[0_10px_35px_rgba(232,122,114,0.35)]">
            +1
          </h1>

          {/* Lema: TU EVENTO. TU GENTE. */}
          <p className="font-sans text-xs sm:text-sm font-bold tracking-[0.28em] text-[#D1D5DB] uppercase mt-3">
            TU EVENTO. TU GENTE.
          </p>

          <div className="w-8 h-[2px] bg-[#E87A72]/40 rounded-full mt-4" />
        </motion.div>
      </div>

      {/* 3. BOTÓN DE ACCESO ÚNICO CON GOOGLE */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-6 pb-8 flex flex-col items-center space-y-3">
        {errorMsg && (
          <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-sans">
            {errorMsg}
          </div>
        )}

        {/* Botón Principal: Continuar con Google */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full h-14 px-5 rounded-2xl bg-[#FFFFFF] hover:bg-neutral-100 text-black font-sans font-bold text-sm sm:text-base flex items-center justify-center space-x-3 shadow-2xl transition-all focus:outline-none cursor-pointer disabled:opacity-60"
        >
          {/* Icono de Google oficial */}
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span className="tracking-wide uppercase font-sans font-bold">
            {isLoading ? 'CONECTANDO...' : 'CONTINUAR CON GOOGLE'}
          </span>
        </motion.button>

        {/* Términos y privacidad sutil */}
        <p className="text-[11px] text-neutral-500 text-center font-sans pt-1">
          Al continuar aceptas nuestros términos y acceso exclusivo +1 VIP
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
