import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import '../styles/fonts.css';

export interface ScannerScreenProps {
  eventId?: string;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
  onScanSuccess?: (data: string) => void;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({
  eventId,
  onBack,
  onNavigate,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [activeEventId, setActiveEventId] = useState<string>(() => {
    return eventId || (typeof window !== 'undefined' ? localStorage.getItem('plus1_active_door_event') || '' : '');
  });
  const [isStaffPaired, setIsStaffPaired] = useState<boolean>(false);

  // Consulta los detalles del evento configurado si se pasa activeEventId
  useEffect(() => {
    if (!activeEventId) return;
    const fetchEventData = async () => {
      try {
        const snap = await getDoc(doc(db, 'events', activeEventId));
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.title) {
            setEventTitle(data.title);
          }
        }
      } catch (err) {
        console.warn('[ScannerScreen] Error cargando evento:', err);
      }
    };
    fetchEventData();
  }, [activeEventId]);

  // Solicitar acceso a la cámara trasera al montar
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
        .then((mediaStream) => {
          currentStream = mediaStream;
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play().then(() => {
              setCameraActive(true);
            }).catch(() => {
              setCameraActive(true);
            });
          }
        })
        .catch((err) => {
          console.warn('[ScannerScreen] Cámara no disponible o permiso denegado:', err);
          setCameraError(true);
        });
    } else {
      setCameraError(true);
    }

    // Detener la cámara al desmontar el componente
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('/');
    } else {
      console.log('[Navigation] -> Back to Home');
    }
  };

  const handleToggleTorch = async () => {
    const nextState = !torchOn;
    setTorchOn(nextState);

    // Intentar encender la linterna de hardware si el navegador lo soporta
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track && 'applyConstraints' in track) {
          await (track as any).applyConstraints({
            advanced: [{ torch: nextState }],
          });
        }
      }
    } catch (e) {
      console.log('[Torch] No soportado directamente en este hardware');
    }
  };

  // Procesar datos escaneados (QR de tickets o QR Maestro de Puerta)
  const handleProcessQrData = async (rawCode: string) => {
    if (!rawCode) return;
    const trimmed = rawCode.trim();

    // 1. Manejar QR Maestro de Puerta: plus1://pair-door?eventId=...&token=...
    if (trimmed.startsWith('plus1://pair-door')) {
      try {
        let queryStr = '';
        if (trimmed.includes('?')) {
          queryStr = trimmed.split('?')[1];
        }
        const params = new URLSearchParams(queryStr);
        const targetEventId = params.get('eventId');
        const token = params.get('token');

        if (!targetEventId) {
          setToastMessage('⚠️ CÓDIGO QR NO VÁLIDO: FALTA EVENT ID');
          setTimeout(() => setToastMessage(null), 3000);
          return;
        }

        const user = auth.currentUser;
        const staffUid = user?.uid || `staff_${Math.random().toString(36).substring(2, 8)}`;
        const staffName = user?.displayName || (user?.isAnonymous ? 'Staff Puerta (Invitado)' : 'Staff Puerta');

        // Persistir en Firestore: events/{eventId}/staff/{auth.currentUser.uid}
        await setDoc(
          doc(db, 'events', targetEventId, 'staff', staffUid),
          {
            userId: staffUid,
            userName: staffName,
            role: 'DOOR',
            token: token || '',
            linkedAt: Date.now(),
          },
          { merge: true }
        );

        // Guardar fallback local
        localStorage.setItem('plus1_active_door_event', targetEventId);
        setActiveEventId(targetEventId);
        setIsStaffPaired(true);

        // Consultar título del evento para mostrar en el encabezado
        const evSnap = await getDoc(doc(db, 'events', targetEventId));
        if (evSnap.exists()) {
          const d = evSnap.data();
          setEventTitle(d.title || 'EVENTO VINCULADO');
        }

        setToastMessage('🟢 MODO PUERTA ACTIVADO · EVENTO VINCULADO');
        setTimeout(() => setToastMessage(null), 3200);
        return;
      } catch (err) {
        console.error('Error al vincular staff en Firestore:', err);
        setToastMessage('⚠️ ERROR AL VINCULAR CON EL SERVIDOR');
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
    }

    // 2. Validación estándar de ticket de invitado
    triggerVerification(trimmed);
  };

  // Escaneo continuo con BarcodeDetector si está disponible en el navegador
  useEffect(() => {
    if (!('BarcodeDetector' in window)) return;

    let intervalId: any;
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['qr_code'],
      });

      intervalId = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState === 4 && cameraActive) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              if (rawValue) {
                handleProcessQrData(rawValue);
              }
            }
          } catch (e) {
            // Frame detection skipped
          }
        }
      }, 500);
    } catch (err) {
      console.warn('BarcodeDetector no inicializable:', err);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [cameraActive]);

  const triggerVerification = (code?: string) => {
    setIsVerified(true);
    const msg = '🟢 ACCESO AUTORIZADO · PASE VERIFICADO';
    setToastMessage(msg);

    if (onScanSuccess) {
      onScanSuccess(code || '#4092-VIP-VALIDATED');
    }

    setTimeout(() => {
      setIsVerified(false);
    }, 2000);

    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      
      {/* 1. VISTA DE CÁMARA / VIDEO O MOCKUP DE RESPALDO */}
      <div className="absolute inset-0 z-0 bg-[#0E0F12] flex items-center justify-center overflow-hidden">
        {/* Stream de video nativo de la cámara trasera */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            cameraActive && !cameraError ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Mockup de respaldo cuando la cámara está en entorno simulado o sin permisos */}
        {(!cameraActive || cameraError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0B0C0E] via-[#101216] to-[#08090B] p-6 text-center">
            {/* Patrón reticular táctico sutil */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#26282E 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Icono de Lente / Sensor */}
            <div className="relative w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4 shadow-xl">
              <div className="w-12 h-12 rounded-full border border-neutral-700/80 bg-neutral-950 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-[#12C061]/20 border border-[#12C061]/60 animate-pulse" />
              </div>
            </div>

            {/* Badge sutil de estado */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-neutral-400 font-sans text-xs font-semibold tracking-wider uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-[#12C061] animate-ping" />
              <span>Vista previa de cámara activa</span>
            </div>

            <p className="text-neutral-500 text-[11px] max-w-xs leading-relaxed font-sans">
              Modo simulador listo para escanear pases QR de invitados y entradas VIP.
            </p>
          </div>
        )}

        {/* Viñeta oscura periférica para destacar el visor central */}
        <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-black/40 to-black/80" />
      </div>

      {/* 2. TOP BAR FLOTANTE */}
      <header className="relative z-30 flex items-center justify-between px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3 w-full max-w-md mx-auto">
        {/* Botón Retroceso / Cerrar (←) */}
        <button
          onClick={handleBack}
          aria-label="Cerrar escáner"
          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all active:scale-90 focus:outline-none"
        >
          <span className="text-xl font-bold leading-none">←</span>
        </button>

        {/* Título Central Display */}
        <div className="flex flex-col items-center justify-center text-center max-w-[210px]">
          <h1 className="font-display text-white text-lg sm:text-xl font-black tracking-wider uppercase leading-none truncate w-full">
            {eventTitle || 'ESCANEAR PASE QR'}
          </h1>
          <span className="font-sans text-[10px] text-[#8E8E93] tracking-widest uppercase font-semibold mt-0.5 truncate w-full">
            {isStaffPaired
              ? '🟢 MODO PUERTA ACTIVADO (STAFF)'
              : eventTitle
              ? 'CONTROL DE PUERTA EN VIVO'
              : 'PUERTA +1 · CONTROL'}
          </span>
        </div>

        {/* Botón Linterna / Flash interactivo */}
        <button
          onClick={handleToggleTorch}
          aria-label="Alternar linterna"
          className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 focus:outline-none ${
            torchOn
              ? 'bg-[#FAB205] text-black border-[#FAB205] shadow-lg shadow-[#FAB205]/30'
              : 'bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border-white/15'
          }`}
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M7 2v11h3v9l7-12h-4l4-8H7zm2 2h5.75l-3.25 6.5h3.69L11.5 17.5V11H9V4z" />
          </svg>
        </button>
      </header>

      {/* 3. VISOR CENTRAL CON RETÍCULA DE ESCANEO */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 my-auto">
        <div
          className={`relative w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] rounded-3xl transition-all duration-300 ${
            isVerified ? 'scale-105' : 'scale-100'
          }`}
        >
          {/* Sombra sutil de recorte */}
          <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />

          {/* Esquinas en ángulo recto (Corners) en verde esmeralda #12C061 */}
          {/* Superior Izquierda */}
          <div
            className={`absolute top-0 left-0 w-8 h-8 border-t-[3.5px] border-l-[3.5px] rounded-tl-xl transition-colors duration-200 ${
              isVerified ? 'border-[#12C061]' : 'border-[#12C061]'
            }`}
          />
          {/* Superior Derecha */}
          <div
            className={`absolute top-0 right-0 w-8 h-8 border-t-[3.5px] border-r-[3.5px] rounded-tr-xl transition-colors duration-200 ${
              isVerified ? 'border-[#12C061]' : 'border-[#12C061]'
            }`}
          />
          {/* Inferior Izquierda */}
          <div
            className={`absolute bottom-0 left-0 w-8 h-8 border-b-[3.5px] border-l-[3.5px] rounded-bl-xl transition-colors duration-200 ${
              isVerified ? 'border-[#12C061]' : 'border-[#12C061]'
            }`}
          />
          {/* Inferior Derecha */}
          <div
            className={`absolute bottom-0 right-0 w-8 h-8 border-b-[3.5px] border-r-[3.5px] rounded-br-xl transition-colors duration-200 ${
              isVerified ? 'border-[#12C061]' : 'border-[#12C061]'
            }`}
          />

          {/* Línea láser horizontal animada */}
          <motion.div
            animate={{
              y: [12, 240, 12],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.4,
              ease: 'easeInOut',
            }}
            className="absolute left-2 right-2 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#12C061] to-transparent shadow-[0_0_12px_#12C061] pointer-events-none"
          />

          {/* Marca de agua central suave en visor */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <svg className="w-16 h-16 text-white stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
      </main>

      {/* 4. INDICADOR INFERIOR Y BOTONES DE PRUEBA */}
      <footer className="relative z-30 flex flex-col items-center px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] w-full max-w-md mx-auto space-y-3">
        {/* Pastilla oscura de instrucción */}
        <div className="px-4 py-2 rounded-full bg-black/75 backdrop-blur-md border border-neutral-800 text-center shadow-lg">
          <p className="font-sans text-xs text-neutral-300 font-medium tracking-wide">
            {isStaffPaired
              ? 'Modo Puerta activo · Escanea tickets o pases de invitados'
              : 'Apunta al código QR del invitado o al QR Maestro de Puerta'}
          </p>
        </div>

        {/* Acciones de simulación en vivo */}
        <div className="w-full flex flex-col gap-2">
          {/* Botón simular lectura de QR Maestro de Puerta */}
          <button
            onClick={() => {
              const testEventId = activeEventId || 'pepe-birthday';
              handleProcessQrData(`plus1://pair-door?eventId=${testEventId}&token=door_key_${Date.now()}`);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#16171B] hover:bg-neutral-900 border border-[#FAB205]/50 hover:border-[#FAB205] text-[#FAB205] font-display text-xs font-black tracking-wider uppercase flex items-center justify-center space-x-2 transition-all active:scale-98 shadow-md focus:outline-none cursor-pointer"
          >
            <span className="text-sm">🔑</span>
            <span>SIMULAR ESCANEO DE QR MAESTRO (STAFF)</span>
          </button>

          {/* Botón de simulación para validar entrada (Mockup Check-in) */}
          <button
            onClick={() => triggerVerification()}
            className="w-full py-3 px-5 rounded-2xl bg-[#121316] hover:bg-neutral-900 border border-[#12C061]/50 hover:border-[#12C061] text-[#12C061] font-display text-xs sm:text-sm font-black tracking-wider uppercase flex items-center justify-center space-x-2 transition-all active:scale-98 shadow-xl focus:outline-none cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#12C061] animate-pulse" />
            <span>SIMULAR ESCANEO EXITOSO (CHECK-IN)</span>
          </button>
        </div>
      </footer>

      {/* 5. TOAST DE CONFIRMACIÓN */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-[#121316] border-2 border-[#12C061] text-white font-display font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-2xl tracking-wider uppercase flex items-center space-x-2 whitespace-nowrap"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScannerScreen;
