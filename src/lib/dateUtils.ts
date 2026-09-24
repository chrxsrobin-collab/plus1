/**
 * Utilidades para cálculo de expiración y finalización de eventos
 */

/**
 * Calcula el timestamp de finalización de un evento (en milisegundos).
 * - Si tiene date y endTime válidos, combina ambos.
 * - Si endTime es de madrugada (ej. < 12:00) y el evento comenzó de noche (o endTime < startTime),
 *   se interpreta como finalización en la madrugada del día siguiente.
 * - Si no tiene hora de fin explícita, se toman por defecto las 06:00 AM del día siguiente a la fecha del evento.
 */
export function computeEventEndTimestamp(date?: string, endTime?: string, startTime?: string): number {
  if (!date) return Date.now() + 24 * 60 * 60 * 1000;

  try {
    const trimmedDate = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      if (endTime && /^\d{1,2}:\d{2}$/.test(endTime.trim())) {
        const formattedEndTime = endTime.trim().padStart(5, '0');
        const [endH] = formattedEndTime.split(':').map(Number);

        let isNextDay = false;
        if (startTime && /^\d{1,2}:\d{2}$/.test(startTime.trim())) {
          const [startH] = startTime.trim().padStart(5, '0').split(':').map(Number);
          if (endH < startH) isNextDay = true;
        } else if (endH < 12) {
          isNextDay = true;
        }

        if (isNextDay) {
          const d = new Date(`${trimmedDate}T00:00:00`);
          d.setDate(d.getDate() + 1);
          const nextDayStr = d.toISOString().split('T')[0];
          const ts = new Date(`${nextDayStr}T${formattedEndTime}:00`).getTime();
          if (!isNaN(ts)) return ts;
        } else {
          const ts = new Date(`${trimmedDate}T${formattedEndTime}:00`).getTime();
          if (!isNaN(ts)) return ts;
        }
      }

      // Si no tiene endTime o falló: 06:00 AM del día siguiente
      const d = new Date(`${trimmedDate}T00:00:00`);
      d.setDate(d.getDate() + 1);
      const nextDayStr = d.toISOString().split('T')[0];
      const defaultEnd = new Date(`${nextDayStr}T06:00:00`).getTime();
      if (!isNaN(defaultEnd)) return defaultEnd;
    }

    // Fallback estándar
    const fallbackDate = new Date(`${trimmedDate}T${endTime || '23:59'}`).getTime();
    if (!isNaN(fallbackDate)) return fallbackDate;
  } catch {
    // calculation fallback
  }

  return Date.now() + 24 * 60 * 60 * 1000;
}

/**
 * Formatea una fecha YYYY-MM-DD en formato compacto con puntos DD.MM.YY (ej: 19.09.26)
 */
export const formatCardDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  const cleanDate = dateStr.split("T")[0].trim();
  const parts = cleanDate.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0].slice(-2);
    return `${parts[2]}.${parts[1]}.${year}`;
  }
  return dateStr;
};

/**
 * Formatea una hora HH:mm en formato legible con AM/PM (ej: "01:00" -> "01:00 AM", "23:30" -> "11:30 PM")
 */
export const formatVipCutoffDisplay = (timeStr?: string | null): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (/[a-zA-Z]/.test(trimmed)) return trimmed;
  const [hStr, mStr] = trimmed.split(':');
  if (hStr === undefined || mStr === undefined) return trimmed;
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return trimmed;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const hDisplay = h12 < 10 ? `0${h12}` : `${h12}`;
  return `${hDisplay}:${mStr.slice(0, 2)} ${period}`;
};


