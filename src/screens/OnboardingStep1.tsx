import React from 'react';
import { motion } from 'framer-motion';
import '../styles/fonts.css';

export interface OnboardingStep1Props {
  selectedRole: 'attendee' | 'host' | 'both';
  onSelectRole: (role: 'attendee' | 'host' | 'both') => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  isAdult: boolean;
  onToggleAdult: (isAdult: boolean) => void;
  onNext: () => void;
  onSkip: () => void;
}

const CITIES = [
  { id: 'lpz', name: 'La Paz, BO' },
  { id: 'scz', name: 'Santa Cruz, BO' },
  { id: 'cbb', name: 'Cochabamba, BO' },
  { id: 'tja', name: 'Tarija, BO' },
  { id: 'suc', name: 'Sucre, BO' },
];

export const OnboardingStep1: React.FC<OnboardingStep1Props> = ({
  selectedRole,
  onSelectRole,
  selectedCity,
  onSelectCity,
  isAdult,
  onToggleAdult,
  onNext,
  onSkip,
}) => {
  const roleOptions: Array<{
    id: 'attendee' | 'host' | 'both';
    title: string;
    desc: string;
    icon: string;
  }> = [
    {
      id: 'attendee',
      title: 'Descubrir planes y eventos',
      desc: 'Accede a listas VIP, preventas y fiestas exclusivas.',
      icon: '🎟️',
    },
    {
      id: 'host',
      title: 'Armar mis propias previas y juntadas',
      desc: 'Crea eventos, gestiona puerta y pases +1 en segundos.',
      icon: '⚡',
    },
    {
      id: 'both',
      title: 'Ambos',
      desc: 'Disfruta la noche como asistente y anfitrión.',
      icon: '🔥',
    },
  ];

  const canContinue = isAdult;

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* 1. FONDO DE PANTALLA CON OVERLAY */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none transition-transform duration-1000 scale-105"
        style={{ backgroundImage: "url('./assets/images/fondo_c.webp')" }}
      />
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black pointer-events-none" />

      {/* 2. CABECERA & INDICADOR DE PROGRESO */}
      <header className="relative z-10 w-full max-w-md mx-auto px-6 pt-[calc(1.2rem+env(safe-area-inset-top,0px))] flex flex-col items-center text-center">
        {/* Barra sutil de progreso */}
        <div className="w-full flex items-center justify-between gap-2 mb-3">
          <div className="h-1 flex-1 rounded-full bg-[#E87A72]" />
          <div className="h-1 flex-1 rounded-full bg-white/20" />
        </div>

        <span className="font-sans text-xs uppercase tracking-[0.25em] text-[#8E8E93] font-bold">
          PASO 1 DE 2
        </span>

        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-wide text-white uppercase mt-2 leading-tight">
          ¿QUÉ BUSCAS EN +1?
        </h1>

        <p className="font-sans text-xs sm:text-sm text-[#D1D5DB] mt-1.5 font-medium">
          Personaliza tu cartelera desde el primer segundo.
        </p>
      </header>

      {/* 3. CONTENIDO CENTRAL (TARJETAS DE INTENCIÓN + UBICACIÓN + +18) */}
      <main className="relative z-10 w-full max-w-md mx-auto px-6 py-2 flex-1 flex flex-col justify-center space-y-4 overflow-y-auto no-scrollbar">
        {/* Selector de intención: 3 tarjetas excluyentes */}
        <div className="flex flex-col space-y-2.5">
          <span className="font-sans text-[11px] uppercase tracking-wider text-[#8E8E93] font-bold ml-1">
            TU ROL PRINCIPAL
          </span>
          {roleOptions.map((opt) => {
            const isSelected = selectedRole === opt.id;
            return (
              <motion.button
                key={opt.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectRole(opt.id)}
                className={`w-full p-3.5 sm:p-4 rounded-2xl text-left flex items-center justify-between border transition-all cursor-pointer shadow-lg ${
                  isSelected
                    ? 'bg-[#1F2228] border-[#E87A72] shadow-[0_0_20px_rgba(232,122,114,0.18)]'
                    : 'bg-[#16171B]/90 hover:bg-[#1C1E24] border-[#26282E]'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#E87A72]/20 border border-[#E87A72]/40 text-white'
                        : 'bg-black/40 border border-white/5 text-neutral-300'
                    }`}
                  >
                    {opt.icon}
                  </div>
                  <div>
                    <h3
                      className={`font-display text-base sm:text-lg uppercase tracking-wide leading-tight ${
                        isSelected ? 'text-[#E87A72]' : 'text-white'
                      }`}
                    >
                      {opt.title}
                    </h3>
                    <p className="font-sans text-[11px] sm:text-xs text-[#8E8E93] mt-0.5 leading-snug">
                      {opt.desc}
                    </p>
                  </div>
                </div>

                {/* Radio checkmark */}
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 transition-colors ${
                    isSelected
                      ? 'border-[#E87A72] bg-[#E87A72]'
                      : 'border-white/30 bg-transparent'
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-black" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Selector de Ciudad */}
        <div className="flex flex-col space-y-1.5">
          <label
            htmlFor="onboardingCitySelect"
            className="font-sans text-[11px] uppercase tracking-wider text-[#8E8E93] font-bold ml-1 flex items-center justify-between"
          >
            <span>CIUDAD ACTUAL</span>
            <span className="text-[10px] text-[#E87A72] font-semibold">📍 COBERTURA ACTIVA</span>
          </label>
          <div className="relative">
            <select
              id="onboardingCitySelect"
              value={selectedCity}
              onChange={(e) => onSelectCity(e.target.value)}
              className="w-full py-3.5 px-4 pr-10 rounded-2xl bg-[#16171B] border border-[#26282E] focus:border-[#E87A72] text-white font-sans text-sm font-semibold appearance-none outline-none transition-colors cursor-pointer"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.name} className="bg-[#16171B] text-white">
                  {c.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8E8E93] text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* Checkbox de Mayoría de Edad (+18 Obligatorio) */}
        <div
          onClick={() => onToggleAdult(!isAdult)}
          className={`p-3 rounded-2xl border transition-all flex items-center space-x-3 cursor-pointer select-none ${
            isAdult
              ? 'bg-[#1F2228]/80 border-[#E87A72]/60'
              : 'bg-[#16171B]/80 border-[#26282E] hover:border-white/20'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
              isAdult
                ? 'bg-[#E87A72] border-[#E87A72] text-black'
                : 'bg-black/40 border-white/30 text-transparent'
            }`}
          >
            <svg
              className="w-4 h-4 stroke-current stroke-[3] fill-none"
              viewBox="0 0 24 24"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-sans text-xs sm:text-sm font-medium text-white leading-tight">
              Confirmo que soy mayor de 18 años <span className="text-[#E87A72] font-bold">*</span>
            </p>
            <p className="font-sans text-[10px] text-[#8E8E93]">
              Requerido para el acceso a listas VIP y eventos nocturnos.
            </p>
          </div>
        </div>
      </main>

      {/* 4. PIE DE ACCIÓN (BOTÓN CONTINUAR & ENLACE OMITIR) */}
      <footer className="relative z-10 w-full max-w-md mx-auto px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-2 flex flex-col items-center space-y-3">
        <motion.button
          type="button"
          whileHover={{ scale: canContinue ? 1.01 : 1 }}
          whileTap={{ scale: canContinue ? 0.98 : 1 }}
          disabled={!canContinue}
          onClick={onNext}
          className={`w-full py-4 rounded-2xl font-display text-lg tracking-wider uppercase font-bold flex items-center justify-center space-x-2 transition-all shadow-xl cursor-pointer ${
            canContinue
              ? 'bg-[#E87A72] hover:bg-[#d66e66] text-black shadow-[0_4px_25px_rgba(232,122,114,0.35)]'
              : 'bg-[#26282E] text-[#8E8E93] opacity-60 cursor-not-allowed'
          }`}
        >
          <span>CONTINUAR</span>
          <span>→</span>
        </motion.button>

        <button
          type="button"
          onClick={onSkip}
          className="font-sans text-xs text-[#8E8E93] hover:text-white transition-colors cursor-pointer py-1"
        >
          Omitir por ahora
        </button>
      </footer>
    </div>
  );
};

export default OnboardingStep1;
