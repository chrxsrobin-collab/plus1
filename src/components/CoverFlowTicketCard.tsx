import React from 'react';
import { PassItem } from '../types/home';

export interface CoverFlowTicketCardProps {
  ticket: PassItem;
  isActive?: boolean;
  onClick?: () => void;
}

export const CoverFlowTicketCard: React.FC<CoverFlowTicketCardProps> = ({
  ticket,
  isActive = false,
  onClick,
}) => {
  const width = 280;
  const height = 440;
  const accent =
    ticket.accentBorderColor ||
    (ticket.status === 'capacity_reached'
      ? '#E87A72'
      : ticket.status === 'pending'
      ? '#FAB205'
      : '#12C061');

  // Path SVG con silueta física de boleto:
  // Esquinas redondeadas (18px) y muescas semicirculares laterales (12px) en Y=105
  const ticketPath = `
    M 18 0
    H ${width - 18}
    A 18 18 0 0 1 ${width} 18
    V 93
    A 12 12 0 0 0 ${width} 117
    V ${height - 18}
    A 18 18 0 0 1 ${width - 18} ${height}
    H 18
    A 18 18 0 0 1 0 ${height - 18}
    V 117
    A 12 12 0 0 0 0 93
    V 18
    A 18 18 0 0 1 18 0
    Z
  `;

  return (
    <div
      onClick={onClick}
      className={`relative w-[280px] h-[440px] flex-shrink-0 cursor-pointer select-none transition-all duration-200 ${
        isActive ? 'filter drop-shadow-[0_12px_32px_rgba(0,0,0,0.9)]' : 'filter drop-shadow-md'
      }`}
    >
      {/* 1. Silueta Vectorial SVG del Boleto */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      >
        {/* Cuerpo del ticket con borde plano en tono de acento */}
        <path
          d={ticketPath}
          fill="#121316"
          stroke={accent}
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Línea horizontal punteada divisoria en las muescas (Y=105) */}
        <line
          x1="14"
          y1="105"
          x2={width - 14}
          y2="105"
          stroke="#262A32"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />

        {/* Línea divisoria inferior antes del pie (Y=352) */}
        <line
          x1="18"
          y1="352"
          x2={width - 18}
          y2="352"
          stroke="#1F2228"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>

      {/* 2. Contenido Interno del Ticket */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 pt-4 pb-3.5">
        {/* CABECERA (Y: 0..105) */}
        <div className="h-[88px] flex flex-col justify-between text-center px-1">
          <div className="flex items-center justify-start">
            <span
              className="text-[10px] font-display font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full border"
              style={{
                color: accent,
                borderColor: `${accent}40`,
                backgroundColor: `${accent}15`,
              }}
            >
              VIP
            </span>
          </div>

          <h3 className="font-display text-white text-xl sm:text-2xl font-black tracking-tight uppercase leading-none truncate px-1 mt-1">
            {ticket.title}
          </h3>

          <div className="flex items-center justify-center space-x-1.5 text-[11px] font-sans text-neutral-300">
            <span className="font-bold text-white">{ticket.dateStr}</span>
            <span>·</span>
            <span className="text-neutral-400">{ticket.timeStr}</span>
          </div>
        </div>

        {/* ÁREA CENTRAL: VISOR QR O TARJETA DE AFORO COMPLETADO (Y: 105..352) */}
        <div className="flex-1 flex flex-col items-center justify-center py-2 relative">
          {ticket.status === 'capacity_reached' ? (
            <div className="w-[200px] min-h-[175px] bg-[#16171B] border border-[#E87A72]/50 rounded-2xl p-3.5 shadow-2xl flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-1.5">⏳</span>
              <span className="font-display text-[#E87A72] text-xs font-black tracking-wider uppercase mb-1">
                AFORO VIP COMPLETADO
              </span>
              <p className="font-sans text-[11px] text-neutral-300 leading-snug">
                {ticket.feedbackMessage ||
                  'Aforo VIP completado por el momento. ¡Atento a próximas fechas!'}
              </p>
              <div className="mt-2.5 px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                PRÓXIMA EDICIÓN
              </div>
            </div>
          ) : ticket.status === 'pending' ? (
            <div className="w-[200px] min-h-[175px] bg-[#16171B] border border-[#FAB205]/40 rounded-2xl p-3.5 shadow-2xl flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-1.5">⏳</span>
              <span className="font-display text-[#FAB205] text-xs font-black tracking-wider uppercase mb-1">
                SOLICITUD EN REVISIÓN
              </span>
              <p className="font-sans text-[11px] text-neutral-300 leading-snug">
                Tu solicitud VIP está en espera de aprobación por el anfitrión.
              </p>
            </div>
          ) : (
            <div className="relative w-[180px] h-[180px] flex items-center justify-center">
              {/* Esquinas de enfoque estilo visor fotográfico */}
              <div
                className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-sm pointer-events-none"
                style={{ borderColor: accent }}
              />
              <div
                className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-sm pointer-events-none"
                style={{ borderColor: accent }}
              />
              <div
                className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-sm pointer-events-none"
                style={{ borderColor: accent }}
              />
              <div
                className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-sm pointer-events-none"
                style={{ borderColor: accent }}
              />

              {/* Recuadro QR blanco de alto contraste */}
              <div className="w-[158px] h-[158px] bg-white rounded-xl p-2.5 shadow-2xl flex items-center justify-center relative overflow-hidden">
                <svg
                  className="w-full h-full text-black"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  {/* Patrón de QR de alta fidelidad con esquinas fijas */}
                  <rect width="100" height="100" fill="#FFFFFF" />
                  {/* Esquina superior izquierda */}
                  <rect x="6" y="6" width="28" height="28" fill="#000000" rx="3" />
                  <rect x="12" y="12" width="16" height="16" fill="#FFFFFF" rx="1.5" />
                  <rect x="16" y="16" width="8" height="8" fill="#000000" rx="1" />

                  {/* Esquina superior derecha */}
                  <rect x="66" y="6" width="28" height="28" fill="#000000" rx="3" />
                  <rect x="72" y="12" width="16" height="16" fill="#FFFFFF" rx="1.5" />
                  <rect x="76" y="16" width="8" height="8" fill="#000000" rx="1" />

                  {/* Esquina inferior izquierda */}
                  <rect x="6" y="66" width="28" height="28" fill="#000000" rx="3" />
                  <rect x="12" y="72" width="16" height="16" fill="#FFFFFF" rx="1.5" />
                  <rect x="16" y="76" width="8" height="8" fill="#000000" rx="1" />

                  {/* Patrón de datos sincronizado */}
                  <rect x="40" y="8" width="8" height="8" fill="#000000" />
                  <rect x="52" y="8" width="6" height="14" fill="#000000" />
                  <rect x="40" y="24" width="14" height="6" fill="#000000" />
                  <rect x="8" y="40" width="8" height="16" fill="#000000" />
                  <rect x="22" y="40" width="6" height="8" fill="#000000" />
                  <rect x="20" y="52" width="14" height="6" fill="#000000" />
                  <rect x="40" y="40" width="20" height="20" fill="#000000" rx="2" />
                  <rect x="44" y="44" width="12" height="12" fill="#FFFFFF" rx="1" />
                  <rect x="48" y="48" width="4" height="4" fill="#000000" />
                  <rect x="68" y="40" width="12" height="6" fill="#000000" />
                  <rect x="84" y="40" width="8" height="16" fill="#000000" />
                  <rect x="66" y="52" width="10" height="8" fill="#000000" />
                  <rect x="40" y="68" width="6" height="18" fill="#000000" />
                  <rect x="52" y="68" width="14" height="8" fill="#000000" />
                  <rect x="52" y="80" width="8" height="12" fill="#000000" />
                  <rect x="68" y="68" width="14" height="6" fill="#000000" />
                  <rect x="86" y="68" width="6" height="16" fill="#000000" />
                  <rect x="68" y="80" width="12" height="12" fill="#000000" />
                </svg>

                {/* Miniatura cuadrada del flyer del evento al centro del QR */}
                <div className="absolute inset-0 m-auto w-[42px] h-[42px] rounded-lg overflow-hidden border-[1.5px] border-white shadow-md bg-[#16171B] flex items-center justify-center">
                  {(ticket.eventImageUrl || ticket.imageUrl) ? (
                    <img
                      src={ticket.eventImageUrl || ticket.imageUrl}
                      alt={ticket.eventTitle || ticket.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1A1C20] flex items-center justify-center text-center p-0.5">
                      <span className="font-display text-[#E87A72] text-[10px] font-black uppercase leading-none tracking-tight">
                        {ticket.eventTitle ? ticket.eventTitle.slice(0, 4) : '+1'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Venue / Ubicación */}
          <div className="flex items-center space-x-1 text-neutral-400 text-xs font-sans mt-2">
            <span className="text-[11px]">📍</span>
            <span className="truncate max-w-[210px]">{ticket.venue || ticket.location}</span>
          </div>
        </div>

        {/* PIE DEL TICKET (Y: 352..440) */}
        <div className="h-[68px] flex flex-col justify-center text-center px-2">
          {(() => {
            const cleanHolder = (ticket.holderName || 'INVITADO')
              .replace(/\s*·\s*(\+1(\s*INCLUIDO)?|INDIVIDUAL)$/i, '')
              .trim();
            const allowsPlusOne = Boolean(
              ticket.allowsPlusOne ??
                ticket.withPlusOne ??
                (ticket.companionsCount && ticket.companionsCount > 0)
            );
            const passCode = (ticket.id || ticket.ticketId || '0000')
              .replace(/^#/, '')
              .slice(0, 5)
              .toUpperCase();

            return (
              <>
                <h3 className="font-display text-white text-lg tracking-wider uppercase truncate">
                  {cleanHolder || 'INVITADO'} · {allowsPlusOne ? '+1' : 'INDIVIDUAL'}
                </h3>
                <div className="flex items-center justify-center space-x-1.5 text-[11px] font-sans text-neutral-400 mt-1">
                  <span className="font-mono font-bold text-neutral-300">
                    #{passCode}
                  </span>
                  <span>·</span>
                  <span className="uppercase tracking-wider">
                    {ticket.verifiedProvider || 'VERIFICADO CON GOOGLE'}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default CoverFlowTicketCard;
