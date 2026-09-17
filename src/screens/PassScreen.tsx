import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TicketShape } from '../components/TicketShape';
import { PassItem } from '../types/home';
import { mockMamacitaPass } from '../data/mockData';
import '../styles/fonts.css';

export interface PassScreenProps {
  pass?: PassItem;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
}

export const PassScreen: React.FC<PassScreenProps> = ({
  pass = mockMamacitaPass,
  onBack,
  onNavigate,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('/');
    } else {
      console.log('[Navigation] -> Back to Home');
    }
  };

  const handleDownloadQr = () => {
    setToastMessage('Pase guardado en Fotos');
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#07080A] text-white flex flex-col justify-between overflow-x-hidden font-sans select-none pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      {/* Fondo con textura sutil o fallback oscuro */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-cover bg-center"
        style={{
          backgroundImage: "url('./assets/images/fondo_iniciob.webp')",
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      />

      {/* Degradado superior para la barra de navegación */}
      <div className="fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-[#07080A] via-[#07080A]/80 to-transparent pointer-events-none z-10" />

      {/* Contenedor central acotado al ancho de smartphone */}
      <div className="relative z-20 flex-1 flex flex-col w-full max-w-md mx-auto px-5">
        
        {/* 1. TOP NAVIGATION BAR */}
        <header className="flex items-center justify-between pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3 w-full relative z-30">
          {/* Botón de retroceso: Ícono de flecha hacia la izquierda (←) */}
          <button
            onClick={handleBack}
            aria-label="Regresar a inicio"
            className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 focus:outline-none"
          >
            <span className="text-xl font-bold leading-none">←</span>
          </button>

          {/* Título central: Pase (Puerta) */}
          <h1 className="font-sans text-white text-base sm:text-lg font-semibold tracking-wide text-center flex-1 pr-10">
            Pase (Puerta)
          </h1>
        </header>

        {/* 2. CUERPO DEL BOLETO FÍSICO DIGITALIZADO */}
        <main className="flex-1 flex flex-col items-center justify-center py-2 my-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="w-full flex justify-center"
          >
            <TicketShape>
              
              {/* SECCIÓN 1: CABECERA DEL EVENTO */}
              <div className="flex flex-col items-center justify-center text-center pt-2">
                {/* Subtítulo superior o caracteres */}
                <span className="font-sans text-white text-xl sm:text-2xl font-bold tracking-widest leading-none mb-1 opacity-90">
                  {pass.subHeader || '妈妈'}
                </span>
                {/* Título grande de impacto en Antonio Bold */}
                <h2 className="font-display text-white text-[38px] sm:text-[42px] font-black tracking-tight leading-none uppercase">
                  {pass.title || 'MAMACITA'}
                </h2>
              </div>

              {/* SECCIÓN 2: VISOR Y CÓDIGO QR CENTRAL */}
              <div className="flex-1 flex items-center justify-center my-3 relative">
                {/* Marco de enfoque tipo visor de cámara */}
                <div className="relative w-[210px] h-[210px] sm:w-[225px] sm:h-[225px] flex items-center justify-center p-3">
                  
                  {/* Esquina superior izquierda ┌ */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-[3.5px] border-l-[3.5px] border-[#12c061] rounded-tl-xl pointer-events-none" />
                  {/* Esquina superior derecha ┐ */}
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-[3.5px] border-r-[3.5px] border-[#12c061] rounded-tr-xl pointer-events-none" />
                  {/* Esquina inferior izquierda └ */}
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3.5px] border-l-[3.5px] border-[#12c061] rounded-bl-xl pointer-events-none" />
                  {/* Esquina inferior derecha ┘ */}
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3.5px] border-r-[3.5px] border-[#12c061] rounded-br-xl pointer-events-none" />

                  {/* Código QR con alto contraste sobre fondo oscuro idéntico a la referencia */}
                  <div className="w-[175px] h-[175px] sm:w-[190px] sm:h-[190px] flex items-center justify-center p-1 rounded-lg overflow-hidden bg-[#0A0C0E]">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                      {/* Ojo Superior Izquierdo */}
                      <rect x="5" y="5" width="28" height="28" rx="2" fill="currentColor" />
                      <rect x="9" y="9" width="20" height="20" fill="#0A0C0E" />
                      <rect x="13" y="13" width="12" height="12" rx="1" fill="currentColor" />

                      {/* Ojo Superior Derecho */}
                      <rect x="67" y="5" width="28" height="28" rx="2" fill="currentColor" />
                      <rect x="71" y="9" width="20" height="20" fill="#0A0C0E" />
                      <rect x="75" y="13" width="12" height="12" rx="1" fill="currentColor" />

                      {/* Ojo Inferior Izquierdo */}
                      <rect x="5" y="67" width="28" height="28" rx="2" fill="currentColor" />
                      <rect x="9" y="71" width="20" height="20" fill="#0A0C0E" />
                      <rect x="13" y="75" width="12" height="12" rx="1" fill="currentColor" />

                      {/* Módulos de datos estilo QR de alta densidad */}
                      <rect x="38" y="6" width="6" height="6" fill="currentColor" />
                      <rect x="48" y="6" width="12" height="6" fill="currentColor" />
                      <rect x="38" y="16" width="6" height="12" fill="currentColor" />
                      <rect x="54" y="16" width="6" height="6" fill="currentColor" />
                      <rect x="48" y="26" width="12" height="6" fill="currentColor" />

                      <rect x="6" y="38" width="12" height="6" fill="currentColor" />
                      <rect x="22" y="38" width="6" height="6" fill="currentColor" />
                      <rect x="32" y="38" width="18" height="6" fill="currentColor" />
                      <rect x="56" y="38" width="12" height="6" fill="currentColor" />
                      <rect x="74" y="38" width="6" height="12" fill="currentColor" />
                      <rect x="86" y="38" width="8" height="6" fill="currentColor" />

                      <rect x="16" y="48" width="12" height="6" fill="currentColor" />
                      <rect x="34" y="48" width="6" height="18" fill="currentColor" />
                      <rect x="46" y="48" width="14" height="6" fill="currentColor" />
                      <rect x="66" y="48" width="8" height="6" fill="currentColor" />
                      <rect x="80" y="48" width="14" height="6" fill="currentColor" />

                      <rect x="6" y="58" width="6" height="6" fill="currentColor" />
                      <rect x="16" y="58" width="12" height="6" fill="currentColor" />
                      <rect x="46" y="58" width="6" height="12" fill="currentColor" />
                      <rect x="58" y="58" width="16" height="6" fill="currentColor" />
                      <rect x="86" y="58" width="8" height="12" fill="currentColor" />

                      <rect x="38" y="70" width="8" height="6" fill="currentColor" />
                      <rect x="52" y="70" width="12" height="6" fill="currentColor" />
                      <rect x="70" y="70" width="6" height="12" fill="currentColor" />
                      <rect x="82" y="70" width="12" height="6" fill="currentColor" />

                      <rect x="38" y="80" width="18" height="6" fill="currentColor" />
                      <rect x="62" y="80" width="8" height="14" fill="currentColor" />
                      <rect x="76" y="86" width="18" height="8" fill="currentColor" />
                      <rect x="44" y="90" width="12" height="5" fill="currentColor" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: PIE DEL TICKET (TITULAR Y VERIFICACIÓN) */}
              <div className="flex flex-col items-center justify-center text-center pb-2">
                {/* Nombre y Tipo de Lista */}
                <h3 className="font-display text-white text-xl sm:text-[22px] font-black tracking-wide uppercase leading-tight">
                  {pass.holderName || 'CRIS PÉREZ'} · {pass.listType || 'LISTA G.'}
                </h3>
                {/* Identificador y Proveedor de Verificación */}
                <p className="font-sans text-neutral-400 text-xs sm:text-sm font-semibold tracking-wider uppercase mt-1 leading-tight">
                  ID: {pass.ticketId || '#4092'} · {pass.verifiedProvider || 'VERIFICADO CON GOOGLE'}
                </p>
              </div>

            </TicketShape>
          </motion.div>
        </main>

        {/* 4. BOTÓN INFERIOR DE RESPALDO (IN-APP) */}
        <div className="w-full pt-4 pb-3 flex justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDownloadQr}
            className="w-full max-w-[340px] py-3.5 px-5 rounded-2xl bg-white hover:bg-neutral-100 text-black font-display text-base font-black tracking-wider uppercase flex items-center justify-center transition-colors shadow-lg focus:outline-none"
          >
            DESCARGAR QR / GUARDAR EN FOTOS
          </motion.button>
        </div>

      </div>

      {/* Notificación Toast Flotante de Confirmación */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#12c061] text-black font-display text-xs font-black px-4 py-2 rounded-xl shadow-2xl tracking-wider uppercase z-50"
        >
          {toastMessage}
        </motion.div>
      )}
    </div>
  );
};

export default PassScreen;
