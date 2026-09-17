import React from 'react';

interface TicketShapeProps {
  className?: string;
  children: React.ReactNode;
}

export const TicketShape: React.FC<TicketShapeProps> = ({ className = '', children }) => {
  // Dimensiones del sistema de coordenadas SVG del ticket
  const width = 340;
  const height = 540;

  // Path SVG con silueta física de boleto:
  // 1. Dientes de perforación en borde superior con muesca circular central (y=0 a y=20)
  // 2. Muescas semicirculares laterales en y=135 y y=415
  // 3. Dientes de perforación en borde inferior con muesca circular central
  const ticketPath = `
    M 0 0
    H 10
    v 7 h 18 v -7 h 14
    v 7 h 18 v -7 h 14
    v 7 h 18 v -7 h 14
    v 7 h 18 v -7 h 9
    A 21 21 0 0 0 191 0
    h 9
    v 7 h 18 v -7 h 14
    v 7 h 18 v -7 h 14
    v 7 h 18 v -7 h 14
    v 7 h 18 v -7 h 10
    L ${width} 0
    L ${width} 123
    a 12 12 0 0 0 0 24
    L ${width} 403
    a 12 12 0 0 0 0 24
    L ${width} ${height}
    H ${width - 10}
    v -7 h -18 v 7 h -14
    v -7 h -18 v 7 h -14
    v -7 h -18 v 7 h -14
    v -7 h -18 v 7 h -9
    A 21 21 0 0 0 149 ${height}
    h -9
    v -7 h -18 v 7 h -14
    v -7 h -18 v 7 h -14
    v -7 h -18 v 7 h -14
    v -7 h -18 v 7 h -10
    L 0 ${height}
    L 0 427
    a 12 12 0 0 0 0 -24
    L 0 147
    a 12 12 0 0 0 0 -24
    Z
  `;

  return (
    <div className={`relative w-[340px] max-w-full h-[540px] flex items-center justify-center select-none ${className}`}>
      {/* 1. Fondo SVG Vectorial del Boleto */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 w-full h-full pointer-events-none filter drop-shadow-2xl overflow-visible"
      >
        {/* Cuerpo del ticket con borde verde esmeralda */}
        <path
          d={ticketPath}
          fill="#0E1013"
          stroke="#12c061"
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Línea horizontal punteada superior (sección cabecera) */}
        <line
          x1="14"
          y1="135"
          x2={width - 14}
          y2="135"
          stroke="#272C35"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />

        {/* Línea horizontal punteada inferior (sección datos del titular) */}
        <line
          x1="14"
          y1="415"
          x2={width - 14}
          y2="415"
          stroke="#272C35"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
      </svg>

      {/* 2. Contenido Interactivo sobre el Boleto */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between py-6 px-5">
        {children}
      </div>
    </div>
  );
};

export default TicketShape;
