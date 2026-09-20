import React from 'react';
import { motion } from 'framer-motion';
import '../styles/fonts.css';

export interface OnboardingStep2Props {
  selectedInterests: string[];
  onToggleInterest: (interest: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

const INTEREST_TAGS = [
  { id: 'reggaeton', label: 'Reggaetón', emoji: '🍑' },
  { id: 'techno', label: 'Electrónica / Techno', emoji: '🎧' },
  { id: 'rock', label: 'Indie & Live Rock', emoji: '🎸' },
  { id: 'previas', label: 'Previas & Juntadas', emoji: '🍻' },
  { id: 'clubs', label: 'Boliches & Clubs', emoji: '🪩' },
  { id: 'lounges', label: 'Cocktails & Lounges', emoji: '🍸' },
  { id: 'festivals', label: 'Festivales & Open Air', emoji: '⚡' },
  { id: 'rooftops', label: 'VIP & Rooftops', emoji: '🏙️' },
];

export const OnboardingStep2: React.FC<OnboardingStep2Props> = ({
  selectedInterests,
  onToggleInterest,
  onBack,
  onSubmit,
  isSubmitting = false,
}) => {
  const count = selectedInterests.length;
  const isReady = count >= 3;

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* 1. FONDO DE PANTALLA CON OVERLAY */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none transition-transform duration-1000 scale-105"
        style={{ backgroundImage: "url('./assets/images/fondo_a.webp')" }}
      />
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/40 to-black pointer-events-none" />

      {/* 2. CABECERA & INDICADOR DE PROGRESO */}
      <header className="relative z-10 w-full max-w-md mx-auto px-6 pt-[calc(1.2rem+env(safe-area-inset-top,0px))] flex flex-col items-center text-center">
        {/* Barra superior con botón volver */}
        <div className="w-full flex items-center justify-between gap-2 mb-3">
          <div className="h-1 flex-1 rounded-full bg-[#E87A72]" />
          <div className="h-1 flex-1 rounded-full bg-[#12C061]" />
        </div>

        <div className="w-full flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-[#16171B]/80 hover:bg-[#1C1E24] border border-[#26282E] flex items-center justify-center text-white/80 hover:text-white transition-all active:scale-95 cursor-pointer"
            aria-label="Volver al paso anterior"
          >
            ←
          </button>
          <span className="font-sans text-xs uppercase tracking-[0.25em] text-[#8E8E93] font-bold">
            PASO 2 DE 2
          </span>
          <div className="w-8" />
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-wide text-white uppercase mt-2 leading-tight">
          ELIGE TUS INTERESES
        </h1>

        <p className="font-sans text-xs sm:text-sm text-[#D1D5DB] mt-1.5 font-medium max-w-xs">
          Selecciona al menos 3 para recomendarte los mejores eventos.
        </p>

        {/* Contador reactivo */}
        <div className="mt-2.5 px-3 py-1 rounded-full bg-[#16171B]/90 border border-[#26282E] inline-flex items-center space-x-1.5">
          <span
            className={`font-sans text-xs font-bold transition-colors ${
              isReady ? 'text-[#12C061]' : 'text-[#8E8E93]'
            }`}
          >
            ({count}/3 seleccionados)
          </span>
          {isReady && (
            <span className="text-[#12C061] text-xs font-black">✓</span>
          )}
        </div>
      </header>

      {/* 3. NUBE DE CHIPS / TAGS INTERACTIVOS */}
      <main className="relative z-10 w-full max-w-md mx-auto px-6 py-4 flex-1 flex flex-col justify-center overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {INTEREST_TAGS.map((tag) => {
            const isSelected = selectedInterests.includes(tag.label);
            return (
              <motion.button
                key={tag.id}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onToggleInterest(tag.label)}
                className={`py-3.5 px-3 rounded-2xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer shadow-md ${
                  isSelected
                    ? 'bg-[#E87A72]/20 border-[#E87A72] text-white shadow-[0_0_16px_rgba(232,122,114,0.22)]'
                    : 'bg-[#16171B]/90 hover:bg-[#1E2026] border-[#26282E] text-neutral-300'
                }`}
              >
                <span className="text-xl shrink-0">{tag.emoji}</span>
                <span className="font-sans text-xs sm:text-[13px] font-bold leading-tight truncate">
                  {tag.label}
                </span>
                {isSelected && (
                  <span className="ml-auto text-[#E87A72] text-xs font-black">
                    ●
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Mensaje de ayuda si aún faltan selecciones */}
        {!isReady && (
          <p className="font-sans text-[11px] text-[#8E8E93] text-center mt-4">
            Te faltan {3 - count} para desbloquear tu cartelera personalizada
          </p>
        )}
      </main>

      {/* 4. BOTÓN CTA FINAL */}
      <footer className="relative z-10 w-full max-w-md mx-auto px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-2 flex flex-col items-center space-y-2">
        <motion.button
          type="button"
          whileHover={{ scale: isReady && !isSubmitting ? 1.01 : 1 }}
          whileTap={{ scale: isReady && !isSubmitting ? 0.98 : 1 }}
          disabled={!isReady || isSubmitting}
          onClick={onSubmit}
          className={`w-full py-4 rounded-2xl font-display text-lg tracking-wider uppercase font-bold flex items-center justify-center space-x-2 transition-all shadow-xl cursor-pointer ${
            isReady && !isSubmitting
              ? 'bg-[#12C061] hover:bg-[#0fa653] text-black shadow-[0_4px_25px_rgba(18,192,97,0.35)]'
              : 'bg-[#26282E] text-[#8E8E93] opacity-60 cursor-not-allowed'
          }`}
        >
          <span>{isSubmitting ? 'CONFIGURANDO...' : 'ENTRAR A +1 🚀'}</span>
        </motion.button>
      </footer>
    </div>
  );
};

export default OnboardingStep2;
