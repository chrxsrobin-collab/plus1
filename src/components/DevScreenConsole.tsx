import React, { useState } from 'react';

export interface DevScreenConsoleProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isPartner?: boolean;
  onTogglePartner?: (isPartner: boolean) => void;
  onAddDemoTicket?: () => void;
}

export const DevScreenConsole: React.FC<DevScreenConsoleProps> = ({
  currentRoute,
  onNavigate,
  isPartner = false,
  onTogglePartner,
  onAddDemoTicket,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const screens = [
    {
      category: 'Pantallas Principales',
      items: [
        { id: '/', label: 'Inicio', sublabel: 'HomeScreen (Cover Flow + Agenda)', icon: '🏠' },
        { id: '/tickets', label: 'Mis Tickets', sublabel: 'TicketsScreen (Boleto ticket.webp)', icon: '🎟️' },
        { id: '/profile', label: 'Mi Perfil', sublabel: `ProfileScreen (${isPartner ? 'PRO Creador' : 'FREE Usuario'})`, icon: isPartner ? '👑' : '👤' },
        { id: '/create-event', label: 'Crear Evento', sublabel: 'CreateEventScreen (Formulario + Tags)', icon: '➕' },
        { id: '/scanner', label: 'Escáner QR Puerta', sublabel: 'ScannerScreen (Badge 1/2 y 2/2)', icon: '📷' },
        { id: '/explore', label: 'Explorar Eventos', sublabel: 'ExploreScreen (Búsqueda + Filtros)', icon: '🔍' },
      ],
    },
    {
      category: 'Flujos & Onboarding',
      items: [
        { id: '/auth', label: 'Autenticación', sublabel: 'AuthScreen (Login + Google)', icon: '🔐' },
        { id: '/onboarding', label: 'Onboarding Completo', sublabel: 'OnboardingScreen (Paso 1 y 2)', icon: '🚀' },
      ],
    },
    {
      category: 'Gestión & Experiencias',
      items: [
        { id: '/e/pepe-birthday', label: 'Invitación Evento', sublabel: 'EventInviteModal (Deep Link /e/)', icon: '💌' },
        { id: '/manage-event/pepe-birthday', label: 'Gestor de Evento', sublabel: 'EventManagerScreen (Live Analytics)', icon: '📊' },
      ],
    },
  ];

  return (
    <>
      {/* 1. Botón Flotante Disparador de la Consola */}
      <div className="fixed bottom-4 right-4 z-[9999] select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir Consola de Pantallas"
          className="bg-[#121316]/95 hover:bg-[#1A1C22] text-white border border-[#E87A72]/60 hover:border-[#E87A72] rounded-full px-3.5 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.85)] flex items-center gap-2 transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <span className="text-base leading-none">🎛️</span>
          <span className="font-display font-black text-xs tracking-wider uppercase">PANTALLAS</span>
          <span className="text-[10px] font-sans font-bold text-[#E87A72] bg-[#E87A72]/15 px-2 py-0.5 rounded-full border border-[#E87A72]/30">
            {currentRoute === '/' ? 'INICIO' : currentRoute.replace('/', '').toUpperCase().slice(0, 8)}
          </span>
        </button>
      </div>

      {/* 2. Modal / Drawer de la Consola de Revisión */}
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm select-none animate-fadeIn">
          <div className="bg-[#121418] border border-neutral-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[88vh] flex flex-col justify-between overflow-hidden">
            
            {/* Header de la Consola */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎛️</span>
                <div>
                  <h3 className="font-display font-black text-white text-base sm:text-lg tracking-wide uppercase leading-none">
                    CONSOLA DE PANTALLAS
                  </h3>
                  <span className="font-sans text-[10px] text-neutral-400 font-medium">
                    Navega y prueba cada pantalla en tiempo real
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Fila de Controles Rápidos: Toggle FREE / PRO y Demo Ticket */}
            <div className="py-3 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-sans text-neutral-400 font-bold uppercase">Rol Perfil:</span>
                <button
                  onClick={() => onTogglePartner && onTogglePartner(!isPartner)}
                  className={`px-3 py-1 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all border cursor-pointer ${
                    isPartner
                      ? 'bg-[#E87A72]/20 border-[#E87A72] text-[#E87A72]'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                  }`}
                >
                  {isPartner ? '👑 MODO PRO (SOCIO+)' : '👤 MODO FREE (USUARIO)'}
                </button>
              </div>

              {onAddDemoTicket && (
                <button
                  onClick={() => {
                    onAddDemoTicket();
                    onNavigate('/tickets');
                    setIsOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 font-sans text-xs font-semibold text-neutral-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>🎟️</span>
                  <span>+ Ticket Demo</span>
                </button>
              )}
            </div>

            {/* Listado de Pantallas por Categorías */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 no-scrollbar">
              {screens.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <h4 className="font-sans text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                    {group.category}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const isActive = currentRoute === item.id || (item.id !== '/' && currentRoute.startsWith(item.id));
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onNavigate(item.id);
                            setIsOpen(false);
                          }}
                          className={`p-2.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#E87A72]/15 border-[#E87A72] text-white shadow-md shadow-[#E87A72]/10'
                              : 'bg-[#181A20] hover:bg-[#20222A] border-neutral-800/80 text-neutral-200'
                          }`}
                        >
                          <span className="text-xl p-1 rounded-xl bg-black/40 border border-white/5">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-display font-black text-sm uppercase truncate">
                                {item.label}
                              </span>
                              {isActive && (
                                <span className="w-2 h-2 rounded-full bg-[#E87A72] animate-pulse" />
                              )}
                            </div>
                            <p className="font-sans text-[10px] text-neutral-400 truncate mt-0.5">
                              {item.sublabel}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer de Estado */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs font-sans text-neutral-500">
              <span>Ruta activa: <code className="text-[#E87A72] font-mono">{currentRoute}</code></span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white uppercase font-bold text-[11px]"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default DevScreenConsole;
