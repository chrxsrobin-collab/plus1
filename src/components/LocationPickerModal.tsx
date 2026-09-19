import React, { useEffect, useRef, useState } from 'react';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (locationAddress: string, coordinates: Coordinates) => void;
  initialCoordinates?: Coordinates | null;
  initialAddress?: string;
}

// Fallback por defecto si no hay coordenadas previas: La Paz, Bolivia / Sopocachi (-16.5042, -68.1294)
const DEFAULT_COORDS: Coordinates = {
  lat: -16.5042,
  lng: -68.1294,
};

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialCoordinates,
  initialAddress,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  const [coords, setCoords] = useState<Coordinates>(
    initialCoordinates && initialCoordinates.lat && initialCoordinates.lng
      ? initialCoordinates
      : DEFAULT_COORDS
  );
  const [detectedAddress, setDetectedAddress] = useState<string>(
    initialAddress || 'Ubicación seleccionada en el mapa'
  );
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  // Consulta gratuita de geocodificación inversa con Nominatim OpenStreetMap
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            'Accept-Language': 'es, en',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Error al consultar Nominatim');
      }
      const data = await response.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const road = addr.road || addr.pedestrian || addr.street || '';
        const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.city_district || '';
        const city = addr.city || addr.town || addr.village || addr.county || '';

        let formatted = '';
        if (road && neighborhood) {
          formatted = `${road}, ${neighborhood}${city ? ` · ${city}` : ''}`;
        } else if (road && city) {
          formatted = `${road} · ${city}`;
        } else if (neighborhood && city) {
          formatted = `${neighborhood} · ${city}`;
        } else {
          // Tomar los 3 primeros componentes del display_name
          formatted = data.display_name.split(',').slice(0, 3).join(', ');
        }
        setDetectedAddress(formatted.trim() || data.display_name);
      } else {
        setDetectedAddress(`Punto GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (err) {
      console.warn('Fallo al obtener dirección legible de OpenStreetMap:', err);
      setDetectedAddress(`Punto GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // 1. Cargar biblioteca y estilos de Leaflet si no están presentes
  useEffect(() => {
    if (!isOpen) return;

    // Asegurar CSS de Leaflet
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Asegurar JS de Leaflet
    const initOrLoadLeaflet = () => {
      if ((window as any).L) {
        setIsMapReady(true);
      } else {
        const existingScript = document.getElementById('leaflet-js');
        if (existingScript) {
          existingScript.addEventListener('load', () => setIsMapReady(true));
        } else {
          const script = document.createElement('script');
          script.id = 'leaflet-js';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.crossOrigin = '';
          script.onload = () => setIsMapReady(true);
          document.body.appendChild(script);
        }
      }
    };

    initOrLoadLeaflet();
  }, [isOpen]);

  // 2. Inicializar el mapa de Leaflet una vez que el script esté listo y el DOM montado
  useEffect(() => {
    if (!isOpen || !isMapReady || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const currentCoords = coords.lat && coords.lng ? coords : DEFAULT_COORDS;

    // Si ya existe instancia previa, limpiarla
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Inicializar mapa
    const map = L.map(mapContainerRef.current, {
      center: [currentCoords.lat, currentCoords.lng],
      zoom: 16,
      zoomControl: false,
    });

    // Control de zoom en la esquina superior derecha
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Tiles libres de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Icono de Pin Personalizado con acento salmón #E87A72 y estilo +1
    const customPinIcon = L.divIcon({
      className: 'custom-plus1-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: auto; cursor: grab;">
          <div style="background: #E87A72; color: #000000; font-family: 'Antonio', -apple-system, sans-serif; font-weight: 800; font-size: 11px; padding: 3px 9px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(232, 122, 114, 0.45); display: flex; align-items: center; justify-content: center; border: 1.5px solid #FFFFFF; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.04em;">
            <span style="font-weight: 900;">EVENTO +1</span>
          </div>
          <div style="width: 12px; height: 12px; background: #E87A72; transform: rotate(45deg); margin-top: -6px; border-right: 1.5px solid #FFFFFF; border-bottom: 1.5px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.25);"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    // Marcador draggable
    const marker = L.marker([currentCoords.lat, currentCoords.lng], {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map);

    // Al arrastrar el marcador
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      const newCoords = { lat: position.lat, lng: position.lng };
      setCoords(newCoords);
      reverseGeocode(newCoords.lat, newCoords.lng);
    });

    // Al hacer clic sobre cualquier punto del mapa
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      const newCoords = { lat, lng };
      setCoords(newCoords);
      reverseGeocode(lat, lng);
    });

    mapInstanceRef.current = map;
    markerInstanceRef.current = marker;

    // Forzar recalculo de dimensiones por si el modal se abrió con transición
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Geocodificar ubicación inicial si no había dirección previa
    if (!initialAddress || initialAddress.trim() === '') {
      reverseGeocode(currentCoords.lat, currentCoords.lng);
    }

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, isMapReady]);

  // Centrar en ubicación actual del usuario mediante Geolocation API
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const newCoords = { lat: latitude, lng: longitude };
        setCoords(newCoords);

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.2 });
          markerInstanceRef.current.setLatLng([latitude, longitude]);
        }

        reverseGeocode(latitude, longitude);
      },
      (error) => {
        setIsLocating(false);
        console.warn('Error de geolocalización:', error);
        alert('No se pudo acceder a tu ubicación actual. Revisa los permisos de ubicación de tu navegador.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const handleConfirm = () => {
    onConfirm(detectedAddress, coords);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
    >
      <div className="relative w-full max-w-[420px] bg-[#16171B] border border-[#26282E] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* ENCABEZADO */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#26282E]/80">
          <div className="flex items-center space-x-2">
            <span className="text-[#E87A72] text-base">🗺️</span>
            <h2 className="font-display text-white text-lg sm:text-xl font-black tracking-wider uppercase">
              UBICACIÓN DEL EVENTO
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de mapa"
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* BARRA SUPERIOR DE HERRAMIENTAS */}
        <div className="px-5 py-2.5 bg-[#121316] border-b border-[#26282E]/60 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2025] hover:bg-[#26282E] border border-[#26282E] hover:border-[#E87A72]/50 text-white font-sans text-xs font-semibold tracking-wide transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <span>{isLocating ? '⏳' : '🎯'}</span>
            <span>{isLocating ? 'Detectando...' : 'Mi ubicación actual'}</span>
          </button>
          
          <span className="font-sans text-[11px] text-neutral-400 text-right truncate">
            Toca en el mapa para fijar el punto
          </span>
        </div>

        {/* VISOR DEL MAPA (LEAFLET CONTAINER) */}
        <div className="relative w-full h-72 sm:h-80 bg-[#0E0F12]">
          <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
          
          {(!isMapReady || isLoadingAddress) && (
            <div className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-sans text-white flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-[#E87A72] animate-ping" />
              <span>{isLoadingAddress ? 'Actualizando dirección...' : 'Cargando mapa...'}</span>
            </div>
          )}
        </div>

        {/* BARRA INFERIOR DE CONFIRMACIÓN */}
        <div className="p-4 sm:p-5 bg-[#16171B] border-t border-[#26282E] flex flex-col space-y-3">
          {/* Visualización de la dirección detectada */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#121316] border border-[#26282E]">
            <span className="text-[#E87A72] text-lg mt-0.5 shrink-0">📍</span>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-xs font-semibold text-white truncate">
                {isLoadingAddress ? 'Detectando dirección en OpenStreetMap...' : detectedAddress}
              </p>
              <p className="font-mono text-[10px] text-neutral-500 mt-0.5">
                Lat: {coords.lat.toFixed(5)} · Lng: {coords.lng.toFixed(5)}
              </p>
            </div>
          </div>

          {/* Botón de confirmación ancho */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 px-4 rounded-xl bg-[#12C061] hover:bg-[#0fa854] active:scale-[0.98] text-black font-display text-base font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
          >
            <span>CONFIRMAR UBICACIÓN</span>
            <span className="text-lg leading-none">✓</span>
          </button>
        </div>

      </div>
    </div>
  );
};
