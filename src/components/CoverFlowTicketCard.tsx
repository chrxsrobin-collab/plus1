import React, { useRef, useEffect } from 'react';
import { PassItem } from '../types/home';

export interface CoverFlowTicketCardProps {
  ticket: PassItem;
  isActive?: boolean;
  onClick?: () => void;
}

/**
 * Renderizador de código QR con puntos/círculos (Dots QR) usando qr-code-styling
 * con esquinas extra-redondeadas y distintivo central circular negro con '+1' salmón.
 */
const QrCodeDots: React.FC<{ value: string; size?: number }> = ({ value, size = 196 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const renderQr = () => {
      if (!containerRef.current) return;
      const QRCodeStylingClass = (window as any).QRCodeStyling;
      if (!QRCodeStylingClass) return;

      containerRef.current.innerHTML = '';
      const defaultBadge =
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120' width='120' height='120'><circle cx='60' cy='60' r='58' fill='%23000000'/><text x='60' y='74' text-anchor='middle' font-family='sans-serif' font-weight='900' font-size='44' fill='%23E87A72'>%2B1</text></svg>";

      const qr = new QRCodeStylingClass({
        width: size,
        height: size,
        type: 'svg',
        data: value,
        image: defaultBadge,
        dotsOptions: {
          color: '#000000',
          type: 'dots',
        },
        backgroundOptions: {
          color: '#FFFFFF',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 4,
          imageSize: 0.28,
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: '#000000',
        },
        cornersDotOptions: {
          type: 'dot',
          color: '#000000',
        },
        qrOptions: {
          errorCorrectionLevel: 'H',
        },
      });

      if (isMounted && containerRef.current) {
        qr.append(containerRef.current);
      }
    };

    if ((window as any).QRCodeStyling) {
      renderQr();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qr-code-styling@1.5.0/lib/qr-code-styling.js';
      script.onload = () => {
        if (isMounted) renderQr();
      };
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  return <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden" />;
};

export const CoverFlowTicketCard: React.FC<CoverFlowTicketCardProps> = ({
  ticket,
  isActive = false,
  onClick,
}) => {
  const cleanHolder = (ticket.holderName || 'INVITADO')
    .replace(/\s*·\s*(\+1(\s*INCLUIDO)?|INDIVIDUAL)$/i, '')
    .trim();

  const allowsPlusOne = Boolean(
    ticket.allowsPlusOne ??
      ticket.withPlusOne ??
      (ticket.companionsCount && ticket.companionsCount > 0)
  );

  const rawId = ticket.ticketId || ticket.id || '56842';
  const passCode = rawId.replace(/^#/, '').toUpperCase().slice(0, 7);
  const formattedPassCode = passCode.startsWith('AN') ? passCode : `AN${passCode.slice(0, 5)}`;
  const qrPayload = ticket.qrCodeValue || `plus1://pass/${ticket.id || 'PASS_123'}`;

  return (
    <div
      id={ticket.id ? `ticket-card-${ticket.id}` : undefined}
      onClick={onClick}
      className={`relative w-[316px] h-[507px] flex-shrink-0 cursor-pointer select-none transition-all duration-200 ${
        isActive ? 'active-ticket-card filter drop-shadow-[0_16px_36px_rgba(0,0,0,0.9)]' : 'filter drop-shadow-md'
      }`}
    >
      {/* 1. Fondo fotorrealista de papel perforado: ticket.webp */}
      <img
        src="./assets/images/ticket.webp"
        alt="Ticket Background"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
      />

      {/* 2. Capa de Contenido tipográfico y visual estructurado */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between pt-6 pb-5 px-5">
        
        {/* PARTE SUPERIOR (Arriba de la línea punteada de perforación: Y: 0..102px) */}
        <div className="h-[88px] flex flex-col items-center justify-center text-center px-1">
          {/* Nombre del evento = nombre del evento del anfitrión */}
          <h2 className="font-display font-black text-xl sm:text-2xl text-black uppercase tracking-tight leading-tight truncate max-w-[260px]">
            {ticket.title || ticket.eventTitle || 'NOMBRE EVENTO'}
          </h2>
          {/* Fecha y hora del evento */}
          <p className="font-sans text-xs text-neutral-800 font-medium mt-1">
            {ticket.dateStr || 'Fecha'} · {ticket.timeStr || 'hora'}
          </p>
        </div>

        {/* PARTE INFERIOR (Debajo de la línea punteada de perforación) */}
        <div className="flex-1 flex flex-col items-center justify-between pt-3 pb-0.5">
          
          {/* Recuadro QR: Blanco con borde redondeado negro y círculos/dots */}
          <div className="w-[220px] h-[220px] bg-white rounded-[26px] border-[2.5px] border-black p-2.5 shadow-sm flex items-center justify-center relative overflow-hidden mx-auto">
            <QrCodeDots value={qrPayload} size={196} />
          </div>

          {/* Ubicación del evento del anfitrión con emoji pin rojo */}
          <div className="flex items-center justify-center gap-1 text-[11px] font-sans font-semibold text-neutral-800 mt-2.5 max-w-[260px] truncate">
            <span className="text-xs">📍</span>
            <span className="truncate">{ticket.location || ticket.venue || 'Ubicacion'}</span>
          </div>

          {/* Nombre de usuario - Tipo de ingreso (Antonio Bold) */}
          <div className="font-display font-black text-base sm:text-lg text-black tracking-wide uppercase text-center mt-1.5 truncate max-w-[260px]">
            {cleanHolder || 'INVITADO'} - {allowsPlusOne ? '+1' : 'INDIVIDUAL'}
          </div>

          {/* Número de ticket aleatorio/seguridad y texto 'verificado con google' */}
          <div className="text-[9.5px] font-sans font-bold text-neutral-600 tracking-wider uppercase text-center mt-1 mb-1">
            #{formattedPassCode} · VERIFICADO CON GOOGLE
          </div>

        </div>
      </div>
    </div>
  );
};

export default CoverFlowTicketCard;
export { CoverFlowTicketCard as TicketCard };
