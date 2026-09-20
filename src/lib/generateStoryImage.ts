/**
 * Utilidad generadora de historias para Instagram Stories (formato vertical 9:16 - 1080x1920)
 * y exportación nativa para la app +1.
 */

import { formatCardDate } from './dateUtils';

export interface StoryEventData {
  id?: string;
  title: string;
  date?: string;
  dateDisplay?: string;
  timeRange?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  exactAddress?: string;
  imageUrl?: string | null;
  guestLimit?: number;
  maxCapacity?: number;
}

export interface StoryGenerationResult {
  success: boolean;
  method: 'share' | 'download';
  message: string;
}

/**
 * Carga una imagen asegurando soporte de CORS. Si falla, retorna null sin lanzar error.
 */
function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Intento sin anonymous por si el servidor rechaza CORS estricto
      const img2 = new Image();
      img2.onload = () => resolve(img2);
      img2.onerror = () => resolve(null);
      img2.src = src;
    };
    img.src = src;
  });
}

/**
 * Traza un rectángulo redondeado con compatibilidad multiplataforma.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * Envuelve texto largo en múltiples líneas centradas.
 */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = 2
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) {
        break;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Genera la imagen vertical 9:16 (1080 x 1920) y gestiona la difusión a Instagram Stories / Descarga.
 */
export async function generateStoryImage(
  event: StoryEventData,
  customShareUrl?: string
): Promise<StoryGenerationResult> {
  // Esperar a que las fuentes web personalizadas estén disponibles
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignorar si hay timeout en fonts
    }
  }

  const canvasWidth = 1080;
  const canvasHeight = 1920;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D del Canvas');
  }

  // 1. FONDO: Base negro carbón #0B0C0E
  ctx.fillStyle = '#0B0C0E';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Cargar imagen del evento si existe
  const eventImg = event.imageUrl ? await loadImageSafe(event.imageUrl) : null;

  if (eventImg) {
    try {
      ctx.save();
      // Escalar imagen para cubrir el fondo completo (cover)
      const hRatio = canvasWidth / eventImg.width;
      const vRatio = canvasHeight / eventImg.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (canvasWidth - eventImg.width * ratio) / 2;
      const centerShiftY = (canvasHeight - eventImg.height * ratio) / 2;

      // Desenfoque y atenuado oscuro de fondo
      if ('filter' in ctx) {
        ctx.filter = 'blur(35px) brightness(0.28)';
        ctx.drawImage(
          eventImg,
          0,
          0,
          eventImg.width,
          eventImg.height,
          centerShiftX - 20,
          centerShiftY - 20,
          eventImg.width * ratio + 40,
          eventImg.height * ratio + 40
        );
        ctx.filter = 'none';
      } else {
        ctx.drawImage(
          eventImg,
          0,
          0,
          eventImg.width,
          eventImg.height,
          centerShiftX,
          centerShiftY,
          eventImg.width * ratio,
          eventImg.height * ratio
        );
        ctx.fillStyle = 'rgba(11, 12, 14, 0.78)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
      ctx.restore();
    } catch (e) {
      console.warn('Error dibujando fondo borroso en canvas:', e);
    }
  }

  // Capa degradada cinematográfica para garantizar legibilidad
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bgGradient.addColorStop(0, 'rgba(11, 12, 14, 0.7)');
  bgGradient.addColorStop(0.35, 'rgba(11, 12, 14, 0.35)');
  bgGradient.addColorStop(0.7, 'rgba(11, 12, 14, 0.65)');
  bgGradient.addColorStop(1, 'rgba(11, 12, 14, 0.95)');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. ENCABEZADO Y BRANDING: Logotipo "+1" y subtexto
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Logotipo +1 en #E87A72
  ctx.fillStyle = '#E87A72';
  ctx.font = '900 68px "Antonio", sans-serif';
  ctx.fillText('+1', 540, 160);

  // Subtexto PASE VIP · LISTA DE ACCESO
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '700 22px "Cabinet Grotesk", sans-serif';
  ctx.fillText('PASE VIP · LISTA DE ACCESO', 540, 215);

  // 3. FLYER CUADRADO CENTRAL (~780 x 780 px, 1:1)
  const flyerSize = 780;
  const flyerX = (canvasWidth - flyerSize) / 2; // 150
  const flyerY = 270;
  const flyerRadius = 36;

  // Sombra suave bajo el flyer
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  drawRoundedRect(ctx, flyerX, flyerY, flyerSize, flyerSize, flyerRadius);
  ctx.fillStyle = '#16171B';
  ctx.fill();
  ctx.restore();

  // Contenido del flyer
  ctx.save();
  drawRoundedRect(ctx, flyerX, flyerY, flyerSize, flyerSize, flyerRadius);
  ctx.clip();

  if (eventImg) {
    try {
      // Ajuste proporcional 1:1 centrado
      const minDim = Math.min(eventImg.width, eventImg.height);
      const sx = (eventImg.width - minDim) / 2;
      const sy = (eventImg.height - minDim) / 2;
      ctx.drawImage(eventImg, sx, sy, minDim, minDim, flyerX, flyerY, flyerSize, flyerSize);
    } catch {
      // Si la imagen contamina el canvas por CORS, fallback gráfico interno
      ctx.fillStyle = '#1F2228';
      ctx.fillRect(flyerX, flyerY, flyerSize, flyerSize);
      ctx.fillStyle = '#E87A72';
      ctx.font = '900 60px "Antonio", sans-serif';
      ctx.fillText(event.title.slice(0, 16).toUpperCase(), 540, flyerY + flyerSize / 2);
    }
  } else {
    // Estado sin imagen
    const flyerGrad = ctx.createLinearGradient(flyerX, flyerY, flyerX + flyerSize, flyerY + flyerSize);
    flyerGrad.addColorStop(0, '#2A1B28');
    flyerGrad.addColorStop(0.5, '#16171B');
    flyerGrad.addColorStop(1, '#1A2328');
    ctx.fillStyle = flyerGrad;
    ctx.fillRect(flyerX, flyerY, flyerSize, flyerSize);

    ctx.fillStyle = '#E87A72';
    ctx.font = '900 56px "Antonio", sans-serif';
    ctx.fillText(event.title.toUpperCase(), 540, flyerY + flyerSize / 2 - 20);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '500 24px "Cabinet Grotesk", sans-serif';
    ctx.fillText('EVENTO OFICIAL +1', 540, flyerY + flyerSize / 2 + 35);
  }
  ctx.restore();

  // Borde sutil de 2.5px en salmón #E87A72
  drawRoundedRect(ctx, flyerX, flyerY, flyerSize, flyerSize, flyerRadius);
  ctx.strokeStyle = '#E87A72';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 4. DATOS DEL EVENTO (Debajo del Flyer)
  const cleanTitle = (event.title || 'EVENTO EXCLUSIVO').replace(/^FLYER.*?:\s*/i, '').trim().toUpperCase();

  // Título en Antonio Bold mayúsculas
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 50px "Antonio", sans-serif';
  const titleLines = wrapTextLines(ctx, cleanTitle, 860, 2);
  let currentY = 1130;
  titleLines.forEach((line) => {
    ctx.fillText(line, 540, currentY);
    currentY += 56;
  });

  // Fecha y Horario en Cabinet Grotesk
  const dateStr = (formatCardDate(event.dateDisplay || event.date) || 'PRÓXIMAMENTE').toUpperCase();
  const timeStr = event.timeRange || (event.startTime ? `${event.startTime} — ${event.endTime || 'CIERRE'}` : '22:00 — 04:00');
  
  ctx.fillStyle = '#E5E7EB';
  ctx.font = '700 30px "Cabinet Grotesk", sans-serif';
  ctx.fillText(`${dateStr} · ${timeStr}`, 540, currentY + 15);

  // Lugar / Ubicación
  const locationStr = (event.location || event.exactAddress || 'POR DEFINIR').toUpperCase();
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '600 26px "Cabinet Grotesk", sans-serif';
  ctx.fillText(`📍 ${locationStr}`, 540, currentY + 65);

  // Pastilla de Urgencia / Escasez
  const pillY = currentY + 115;
  const pillWidth = 520;
  const pillHeight = 54;
  const pillX = (canvasWidth - pillWidth) / 2;

  drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, 27);
  ctx.fillStyle = 'rgba(232, 122, 114, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(232, 122, 114, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#E87A72';
  ctx.font = '800 22px "Antonio", sans-serif';
  ctx.fillText('🔥 ÚLTIMOS CUPOS VIP · ENLACE DIRECTO', 540, pillY + pillHeight / 2);

  // 5. ZONA DE GUÍA PARA EL STICKER DE ENLACE (Parte Inferior)
  const stickerBoxWidth = 660;
  const stickerBoxHeight = 110;
  const stickerBoxX = (canvasWidth - stickerBoxWidth) / 2;
  const stickerBoxY = 1600;
  const stickerRadius = 24;

  // Fondo sutil de la zona del sticker
  drawRoundedRect(ctx, stickerBoxX, stickerBoxY, stickerBoxWidth, stickerBoxHeight, stickerRadius);
  ctx.fillStyle = 'rgba(22, 23, 27, 0.9)';
  ctx.fill();

  // Borde punteado/segmentado en salmón #E87A72
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = '#E87A72';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, stickerBoxX, stickerBoxY, stickerBoxWidth, stickerBoxHeight, stickerRadius);
  ctx.stroke();
  ctx.restore();

  // Texto guía interior
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 24px "Cabinet Grotesk", sans-serif';
  ctx.fillText('[ 🔗 COLOCA AQUÍ EL STICKER DE LINK ]', 540, stickerBoxY + stickerBoxHeight / 2);

  // 6. EXPORTACIÓN Y COMPARTICIÓN NATIVA
  const shareUrl =
    customShareUrl ||
    `${window.location.origin}${window.location.pathname}#/e/${event.id || ''}`;
  const filename = `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-story.png`;

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve({
          success: false,
          method: 'download',
          message: 'Error al generar la imagen en Canvas',
        });
        return;
      }

      const file = new File([blob], filename, { type: 'image/png' });

      // Verificación de compatibilidad con Web Share API (archivos nativos)
      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        try {
          await navAny.share({
            files: [file],
            title: event.title,
            text: `¡Te invito a mi evento en +1! 🔥 Pide tu pase aquí: ${shareUrl}`,
          });
          resolve({
            success: true,
            method: 'share',
            message: '¡Historia compartida con éxito!',
          });
          return;
        } catch {
          // Si el usuario cancela la sábana nativa, continuar al fallback
        }
      }

      // Fallback: Descarga directa de la imagen al carrete / descargas
      const downloadLink = document.createElement('a');
      downloadLink.download = filename;
      const objectUrl = URL.createObjectURL(blob);
      downloadLink.href = objectUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);

      resolve({
        success: true,
        method: 'download',
        message: '¡Imagen de Story guardada! Súbela a Instagram y añade el sticker con tu link.',
      });
    }, 'image/png');
  });
}
