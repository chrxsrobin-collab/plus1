import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PassItem } from '../types/home';
import '../styles/fonts.css';

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
  const isCapReached = ticket.status === 'capacity_reached';
  const isPending = ticket.status === 'pending';

  const cleanHolder = (
    ticket.holderName ||
    ticket.userName ||
    'INVITADO'
  )
    .replace(/\s*·\s*(\+1(\s*INCLUIDO)?|INDIVIDUAL)$/i, '')
    .trim();

  const allowsPlusOne = Boolean(
    ticket.allowsPlusOne ??
      ticket.withPlusOne ??
      (ticket.companionsCount && ticket.companionsCount > 0)
  );

  const tierLabel = ticket.listType || (allowsPlusOne ? 'PASE +1' : 'VIP');
  const holderDisplayName = cleanHolder || 'INVITADO';
  const eventTitle = (ticket.eventTitle || ticket.title || 'NOMBRE EVENTO').replace(/^FLYER.*?:\s*/i, '').trim();

  return (
    <div
      onClick={onClick}
      className={`relative w-[285px] sm:w-[305px] h-[458px] sm:h-[490px] flex-shrink-0 cursor-pointer select-none transition-all duration-300 ${
        isActive
          ? 'filter drop-shadow-[0_18px_40px_rgba(0,0,0,0.95)] scale-[1.01]'
          : 'filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.65)] opacity-85'
      }`}
    >
      {/* 1. Fondo de Papel Físico con Muescas y Perforación (ticket.webp) */}
      <img
        src="./assets/images/ticket.webp"
        alt="Boleto +1"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
      />

      {/* 2. Capa de Contenido Superpuesta Alineada a la Estructura de ticket.webp */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between px-6 pt-3 pb-3">
        
        {/* ZONA SUPERIOR (Sobre la línea punteada): [NOMBRE EVENTO] */}
        <div className="h-[78px] sm:h-[84px] flex items-center justify-center text-center px-2 pt-2">
          <h2 className="font-display text-black text-xl sm:text-[23px] font-black tracking-tight uppercase leading-tight line-clamp-2">
            {eventTitle}
          </h2>
        </div>

        {/* ZONA CENTRAL (Entre la línea punteada y el pie): CÓDIGO QR / ESTADOS */}
        <div className="flex-1 flex flex-col items-center justify-center px-2 py-1 relative">
          {isCapReached ? (
            <div className="w-[210px] sm:w-[220px] bg-[#16171B] border-2 border-[#E87A72] rounded-[24px] p-4 shadow-xl flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-1.5">⏳</span>
              <span className="font-display text-[#E87A72] text-xs font-black tracking-wider uppercase mb-1">
                AFORO VIP COMPLETADO
              </span>
              <p className="font-sans text-[11px] text-neutral-300 leading-snug">
                {ticket.feedbackMessage || 'Aforo VIP completado por el momento. ¡Atento a próximas fechas!'}
              </p>
              <div className="mt-2.5 px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                PRÓXIMA EDICIÓN
              </div>
            </div>
          ) : isPending ? (
            <div className="w-[210px] sm:w-[220px] bg-[#16171B] border-2 border-[#FAB205] rounded-[24px] p-4 shadow-xl flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-1.5">⏳</span>
              <span className="font-display text-[#FAB205] text-xs font-black tracking-wider uppercase mb-1">
                SOLICITUD EN REVISIÓN
              </span>
              <p className="font-sans text-[11px] text-neutral-300 leading-snug">
                Tu solicitud VIP está en espera de aprobación por el anfitrión.
              </p>
            </div>
          ) : (
            /* Tarjeta de Código QR Estilo Brutalista (Marco negro con fondo blanco y logo central +1) */
            <div className="w-[212px] h-[212px] sm:w-[224px] sm:h-[224px] bg-white border-[2.5px] border-black rounded-[26px] p-2.5 sm:p-3 flex items-center justify-center relative shadow-sm">
              <QRCodeSVG
                value={ticket.qrCodeValue || `plus1://pass/${ticket.id}`}
                size={182}
                level="H"
                bgColor="#FFFFFF"
                fgColor="#000000"
                includeMargin={false}
                className="w-full h-full"
              />

              {/* Insignia Circular Negra Central con Logo "+1" en Salmón #E87A72 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-md pointer-events-none select-none border border-black">
                <span className="font-display font-black text-xs text-[#E87A72] tracking-tight leading-none">
                  +1
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ZONA INFERIOR (Bajo el QR, sobre el corte ondulado): [NOMBRE USUARIO] - [TIPO DE INGRESO] */}
        <div className="h-[58px] sm:h-[64px] flex items-center justify-center text-center px-2 pb-2">
          <p className="font-display text-black text-xs sm:text-[13px] font-black tracking-wide uppercase truncate">
            {holderDisplayName} - {tierLabel}
          </p>
        </div>

      </div>
    </div>
  );
};

export default CoverFlowTicketCard;
export { CoverFlowTicketCard as TicketCard };
