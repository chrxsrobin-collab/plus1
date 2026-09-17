import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInAnonymously } from 'firebase/auth';
import '../styles/fonts.css';

export interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState<'google' | 'guest' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => {
      setErrorMessage(null);
    }, 3500);
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading('google');
    try {
      await signInWithPopup(auth, googleProvider);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error al iniciar sesión con Google:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        showError('Ventana de acceso cerrada');
      } else if (err.code === 'auth/cancelled-popup-request') {
        showError('Petición cancelada');
      } else {
        showError('Error de autenticación con Google');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleGuestSignIn = async () => {
    if (loading) return;
    setLoading('guest');
    try {
      await signInAnonymously(auth);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error al entrar como invitado:', err);
      showError('Error al iniciar sesión como invitado');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#000000] text-white flex flex-col justify-between overflow-hidden font-sans select-none px-6 py-10">
      {/* VIDEO DE FONDO EN LOOP (BACKGROUND VIDEO) */}
      <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden -z-10 bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="./assets/video/fondo_login.mp4" type="video/mp4" />
          <source src="/assets/video/fondo_login.mp4" type="video/mp4" />
        </video>
        {/* Capa de oscurecimiento para garantizar el contraste de lectura */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] pointer-events-none" />
      </div>

      {/* Degradados ambientales de iluminación nocturna */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#E87A72]/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#12C061]/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Header superior de status */}
      <div className="relative z-10 flex justify-between items-center w-full max-w-sm mx-auto pt-2">
        <span className="font-sans text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
          ACCESO EXCLUSIVO
        </span>
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-neutral-900/80 border border-neutral-800">
          <span className="w-2 h-2 rounded-full bg-[#12C061] animate-pulse" />
          <span className="font-mono text-[10px] text-neutral-300 uppercase font-semibold">
            EN VIVO
          </span>
        </div>
      </div>

      {/* Zona Central: Branding y Logotipo */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 max-w-sm mx-auto w-full my-auto text-center py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          {/* Logo Gigante +1 */}
          <h1 className="font-display text-[#E87A72] text-8xl sm:text-9xl font-black tracking-tighter leading-none select-none filter drop-shadow-[0_10px_30px_rgba(232,122,114,0.25)]">
            +1
          </h1>

          {/* Lema Oficial */}
          <p className="font-sans text-[#8E8E93] text-xs sm:text-sm font-extrabold tracking-[0.3em] uppercase mt-3">
            DONDE EMPIEZA LA NOCHE
          </p>

          <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-[#E87A72]/60 to-transparent my-4" />

          <p className="font-sans text-neutral-400 text-xs sm:text-sm max-w-[260px] leading-relaxed">
            Pases VIP digitales, confirmación con +1 en puerta y eventos exclusivos en tiempo real.
          </p>
        </motion.div>
      </div>

      {/* Zona Inferior: Botones de Onboarding Rápido */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm mx-auto space-y-3 pb-4"
      >
        {/* Botón Principal: Continuar con Google */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading !== null}
          className="w-full py-4 px-5 rounded-2xl bg-white hover:bg-neutral-100 active:scale-98 text-black font-display text-base sm:text-lg font-black tracking-wider uppercase flex items-center justify-center space-x-3 transition-all shadow-2xl focus:outline-none cursor-pointer disabled:opacity-70 disabled:cursor-wait"
        >
          {loading === 'google' ? (
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>CONECTANDO...</span>
            </div>
          ) : (
            <>
              {/* SVG Oficial Multi-Color Google G */}
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
              <span>CONTINUAR CON GOOGLE</span>
            </>
          )}
        </button>

        {/* Botón Secundario: Entrar como Invitado */}
        <button
          onClick={handleGuestSignIn}
          disabled={loading !== null}
          className="w-full py-3.5 px-4 rounded-2xl bg-transparent hover:bg-white/5 border border-[#26282E] active:scale-98 text-neutral-400 hover:text-white font-sans text-xs sm:text-sm font-bold tracking-widest uppercase flex items-center justify-center transition-all focus:outline-none cursor-pointer disabled:opacity-60"
        >
          {loading === 'guest' ? (
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
              <span>ENTRANDO...</span>
            </div>
          ) : (
            'ENTRAR COMO INVITADO'
          )}
        </button>

        <p className="text-center font-sans text-[10px] text-neutral-600 pt-2">
          Al continuar aceptas los Términos de Servicio y Privacidad de +1 VIP.
        </p>
      </motion.div>

      {/* Toast de error */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-red-500/90 text-white font-sans text-xs font-bold tracking-wide shadow-2xl backdrop-blur-md whitespace-nowrap"
        >
          {errorMessage}
        </motion.div>
      )}
    </div>
  );
};

export default AuthScreen;
