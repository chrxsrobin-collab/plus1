import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, CreatedEventItem, NotificationItem } from '../types/home';
import { mockUserProfile, mockNotifications } from '../data/mockData';
import { db, auth } from '../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { computeEventEndTimestamp } from '../lib/dateUtils';
import { NotificationsModal } from '../components/NotificationsModal';
import { PullToRefresh } from '../components/PullToRefresh';
import '../styles/fonts.css';

export interface ProfileScreenProps {
  user?: UserProfile;
  profileUserId?: string;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
  onUpdateName?: (newName: string) => void;
  onUpdateAvatar?: (newAvatarUrl: string) => void;
}

export type BusinessCategoryType =
  | 'club'
  | 'promotor'
  | 'cafe'
  | 'teatro'
  | 'cine'
  | 'salon_eventos'
  | 'conferencista'
  | 'pub'
  | 'gimnasio';

export interface BusinessCategoryItem {
  id: BusinessCategoryType;
  label: string;
  icon: string;
}

export const BUSINESS_CATEGORIES: BusinessCategoryItem[] = [
  { id: 'club', label: 'Club', icon: '🪩' },
  { id: 'promotor', label: 'Promotor', icon: '🎫' },
  { id: 'cafe', label: 'Café', icon: '☕' },
  { id: 'teatro', label: 'Teatro', icon: '🎭' },
  { id: 'cine', label: 'Cine', icon: '🎬' },
  { id: 'salon_eventos', label: 'Salón de Eventos', icon: '🎪' },
  { id: 'conferencista', label: 'Conferencia', icon: '🎤' },
  { id: 'pub', label: 'Pub', icon: '🍻' },
  { id: 'gimnasio', label: 'Gimnasio', icon: '💪' },
];

const compressImageFile = (file: File, maxDim = 800, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context error'));
        ctx.drawImage(img, 0, 0, width, height);
        let compressed = canvas.toDataURL('image/webp', quality);
        if (!compressed.startsWith('data:image/webp')) {
          compressed = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ----------------------------------------------------
// COMPONENTE AUXILIAR: MEDIDOR RADIAL (DIAL GAUGE)
// ----------------------------------------------------
interface DialProps {
  label: string;
  value: number | string;
  percent: string;
  color: string;
  isLarge?: boolean;
}

const DialGauge: React.FC<DialProps> = ({ label, value, percent, color, isLarge = false }) => {
  if (isLarge) {
    return (
      <div className="flex flex-col items-center justify-end text-center z-10 px-1">
        <div className="relative w-[116px] h-[98px] sm:w-[126px] sm:h-[106px] flex items-center justify-center">
          <svg viewBox="0 0 120 106" className="w-full h-full overflow-visible">
            {/* Pista de fondo oscura */}
            <path
              d="M 27.5 88.5 A 46 46 0 1 1 92.5 88.5"
              fill="none"
              stroke="#202227"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Arco principal acentuado */}
            <path
              d="M 27.5 88.5 A 46 46 0 1 1 92.5 88.5"
              fill="none"
              stroke={color}
              strokeWidth="4.2"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
            />
            {/* Punto iluminado en el ápice (12 o'clock) */}
            <circle
              cx="60"
              cy="10"
              r="4.5"
              fill={color}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
            {/* Número central gigante en Antonio Bold */}
            <text
              x="60"
              y="63"
              textAnchor="middle"
              fill="#FFFFFF"
              className="font-display font-black text-[38px] select-none tracking-tight"
            >
              {value}
            </text>
          </svg>
        </div>
        <span className="font-sans font-bold text-white text-xs sm:text-[13px] tracking-wider uppercase mt-1">
          {label}
        </span>
        <span className="font-sans font-bold text-xs sm:text-sm mt-0.5" style={{ color }}>
          {percent}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-end text-center px-1">
      <div className="relative w-[94px] h-[82px] sm:w-[102px] sm:h-[88px] flex items-center justify-center">
        <svg viewBox="0 0 100 90" className="w-full h-full overflow-visible">
          {/* Pista de fondo oscura */}
          <path
            d="M 23.1 74.9 A 38 38 0 1 1 76.9 74.9"
            fill="none"
            stroke="#202227"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          {/* Arco principal acentuado */}
          <path
            d="M 23.1 74.9 A 38 38 0 1 1 76.9 74.9"
            fill="none"
            stroke={color}
            strokeWidth="3.8"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 7px ${color}55)` }}
          />
          {/* Punto iluminado en el ápice */}
          <circle
            cx="50"
            cy="10"
            r="3.8"
            fill={color}
            style={{ filter: `drop-shadow(0 0 5px ${color})` }}
          />
          {/* Número central en Antonio Bold */}
          <text
            x="50"
            y="54"
            textAnchor="middle"
            fill="#FFFFFF"
            className="font-display font-black text-[30px] select-none tracking-tight"
          >
            {value}
          </text>
        </svg>
      </div>
      <span className="font-sans font-bold text-white text-[11px] sm:text-xs tracking-wider uppercase mt-1">
        {label}
      </span>
      <span className="font-sans font-bold text-xs sm:text-sm mt-0.5" style={{ color }}>
        {percent}
      </span>
    </div>
  );
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user = mockUserProfile,
  profileUserId,
  onBack,
  onNavigate,
  onUpdateName,
  onUpdateAvatar,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<
    'account' | 'wristbands' | 'event_selector' | 'events' | 'streak' | 'store' | 'subscription' | 'category_picker' | 'live_dashboard' | null
  >(null);

  // targetUserId: el usuario del perfil que estamos viendo
  const targetUserId = profileUserId || auth.currentUser?.uid || user.id || 'current_user';
  const isOwner = !profileUserId || profileUserId === auth.currentUser?.uid;

  // Estados del creador / anfitrión
  const [profileData, setProfileData] = useState<any>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string>('');
  const [businessCategory, setBusinessCategory] = useState<string>('club');
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [followersCount, setFollowersCount] = useState<number>(0);

  // Estado del usuario visitante (siguiendo)
  const [currentUserFollowing, setCurrentUserFollowing] = useState<string[]>([]);
  const [isFollowingPending, setIsFollowingPending] = useState(false);

  // Uploaders y preview
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Lista de eventos creados por el anfitrión
  const [userEvents, setUserEvents] = useState<CreatedEventItem[]>([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(0);

  // Historial de eventos asistidos por el usuario
  const [attendedPasses, setAttendedPasses] = useState<{
    id: string;
    title: string;
    checkedInAt?: number | string;
    location?: string;
    hostName?: string;
  }[]>([]);

  // Notificaciones y alertas
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(9);

  // Estado del perfil del usuario (para el modal de cuenta)
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>(() => {
    return (
      auth.currentUser?.displayName ||
      (auth.currentUser?.isAnonymous ? 'INVITADO #' + auth.currentUser.uid.slice(-4).toUpperCase() : null) ||
      user.name ||
      'CHRIS G.'
    );
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(displayName);
  const [isSavingName, setIsSavingName] = useState(false);

  // Avatar y uploader
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return (
      auth.currentUser?.photoURL ||
      user.avatarUrl ||
      './assets/images/foto_perfil.webp'
    );
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ----------------------------------------------------
  // ESTADOS DEL DASHBOARD EN VIVO
  // ----------------------------------------------------
  const [liveInvitesCount, setLiveInvitesCount] = useState<number>(100);
  const [liveIngresosCount, setLiveIngresosCount] = useState<number>(100);
  const [liveCortesiasCount, setLiveCortesiasCount] = useState<number>(100);
  const [hourlyDistribution, setHourlyDistribution] = useState<number[]>([]);

  // Configuración de covers y manillas
  const [coverPrice, setCoverPrice] = useState<number>(50);
  const [assignedBands, setAssignedBands] = useState<number>(100);
  const [soldBandsCount, setSoldBandsCount] = useState<number>(16);
  const [isSavingCoverConfig, setIsSavingCoverConfig] = useState(false);

  // Formulario local del modal de manillas
  const [formPrice, setFormPrice] = useState<number>(50);
  const [formAssigned, setFormAssigned] = useState<number>(100);
  const [formSold, setFormSold] = useState<number>(16);

  // Activación de Socio + mediante bypass key secreto ("prouser")
  const [secretCode, setSecretCode] = useState<string>('');
  const [secretCodeError, setSecretCodeError] = useState<string>('');
  const [isActivatingPro, setIsActivatingPro] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Evento activo actual seleccionado
  const activeEvent: CreatedEventItem = useMemo(() => {
    if (userEvents.length > 0 && userEvents[selectedEventIndex]) {
      return userEvents[selectedEventIndex];
    }
    return {
      id: 'demo_event_vip',
      title: 'MÉXICO TEQUILA & DESMADRE',
      dateStr: 'Hoy · 22:00',
      status: 'Activo',
      guestsCount: 100,
      maxCapacity: 150,
    };
  }, [userEvents, selectedEventIndex]);

  // Navegación rápida entre eventos
  const handlePrevEvent = () => {
    if (userEvents.length <= 1) return;
    setSelectedEventIndex((prev) => (prev > 0 ? prev - 1 : userEvents.length - 1));
  };

  const handleNextEvent = () => {
    if (userEvents.length <= 1) return;
    setSelectedEventIndex((prev) => (prev < userEvents.length - 1 ? prev + 1 : 0));
  };

  // 1. Escucha del perfil que se está visualizando (targetUserId)
  useEffect(() => {
    if (!targetUserId) return;
    const targetRef = doc(db, 'users', targetUserId);
    const unsubTarget = onSnapshot(targetRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setProfileData(d);
        if (d.name) {
          setDisplayName(d.name);
          setEditNameValue(d.name);
        }
        if (d.photoUrl) {
          setAvatarUrl(d.photoUrl);
        } else if (isOwner && auth.currentUser?.photoURL) {
          setAvatarUrl(auth.currentUser.photoURL);
        }
        if (d.coverPhotoUrl) {
          setCoverPhotoUrl(d.coverPhotoUrl);
        }
        if (d.businessCategory) {
          setBusinessCategory(d.businessCategory);
        }
        if (Array.isArray(d.galleryPhotos)) {
          setGalleryPhotos(d.galleryPhotos);
        }
        if (d.followersCount !== undefined) {
          setFollowersCount(Number(d.followersCount) || 0);
        }
      }
    }, (err) => console.warn('Target user listener note:', err));

    return () => unsubTarget();
  }, [targetUserId, isOwner]);

  // 2. Escucha del usuario conectado (para su lista following y notificaciones)
  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setUserProfileData(d);
        if (Array.isArray(d.following)) {
          setCurrentUserFollowing(d.following);
        }
        if (isOwner) {
          if (d.name) {
            setDisplayName(d.name);
            setEditNameValue(d.name);
          }
          if (d.photoUrl) setAvatarUrl(d.photoUrl);
          if (d.coverPhotoUrl) setCoverPhotoUrl(d.coverPhotoUrl);
          if (d.businessCategory) setBusinessCategory(d.businessCategory);
          if (Array.isArray(d.galleryPhotos)) setGalleryPhotos(d.galleryPhotos);
        }
      }
    });

    const notifsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      where('read', '==', false)
    );
    const unsubNotifs = onSnapshot(notifsQuery, (snap) => {
      const count = snap.docs.length;
      setUnreadNotifCount(count > 0 ? count : 9);
    }, () => {});

    return () => {
      unsubUser();
      unsubNotifs();
    };
  }, [auth.currentUser, isOwner]);

  // 3. Escucha reactiva en tiempo real de eventos del anfitrión
  useEffect(() => {
    if (!targetUserId) {
      setUserEvents([]);
      return;
    }

    const q = isOwner
      ? query(collection(db, 'events'), where('hostUserId', '==', targetUserId))
      : query(collection(db, 'events'), where('hostUserId', '==', targetUserId), where('type', '==', 'public'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const myEvents: CreatedEventItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const eventEnd = d.endTimestamp || computeEventEndTimestamp(d.date, d.endTime, d.startTime);
          const isFinished = eventEnd <= now;
          return {
            id: docSnap.id,
            title: d.title || 'Evento sin título',
            dateStr: `${d.date || 'Próximamente'} · ${d.startTime || '22:00'}`,
            status: isFinished ? 'Finalizado' : 'Activo',
            isFinished: isFinished,
            endTimestamp: eventEnd,
            guestsCount: d.confirmedCount || d.guestsCount || 0,
            maxCapacity: d.maxCapacity || d.guestLimit || 150,
          };
        });
        setUserEvents(myEvents);
      },
      () => {
        setUserEvents([]);
      }
    );

    return () => unsubscribe();
  }, [targetUserId, isOwner]);

  // Escucha reactiva en tiempo real de pases usados (eventos asistidos por el usuario)
  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      setAttendedPasses([]);
      return;
    }

    const q = query(
      collection(db, 'passes'),
      where('userId', '==', currentUserId),
      where('status', '==', 'used')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.eventTitle || data.title || 'EVENTO +1',
            checkedInAt: data.checkedInAt || data.usedAt || data.updatedAt,
            location: data.location || data.venue || 'Club / Recinto Oficial',
            hostName: data.hostName || 'Anfitrión +1',
          };
        });
        setAttendedPasses(list);
      },
      () => {
        setAttendedPasses([]);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  // ----------------------------------------------------
  // SINCRONIZACIÓN EN TIEMPO REAL DEL DASHBOARD POR EVENTO
  // ----------------------------------------------------
  useEffect(() => {
    if (!activeEvent?.id) return;

    // 1. Escuchar pases del evento activo (invitaciones, ingresos en puerta, cortesías)
    const passesQuery = query(
      collection(db, 'passes'),
      where('eventId', '==', activeEvent.id)
    );

    const unsubPasses = onSnapshot(passesQuery, (snapshot) => {
      const allDocs = snapshot.docs.map((d) => d.data());
      const totalInvites = allDocs.length;
      const usedPasses = allDocs.filter((p: any) => p.status === 'used');
      const courtesies = allDocs.filter((p: any) =>
        p.accessTier === 'VIP' || p.isCourtesy === true || (p.freeDrinksClaimed && p.freeDrinksClaimed > 0)
      );

      // Si hay datos en Firestore, usarlos; de lo contrario mantener valores de referencia
      if (totalInvites > 0) {
        setLiveInvitesCount(totalInvites);
        setLiveIngresosCount(usedPasses.length);
        setLiveCortesiasCount(courtesies.length > 0 ? courtesies.length : Math.round(usedPasses.length * 0.8));
      } else {
        setLiveInvitesCount(activeEvent.guestsCount || 100);
        setLiveIngresosCount(100);
        setLiveCortesiasCount(100);
      }

      // Agrupación horaria de ingresos en puerta para gráfico histórico
      const hourCounts = new Array(24).fill(0);
      let hasLiveCheckIns = false;

      usedPasses.forEach((p: any) => {
        const ts = p.checkedInAt || p.usedAt || p.updatedAt;
        if (ts) {
          const date = new Date(typeof ts === 'number' ? ts : parseInt(ts, 10));
          if (!isNaN(date.getTime())) {
            const h = date.getHours();
            hourCounts[h] = (hourCounts[h] || 0) + 1;
            hasLiveCheckIns = true;
          }
        }
      });

      if (hasLiveCheckIns) {
        setHourlyDistribution(hourCounts);
      } else {
        // Distribución de referencia fiel a la captura (picos en 10 PM y 11 PM)
        const demoHours = new Array(24).fill(0);
        demoHours[20] = 4;   // 8 PM
        demoHours[21] = 12;  // 9 PM
        demoHours[22] = 42;  // 10 PM (barra media)
        demoHours[23] = 78;  // 11 PM (pico máximo)
        setHourlyDistribution(demoHours);
      }
    }, () => {
      // Fallback
      setLiveInvitesCount(100);
      setLiveIngresosCount(100);
      setLiveCortesiasCount(100);
    });

    // 2. Escuchar configuración de covers y manillas en Firestore
    const doorSalesDoc = doc(db, 'events', activeEvent.id, 'doorSales', 'config');
    const unsubDoor = onSnapshot(doorSalesDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.coverPrice !== undefined) setCoverPrice(Number(data.coverPrice));
        if (data.assignedBands !== undefined) setAssignedBands(Number(data.assignedBands));
        if (data.soldCount !== undefined) setSoldBandsCount(Number(data.soldCount));
      } else {
        // Valores por defecto de referencia visual
        setCoverPrice(50);
        setAssignedBands(100);
        setSoldBandsCount(16);
      }
    }, () => {});

    return () => {
      unsubPasses();
      unsubDoor();
    };
  }, [activeEvent.id, activeEvent.guestsCount]);

  // Cálculo total recaudado
  const totalCollectedBs = useMemo(() => {
    return coverPrice * soldBandsCount;
  }, [coverPrice, soldBandsCount]);

  const totalCollectedFormatted = useMemo(() => {
    return totalCollectedBs.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [totalCollectedBs]);

  // Tasa de asistencia calculada
  const attendanceRateStr = useMemo(() => {
    if (liveInvitesCount === 0) return '+100%';
    const pct = Math.min(100, Math.round((liveIngresosCount / liveInvitesCount) * 100));
    return `+${pct || 100}%`;
  }, [liveIngresosCount, liveInvitesCount]);

  // Manejo de guardar configuración de covers
  const handleSaveCoverConfig = async () => {
    if (!activeEvent?.id) return;
    setIsSavingCoverConfig(true);
    try {
      const configRef = doc(db, 'events', activeEvent.id, 'doorSales', 'config');
      const payload = {
        coverPrice: Number(formPrice) || 0,
        assignedBands: Number(formAssigned) || 0,
        soldCount: Number(formSold) || 0,
        totalCollected: (Number(formPrice) || 0) * (Number(formSold) || 0),
        updatedAt: Date.now(),
      };
      await setDoc(configRef, payload, { merge: true });

      // Actualizar estado local inmediatamente
      setCoverPrice(payload.coverPrice);
      setAssignedBands(payload.assignedBands);
      setSoldBandsCount(payload.soldCount);

      showToast('🟢 CONFIGURACIÓN DE COVERS GUARDADA');
      setActiveModal(null);
    } catch {
      showToast('Error al guardar en Firestore');
    } finally {
      setIsSavingCoverConfig(false);
    }
  };

  // Abrir modal de configuración de manillas con datos actuales
  const openWristbandsModal = () => {
    setFormPrice(coverPrice);
    setFormAssigned(assignedBands);
    setFormSold(soldBandsCount);
    setActiveModal('wristbands');
  };

  // Carga y compresión de la foto de perfil en el modal de cuenta
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona una imagen válida');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 400;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setIsUploadingAvatar(false);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          let compressedBase64 = canvas.toDataURL('image/webp', 0.8);
          if (!compressedBase64.startsWith('data:image/webp')) {
            compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          }

          setAvatarUrl(compressedBase64);
          if (onUpdateAvatar) onUpdateAvatar(compressedBase64);

          if (auth.currentUser) {
            try {
              await updateProfile(auth.currentUser, { photoURL: compressedBase64 });
              await updateDoc(doc(db, 'users', auth.currentUser.uid), { photoUrl: compressedBase64 });
            } catch {
              await setDoc(doc(db, 'users', auth.currentUser.uid), { photoUrl: compressedBase64 }, { merge: true });
            }
          }

          setIsUploadingAvatar(false);
          showToast('✦ Foto de perfil actualizada');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingAvatar(false);
      showToast('Error al actualizar la foto');
    }
  };

  const handleSaveName = async () => {
    const trimmed = editNameValue.trim();
    if (!trimmed) {
      showToast('El nombre no puede estar vacío');
      return;
    }

    setIsSavingName(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: trimmed });
        await setDoc(doc(db, 'users', auth.currentUser.uid), { name: trimmed }, { merge: true });
      }
      setDisplayName(trimmed);
      if (onUpdateName) onUpdateName(trimmed);
      setIsEditingName(false);
      showToast('🟢 NOMBRE ACTUALIZADO');
    } catch {
      showToast('Error al actualizar el nombre');
    } finally {
      setIsSavingName(false);
    }
  };

  const isPartner = Boolean(
    isOwner
      ? (profileData?.isPartner ?? userProfileData?.isPartner ?? user?.isPartner)
      : profileData?.isPartner
  );

  const isFollowing = useMemo(() => {
    return Boolean(targetUserId && currentUserFollowing.includes(targetUserId));
  }, [targetUserId, currentUserFollowing]);

  const currentCategory = useMemo(() => {
    return BUSINESS_CATEGORIES.find((c) => c.id === businessCategory) || BUSINESS_CATEGORIES[0];
  }, [businessCategory]);

  // Manejo de portada superior
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona una imagen válida');
      return;
    }

    setIsUploadingCover(true);
    try {
      const compressed = await compressImageFile(file, 1080, 0.82);
      setCoverPhotoUrl(compressed);
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        try {
          await updateDoc(userRef, { coverPhotoUrl: compressed });
        } catch {
          await setDoc(userRef, { coverPhotoUrl: compressed }, { merge: true });
        }
      }
      showToast('✦ Foto de portada actualizada');
    } catch (err) {
      console.error('Error portada:', err);
      showToast('Error al subir imagen de portada');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Manejo de fotos de galería
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona una imagen válida');
      return;
    }

    if (galleryPhotos.length >= 6) {
      showToast('Límite alcanzado: máximo 6 fotos en la galería');
      return;
    }

    setIsUploadingGallery(true);
    try {
      const compressed = await compressImageFile(file, 800, 0.8);
      const updated = [...galleryPhotos, compressed].slice(0, 6);
      setGalleryPhotos(updated);
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        try {
          await updateDoc(userRef, { galleryPhotos: updated });
        } catch {
          await setDoc(userRef, { galleryPhotos: updated }, { merge: true });
        }
      }
      showToast('✦ Foto agregada a tu galería');
    } catch (err) {
      console.error('Error galería:', err);
      showToast('Error al procesar foto para galería');
    } finally {
      setIsUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleDeleteGalleryPhoto = async (indexToDelete: number) => {
    if (!isOwner) return;
    try {
      const updated = galleryPhotos.filter((_, idx) => idx !== indexToDelete);
      setGalleryPhotos(updated);
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { galleryPhotos: updated });
      }
      showToast('Foto eliminada de la galería');
      setSelectedPhoto(null);
    } catch (err) {
      console.error('Error eliminando foto:', err);
      showToast('Error al eliminar foto');
    }
  };

  // Selección de categoría comercial
  const handleSelectCategory = async (catId: BusinessCategoryType) => {
    if (!isOwner) return;
    try {
      setBusinessCategory(catId);
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        try {
          await updateDoc(userRef, { businessCategory: catId });
        } catch {
          await setDoc(userRef, { businessCategory: catId }, { merge: true });
        }
      }
      const catObj = BUSINESS_CATEGORIES.find((c) => c.id === catId);
      showToast(`✦ Ramo actualizado: ${catObj?.label || catId}`);
      setActiveModal(null);
    } catch (err) {
      console.error('Error categoría:', err);
      showToast('Error al guardar categoría');
    }
  };

  // Seguir / Dejar de seguir al anfitrión
  const handleToggleFollow = async () => {
    if (!auth.currentUser) {
      showToast('Inicia sesión para seguir anfitriones');
      return;
    }
    if (isOwner || !targetUserId || isFollowingPending) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    setIsFollowingPending(true);
    const visitorUid = auth.currentUser.uid;
    const visitorRef = doc(db, 'users', visitorUid);
    const hostRef = doc(db, 'users', targetUserId);

    try {
      if (isFollowing) {
        await updateDoc(visitorRef, {
          following: arrayRemove(targetUserId),
        });
        await updateDoc(hostRef, {
          followersCount: increment(-1),
        }).catch(() => {});
        setCurrentUserFollowing((prev) => prev.filter((id) => id !== targetUserId));
        setFollowersCount((prev) => Math.max(0, prev - 1));
        showToast('Dejaste de seguir a este anfitrión');
      } else {
        await updateDoc(visitorRef, {
          following: arrayUnion(targetUserId),
        });
        await updateDoc(hostRef, {
          followersCount: increment(1),
        }).catch(() => {});
        setCurrentUserFollowing((prev) => [...prev, targetUserId]);
        setFollowersCount((prev) => prev + 1);
        showToast('✦ ¡Ahora sigues a este anfitrión!');
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      showToast('Error al actualizar seguimiento');
    } finally {
      setIsFollowingPending(false);
    }
  };

  // Pull-to-Refresh: Sincronización manual en tiempo real desde Firestore
  const handleRefresh = async () => {
    try {
      if (auth.currentUser) {
        // 1. Re-consultar perfil
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const d = snap.data();
          setUserProfileData(d);
          if (d.name) setDisplayName(d.name);
          if (d.photoUrl) setAvatarUrl(d.photoUrl);
        }

        // 2. Re-consultar eventos creados
        const qEvents = query(
          collection(db, 'events'),
          where('hostUserId', '==', auth.currentUser.uid)
        );
        const evSnap = await getDocs(qEvents);
        const now = Date.now();
        const myEvents: CreatedEventItem[] = evSnap.docs.map((docSnap) => {
          const d = docSnap.data();
          const eventEnd = d.endTimestamp || computeEventEndTimestamp(d.date, d.endTime, d.startTime);
          return {
            id: docSnap.id,
            title: d.title || 'Evento sin título',
            dateStr: `${d.date || 'Próximamente'} · ${d.startTime || '22:00'}`,
            status: eventEnd <= now ? 'Finalizado' : 'Activo',
            isFinished: eventEnd <= now,
            endTimestamp: eventEnd,
            guestsCount: d.confirmedCount || d.guestsCount || 0,
            maxCapacity: d.maxCapacity || d.guestLimit || 150,
          };
        });
        setUserEvents(myEvents);
      }
      showToast('Perfil actualizado');
    } catch (e) {
      console.error('[ProfileScreen] Error en pull-to-refresh:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('Sesión cerrada');
      if (onBack) onBack();
      else if (onNavigate) onNavigate('/');
    } catch {
      showToast('Error al cerrar sesión');
    }
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: '+1 (Más Uno) - Pases y Listas VIP',
        text: '¡Entra gratis a los mejores eventos y fiestas con +1!',
        url: window.location.origin,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.origin);
      showToast('Enlace copiado al portapapeles');
    }
  };

  // Activación inmediata mediante código secreto ("prouser")
  const handleActivateProViaCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = secretCode.trim().toLowerCase();

    if (cleanCode !== 'prouser') {
      setSecretCodeError('🤡 INTENTA DE NUEVO HAHAHA ');
      return;
    }

    setSecretCodeError('');
    setIsActivatingPro(true);

    try {
      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const proPayload = {
          isPartner: true,
          partnerTier: 'SOCIO_PLUS',
          activatedViaCode: 'prouser',
          updatedAt: Date.now(),
        };
        try {
          await updateDoc(userDocRef, proPayload);
        } catch {
          await setDoc(userDocRef, proPayload, { merge: true });
        }
      }

      // Actualizar estado local inmediatamente para desbloqueo visual instantáneo
      setUserProfileData((prev: any) => ({
        ...(prev || {}),
        isPartner: true,
        partnerTier: 'SOCIO_PLUS',
        activatedViaCode: 'prouser',
      }));

      setActiveModal(null);
      setSecretCode('');
      setSecretCodeError('');
      showToast('PRO Activado');
    } catch {
      showToast('Error al activar PRO');
    } finally {
      setIsActivatingPro(false);
    }
  };

  // Helper para renderizar las barras históricas
  const maxBarValue = useMemo(() => {
    const maxVal = Math.max(...(hourlyDistribution.length > 0 ? hourlyDistribution : [1]));
    return maxVal > 0 ? maxVal : 1;
  }, [hourlyDistribution]);

  return (
    <div className="relative w-full min-h-[100dvh] bg-[#000000] text-white flex flex-col justify-between overflow-x-hidden font-sans select-none pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Fondo abstracto sutil */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-cover bg-center"
        style={{
          backgroundImage: "url('./assets/images/fondo_b.webp')",
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      />

      {/* Degradado superior */}
      <div className="fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-[#000000] via-[#000000]/70 to-transparent pointer-events-none z-10" />

      {/* Contenedor central móvil con Pull-to-Refresh */}
      <PullToRefresh
        onRefresh={handleRefresh}
        className="relative z-20 flex-1 flex flex-col w-full max-w-md mx-auto px-4 sm:px-5"
      >
        
        {isPartner ? (
          /* ==================================================== */
          /* EXPERIENCIA PRO / SOCIO + : PÁGINA DE NEGOCIO/CREADOR */
          /* ==================================================== */
          <div className="w-full flex flex-col items-center">
            {/* A. COVER PANORÁMICO SUPERIOR */}
            <div className="h-44 sm:h-52 w-full relative bg-[#181A1E] overflow-hidden -mx-4 sm:-mx-5 rounded-b-3xl">
              {coverPhotoUrl ? (
                <img
                  src={coverPhotoUrl}
                  alt="Portada del anfitrión"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full bg-cover bg-center opacity-60 flex items-center justify-center relative"
                  style={{
                    backgroundImage: "url('./assets/images/fondo_iniciob.webp')",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <span className="relative z-10 font-display text-white/30 text-2xl font-black uppercase tracking-widest">
                    PORTADA +1
                  </span>
                </div>
              )}

              {/* Botón de volver y acciones superiores flotantes */}
              <div className="absolute top-0 inset-x-0 pt-[max(0.75rem,env(safe-area-inset-top,0px))] px-4 flex items-center justify-between z-20">
                <button
                  onClick={onBack || (() => onNavigate?.('/'))}
                  aria-label="Regresar"
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-lg"
                >
                  <span className="text-lg font-bold">‹</span>
                </button>

                <div className="flex items-center space-x-2">
                  {/* Compartir perfil */}
                  <button
                    onClick={handleShareApp}
                    aria-label="Compartir perfil"
                    className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-lg"
                  >
                    <span className="text-sm">↗</span>
                  </button>

                  {/* Si es el dueño: botón de subir/cambiar portada */}
                  {isOwner && (
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingCover}
                      aria-label="Cambiar portada"
                      className="h-9 px-3 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 flex items-center space-x-1.5 transition-transform active:scale-95 cursor-pointer shadow-lg text-xs font-display font-bold tracking-wider"
                    >
                      <span>📷</span>
                      <span className="hidden sm:inline">EDITAR PORTADA</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Input oculto de portada */}
              {isOwner && (
                <input
                  type="file"
                  ref={coverInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              )}
            </div>

            {/* B. AVATAR SUPERPUESTO Y NOMBRE */}
            <div className="relative -mt-14 sm:-mt-16 z-20 flex flex-col items-center">
              <div className="relative group">
                <div
                  onClick={() => {
                    if (isOwner) fileInputRef.current?.click();
                  }}
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#0B0C0E] bg-[#16171B] overflow-hidden shadow-2xl p-[3px] ${
                    isOwner ? 'cursor-pointer active:scale-95 transition-transform' : ''
                  }`}
                  style={{
                    boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 0 2px #E87A72',
                  }}
                >
                  <img
                    src={avatarUrl || user.avatarUrl || './assets/images/foto_perfil.webp'}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>

                {isOwner && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Cambiar avatar"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#E87A72] border-2 border-[#0B0C0E] flex items-center justify-center text-black shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  >
                    <span className="text-xs">📷</span>
                  </button>
                )}
              </div>

              {/* Nombre de usuario */}
              <h1 className="font-display text-2xl sm:text-3xl text-white uppercase text-center mt-2.5 tracking-wide font-black truncate max-w-[320px] px-2">
                {displayName}
              </h1>

              {/* C. SELECTOR / BADGE DE RAMO COMERCIAL */}
              {isOwner ? (
                <button
                  onClick={() => setActiveModal('category_picker')}
                  className="px-3.5 py-1 bg-[#26282E] hover:bg-[#32353D] text-zinc-300 hover:text-white font-sans text-xs uppercase tracking-wider rounded-full mt-1.5 flex items-center space-x-1.5 transition-colors cursor-pointer border border-zinc-700/50"
                  title="Cambiar ramo comercial"
                >
                  <span>{currentCategory?.icon || '🪩'}</span>
                  <span className="font-semibold">{currentCategory?.label || 'Club'}</span>
                  <span className="text-[10px] text-zinc-400">▾</span>
                </button>
              ) : (
                <div className="px-3 py-1 bg-[#26282E] text-zinc-300 font-sans text-xs uppercase tracking-wider rounded-full mt-1.5 flex items-center space-x-1.5">
                  <span>{currentCategory?.icon || '🪩'}</span>
                  <span className="font-semibold">{currentCategory?.label || 'Club'}</span>
                </div>
              )}
            </div>

            {/* D. BOTÓN DE ACCIÓN DINÁMICO (SALMÓN #E87A72) */}
            <div className="w-full max-w-xs mx-auto mt-4 px-2">
              {isOwner ? (
                <button
                  onClick={() => setActiveModal('live_dashboard')}
                  className="w-full h-12 rounded-2xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display font-black text-sm tracking-wider uppercase transition-transform active:scale-95 shadow-lg shadow-[#E87A72]/20 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>🎪</span>
                  <span>MIS EVENTOS CREADOS</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  disabled={isFollowingPending}
                  className={`w-full h-12 rounded-2xl font-display font-black text-sm tracking-wider uppercase transition-all active:scale-95 shadow-lg flex items-center justify-center space-x-2 cursor-pointer ${
                    isFollowing
                      ? 'bg-[#26282E] hover:bg-[#32353D] text-white border border-[#3E424B]'
                      : 'bg-[#E87A72] hover:bg-[#d66f67] text-black shadow-[#E87A72]/20'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <span>SIGUIENDO</span>
                      <span className="text-base leading-none">✓</span>
                    </>
                  ) : (
                    <>
                      <span className="text-base leading-none">+</span>
                      <span>SEGUIR</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* E. GALERÍA DE FOTOS DEL ANFITRIÓN (HASTA 6 FOTOS) */}
            <div className="w-full mt-6">
              <div className="px-4 mb-2 text-left">
                <h3 className="font-display text-white text-xl sm:text-2xl font-black uppercase tracking-wider">
                  GALERÍA
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#8E8E93] font-medium tracking-wide">
                  Muestra cómo se viven tus noches
                </p>
              </div>

              {/* Grid 3x2 responsivo */}
              <div className="grid grid-cols-3 gap-2 px-4 mt-3 mb-6 w-full">
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const photo = galleryPhotos[index];
                  if (photo) {
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedPhoto(photo)}
                        className="aspect-square rounded-xl bg-[#16171B] border border-[#26282E] overflow-hidden relative group cursor-pointer shadow-md"
                      >
                        <img
                          src={photo}
                          alt={`Galería ${index + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        {isOwner && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGalleryPhoto(index);
                            }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            title="Eliminar de galería"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  }
                  if (isOwner) {
                    return (
                      <button
                        key={index}
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={isUploadingGallery}
                        className="aspect-square rounded-xl bg-[#16171B] hover:bg-[#1C1E24] border border-dashed border-[#26282E] hover:border-[#E87A72]/60 flex flex-col items-center justify-center transition-colors group cursor-pointer"
                      >
                        <span className="text-xl text-neutral-400 group-hover:text-[#E87A72] transition-colors leading-none">+</span>
                        <span className="font-sans text-[10px] text-neutral-500 uppercase mt-1 font-bold">Subir</span>
                      </button>
                    );
                  }
                  return (
                    <div
                      key={index}
                      className="aspect-square rounded-xl bg-[#16171B]/30 border border-[#26282E]/30 flex items-center justify-center"
                    >
                      <span className="text-neutral-700 text-base">📷</span>
                    </div>
                  );
                })}
              </div>

              {/* Input oculto para galería */}
              {isOwner && (
                <input
                  type="file"
                  ref={galleryInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleGalleryUpload}
                />
              )}
            </div>

            {/* EVENTOS PÚBLICOS DEL ANFITRIÓN */}
            {userEvents.length > 0 && (
              <div className="w-full px-4 mb-6">
                <div className="mb-2.5 text-left">
                  <h3 className="font-display text-white text-lg font-black uppercase tracking-wider">
                    {isOwner ? 'TUS EVENTOS' : 'PRÓXIMOS EVENTOS'}
                  </h3>
                </div>
                <div className="space-y-2">
                  {userEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="w-full p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] flex items-center justify-between shadow-md"
                    >
                      <div className="flex items-center space-x-3 truncate pr-2">
                        <span className="text-2xl shrink-0">🎪</span>
                        <div className="truncate text-left">
                          <h4 className="font-display text-white text-base font-black tracking-wide uppercase truncate leading-tight">
                            {evt.title}
                          </h4>
                          <span className="font-sans text-xs text-[#9CA3AF] font-medium block mt-0.5">
                            👥 {evt.guestsCount || 0} CONFIRMADOS · {evt.dateStr}
                          </span>
                        </div>
                      </div>
                      {isOwner ? (
                        <button
                          onClick={() => onNavigate?.(`/create-event?edit=${evt.id}`)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#26282E] hover:bg-neutral-800 text-white hover:text-[#E87A72] font-display text-xs font-bold tracking-wider uppercase transition-colors shadow-sm shrink-0 active:scale-95 cursor-pointer border border-neutral-700/60"
                        >
                          EDITAR
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate?.(`/vip/${evt.id}`)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display text-xs font-black tracking-wider uppercase transition-colors shadow-sm shrink-0 active:scale-95 cursor-pointer"
                        >
                          VER PASE
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECCIONES EXCLUSIVAS DEL DUEÑO PRO */}
            {isOwner && (
              <>
                {/* 3 TARJETAS DE MÉTRICAS */}
                <div className="grid grid-cols-3 gap-2.5 w-full px-4 mt-2">
                  <div
                    onClick={() => setActiveModal('events')}
                    className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg active:scale-95"
                  >
                    <div className="text-xl mb-1">📅</div>
                    <span className="font-display text-white text-3xl sm:text-[34px] font-black tracking-tight leading-none my-1">
                      {userEvents.length > 0 ? userEvents.length : 10}
                    </span>
                    <span className="font-display text-neutral-400 text-[11px] font-bold tracking-wider uppercase">
                      EVENTOS
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveModal('streak')}
                    className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#FAB205]/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg active:scale-95"
                  >
                    <div className="text-xl mb-1">🔥</div>
                    <span className="font-display text-white text-3xl sm:text-[34px] font-black tracking-tight leading-none my-1">
                      3
                    </span>
                    <span className="font-display text-neutral-400 text-[11px] font-bold tracking-wider uppercase">
                      RACHA
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveModal('store')}
                    className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#FAB205]/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg active:scale-95"
                  >
                    <div className="text-xl mb-1">🪙</div>
                    <span className="font-display text-[#FAB205] text-2xl sm:text-[28px] font-black tracking-tight leading-tight my-auto text-center">
                      380
                    </span>
                    <span className="font-display text-neutral-400 text-[11px] font-bold tracking-wider uppercase mt-1">
                      PLUSCOINS
                    </span>
                  </div>
                </div>

                {/* BOTÓN DIRECTO AL DASHBOARD EN VIVO Y SECCIÓN CUENTA (SOLO PROPIETARIO) */}
                {isOwner && (
                  <>
                    <div className="w-full px-4 mt-4">
                      <button
                        onClick={() => setActiveModal('live_dashboard')}
                        className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#16171B] via-[#1E2026] to-[#16171B] border border-[#FAB205]/40 hover:border-[#FAB205] flex items-center justify-between shadow-xl transition-all active:scale-98 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3 text-left">
                          <span className="text-2xl">📊</span>
                          <div>
                            <h4 className="font-display text-white text-sm font-black tracking-wider uppercase">
                              DASHBOARD ANALÍTICO EN VIVO
                            </h4>
                            <span className="font-sans text-[11px] text-zinc-400">
                              Diales radiales, horas pico y control de puerta
                            </span>
                          </div>
                        </div>
                        <span className="text-[#FAB205] text-lg font-bold">›</span>
                      </button>
                    </div>

                    {/* SECCIÓN CUENTA */}
                    <div className="w-full mt-6 mb-6 px-4">
                      <h3 className="font-display text-white text-lg font-black tracking-wider uppercase mb-3 text-left">
                        CUENTA
                      </h3>

                      <div className="rounded-2xl bg-[#16171B] border border-[#26282E] divide-y divide-[#26282E] overflow-hidden text-left shadow-lg">
                        {/* Editar nombre */}
                        <div
                          onClick={() => {
                            setEditNameValue(displayName);
                            setIsEditingName(true);
                          }}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">👤</span>
                            <div>
                              <div className="font-display text-white text-sm font-bold uppercase tracking-wide">
                                NOMBRE DE PERFIL
                              </div>
                              <div className="font-sans text-xs text-neutral-400">{displayName}</div>
                            </div>
                          </div>
                          <span className="text-neutral-500 font-bold text-lg">›</span>
                        </div>

                        {/* Membresía Socio + */}
                        <div
                          onClick={() => showToast('⭐ Membresía Activa · Plan Negocios & Promotores')}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">👑</span>
                            <div>
                              <div className="font-display text-white text-sm font-bold uppercase tracking-wide flex items-center space-x-1.5">
                                <span>SOCIO +</span>
                                <span className="px-2 py-0.5 rounded-full bg-[#FAB205]/20 text-[#FAB205] text-[10px] font-black border border-[#FAB205]/40">
                                  ACTIVO
                                </span>
                              </div>
                              <div className="font-sans text-xs text-neutral-400">Página de negocio & analytics</div>
                            </div>
                          </div>
                          <span className="text-neutral-500 font-bold text-lg">›</span>
                        </div>

                        {/* Compartir App */}
                        <div
                          onClick={handleShareApp}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">📲</span>
                            <div>
                              <div className="font-display text-white text-sm font-bold uppercase tracking-wide">
                                COMPARTIR PERFIL
                              </div>
                              <div className="font-sans text-xs text-neutral-400">Invita a tus seguidores a +1</div>
                            </div>
                          </div>
                          <span className="text-neutral-500 font-bold text-lg">›</span>
                        </div>
                      </div>

                      {/* Cerrar Sesión */}
                      <div className="mt-8 text-center pb-4">
                        <button
                          onClick={handleLogout}
                          className="font-display text-xs sm:text-sm font-bold tracking-widest text-[#EF4444] uppercase hover:underline focus:outline-none cursor-pointer bg-transparent border-0"
                        >
                          CERRAR SESIÓN
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          /* ==================================================== */
          /* EXPERIENCIA FREE: PERFIL ESTÁNDAR                   */
          /* ==================================================== */
          <div className="w-full flex flex-col items-center">
            {/* 1. TOP BAR */}
            <header className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-2.5 w-full relative z-30">
              {isOwner ? (
                <button
                  onClick={onBack || (() => onNavigate?.('/'))}
                  aria-label="Regresar al inicio"
                  className="flex items-center space-x-1 focus:outline-none cursor-pointer group transition-transform active:scale-95"
                >
                  <span className="font-display text-[#E87A72] text-[32px] sm:text-[34px] font-black tracking-tighter leading-none group-hover:brightness-110">
                    +1
                  </span>
                </button>
              ) : (
                <button
                  onClick={onBack || (() => onNavigate?.('/'))}
                  aria-label="Regresar"
                  className="flex items-center space-x-2 text-white/90 hover:text-white transition-opacity active:scale-95 cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg font-bold shadow-md">
                    ‹
                  </span>
                  <span className="font-display text-xs font-bold tracking-wider text-neutral-400 uppercase">
                    VOLVER
                  </span>
                </button>
              )}

              <div className="flex items-center space-x-3">
                {isOwner ? (
                  <button
                    onClick={() => setIsNotificationsOpen(true)}
                    aria-label="Notificaciones"
                    className="relative w-9 h-9 rounded-full bg-neutral-900/90 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-all active:scale-90 focus:outline-none cursor-pointer"
                  >
                    <span className="text-base">🔔</span>
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#EF4444] text-white font-display text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black shadow-md leading-none">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleShareApp}
                    aria-label="Compartir perfil"
                    className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white/90 hover:text-white transition-transform active:scale-90 cursor-pointer shadow-md"
                  >
                    <span className="text-sm">↗</span>
                  </button>
                )}
              </div>
            </header>

            {/* 2. AVATAR Y DATOS DE PERFIL */}
            <div className="flex flex-col items-center text-center mt-2">
              <div className="relative group">
                <div
                  onClick={() => {
                    if (isOwner) fileInputRef.current?.click();
                  }}
                  className={`w-24 h-24 rounded-full p-[2px] border-2 border-[#E87A72] bg-[#16171B] shadow-xl overflow-hidden ${
                    isOwner ? 'cursor-pointer active:scale-95 transition-transform' : ''
                  }`}
                >
                  <img
                    src={avatarUrl || user?.avatarUrl || './assets/images/foto_perfil.webp'}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                {isOwner && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Cambiar foto de perfil"
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#E87A72] border-2 border-black flex items-center justify-center text-black shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all"
                    >
                      <span className="text-xs">📷</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </>
                )}
              </div>

              <div className="flex items-center justify-center space-x-2 mt-3 group">
                <h2 className="font-display text-white text-[32px] sm:text-[36px] font-black tracking-tight uppercase leading-none">
                  {displayName}
                </h2>
                {isOwner && (
                  <button
                    onClick={() => {
                      setEditNameValue(displayName);
                      setIsEditingName(true);
                    }}
                    aria-label="Editar nombre"
                    className="w-7 h-7 rounded-full bg-[#16171B] hover:bg-neutral-800 border border-[#26282E] flex items-center justify-center text-[#9CA3AF] hover:text-[#E87A72] transition-colors active:scale-90 focus:outline-none cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                )}
              </div>

              {!isOwner && (
                <button
                  onClick={handleToggleFollow}
                  disabled={isFollowingPending}
                  className={`mt-3 px-6 h-10 rounded-full font-display font-black text-xs tracking-wider uppercase transition-all active:scale-95 shadow-md flex items-center justify-center space-x-1.5 cursor-pointer ${
                    isFollowing
                      ? 'bg-[#26282E] hover:bg-[#32353D] text-white border border-[#3E424B]'
                      : 'bg-[#E87A72] hover:bg-[#d66f67] text-black shadow-[#E87A72]/20'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <span>SIGUIENDO</span>
                      <span className="text-sm leading-none">✓</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm leading-none">+</span>
                      <span>SEGUIR</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* BLOQUE DE EVENTOS DEL ANFITRIÓN */}
            <div className="w-full mt-4">
              <div className="mb-2 text-left px-1">
                <span className="font-display text-xs font-black tracking-widest text-neutral-400 uppercase">
                  {isOwner ? 'TUS EVENTOS' : 'EVENTOS DEL ANFITRIÓN'}
                </span>
              </div>
              {userEvents.length > 0 ? (
                <div className="space-y-2">
                  {userEvents.slice(0, 3).map((evt) => (
                    <div
                      key={evt.id}
                      className="w-full p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] flex items-center justify-between shadow-md"
                    >
                      <div className="flex items-center space-x-3 truncate pr-2">
                        <span className="text-2xl shrink-0">🎪</span>
                        <div className="truncate text-left">
                          <h4 className="font-display text-white text-base sm:text-lg font-black tracking-wide uppercase truncate leading-tight">
                            {evt.title}
                          </h4>
                          <span className="font-sans text-xs text-[#9CA3AF] font-medium block mt-0.5">
                            👥 {evt.guestsCount || 0} CONFIRMADOS
                          </span>
                        </div>
                      </div>
                      {isOwner ? (
                        <button
                          onClick={() => onNavigate?.(`/create-event?edit=${evt.id}`)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#26282E] hover:bg-neutral-800 text-white hover:text-[#E87A72] font-display text-xs font-bold tracking-wider uppercase transition-colors shadow-sm shrink-0 active:scale-95 cursor-pointer border border-neutral-700/60"
                        >
                          EDITAR
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate?.(`/vip/${evt.id}`)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display text-xs font-black tracking-wider uppercase transition-colors shadow-sm shrink-0 active:scale-95 cursor-pointer"
                        >
                          VER PASE
                        </button>
                      )}
                    </div>
                  ))}

                  {userEvents.length > 3 && (
                    <button
                      onClick={() => setActiveModal('events')}
                      className="w-full py-2.5 rounded-xl bg-[#16171B] hover:bg-neutral-800 border border-[#26282E] text-zinc-400 hover:text-white font-display text-xs font-bold tracking-wider uppercase transition-colors text-center cursor-pointer"
                    >
                      {isOwner ? `MIS EVENTOS CREADOS (${userEvents.length}) ›` : `MÁS EVENTOS (${userEvents.length}) ›`}
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full p-4 rounded-2xl bg-[#16171B]/50 border border-dashed border-[#26282E] flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-xl mb-1.5">🎉</span>
                  <p className="font-sans text-xs sm:text-sm text-neutral-300 font-medium tracking-wide uppercase mb-3 max-w-[260px]">
                    {isOwner ? '¿ORGANIZAS UNA PREVIA O FIESTA? CREA TU PRIMER EVENTO' : 'ESTE ANFITRIÓN NO TIENE EVENTOS ACTIVOS'}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => onNavigate?.('/create-event')}
                      className="py-2.5 px-4 rounded-xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display font-black text-xs tracking-wider uppercase transition-transform active:scale-95 shadow-md cursor-pointer"
                    >
                      [ + CREAR EVENTO ]
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3 TARJETAS DE MÉTRICAS */}
            <div className="grid grid-cols-3 gap-2.5 w-full mt-4">
              <div
                onClick={() => setActiveModal('events')}
                className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg active:scale-95"
              >
                <div className="text-xl mb-1">📅</div>
                <span className="font-display text-white text-3xl sm:text-[34px] font-black tracking-tight leading-none my-1">
                  {userEvents.length}
                </span>
                <span className="font-display text-neutral-400 text-[11px] font-bold tracking-wider uppercase">
                  EVENTOS
                </span>
              </div>

              <div
                onClick={() => setActiveModal('streak')}
                className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-orange-500/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg active:scale-95"
              >
                <div className="text-xl mb-1">⏱️</div>
                <div className="flex items-center justify-center space-x-1 my-1">
                  <span className="text-2xl filter drop-shadow">🔥</span>
                  <span className="font-display text-white text-3xl sm:text-[34px] font-black tracking-tight leading-none">
                    3
                  </span>
                </div>
                <span className="font-display text-neutral-400 text-[11px] font-bold tracking-wider uppercase">
                  RACHA
                </span>
              </div>

              <div
                onClick={() => setActiveModal('store')}
                className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#FAB205]/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg active:scale-95"
              >
                <div className="text-xl mb-1">⭐</div>
                <span className="font-display text-[#FAB205] text-2xl sm:text-[28px] font-black tracking-tight leading-tight my-auto text-center">
                  380
                </span>
                <span className="font-display text-neutral-400 text-[11px] font-bold tracking-wider uppercase mt-1">
                  PLUSCOINS
                </span>
              </div>
            </div>

            {/* SECCIÓN CUENTA (SÓLO SI ES EL PROPIETARIO) */}
            {isOwner && (
              <div className="w-full mt-6 mb-6">
                <h3 className="font-display text-white text-lg font-black tracking-wider uppercase mb-3 px-1 text-left">
                  CUENTA
                </h3>

                <div className="space-y-2.5">
                  <div
                    onClick={() => setActiveModal('subscription')}
                    className="w-full p-4 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/50 flex items-center justify-between cursor-pointer transition-colors shadow-md active:scale-98"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg">
                        💳
                      </div>
                      <div className="text-left">
                        <span className="font-display text-white text-base sm:text-lg font-black tracking-tight uppercase block leading-tight">
                          HAZTE SOCIO + POR $US 4.99/MES
                        </span>
                        <span className="font-sans text-neutral-400 text-xs block">
                          Diseñado para promotores, clubes y organizadores
                        </span>
                      </div>
                    </div>
                    <span className="text-neutral-500 font-bold text-lg">›</span>
                  </div>

                  <div
                    onClick={handleShareApp}
                    className="w-full p-4 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/50 flex items-center justify-between cursor-pointer transition-colors shadow-md active:scale-98"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg">
                        🔗
                      </div>
                      <div className="text-left">
                        <span className="font-display text-white text-base sm:text-lg font-black tracking-tight uppercase block leading-tight">
                          COMPARTIR LA APP
                        </span>
                        <span className="font-sans text-neutral-400 text-xs block">
                          Invita amigos y gana Pluscoins
                        </span>
                      </div>
                    </div>
                    <span className="text-neutral-500 font-bold text-lg">›</span>
                  </div>
                </div>

                <div className="mt-8 text-center pb-4">
                  <button
                    onClick={handleLogout}
                    className="font-display text-xs sm:text-sm font-bold tracking-widest text-[#EF4444] uppercase hover:underline focus:outline-none cursor-pointer bg-transparent border-0"
                  >
                    CERRAR SESIÓN
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </PullToRefresh>

      {/* ==================================================== */}
      {/* MODAL: CONFIGURACIÓN DE COVERS Y MANILLAS EN PUERTA */}
      {/* ==================================================== */}
      <AnimatePresence>
        {/* ==================================================== */}
        {/* MODAL: SELECTOR DE RAMO COMERCIAL                   */}
        {/* ==================================================== */}
        {activeModal === 'category_picker' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left flex flex-col"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center space-x-2.5 mb-1">
                <span className="text-xl">🏷️</span>
                <h3 className="font-display text-white text-xl font-black tracking-wide uppercase">
                  RAMO COMERCIAL
                </h3>
              </div>
              <p className="font-sans text-neutral-400 text-xs mb-4">
                Selecciona la categoría que define a tu negocio o perfil creador:
              </p>

              <div className="grid grid-cols-3 gap-2">
                {BUSINESS_CATEGORIES.map((cat) => {
                  const isSelected = businessCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleSelectCategory(cat.id)}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E87A72]/15 border-[#E87A72] text-white shadow-md'
                          : 'bg-[#181A1E] border-[#26282E] text-zinc-300 hover:bg-[#202228] hover:text-white'
                      }`}
                    >
                      <span className="text-2xl mb-1">{cat.icon}</span>
                      <span className="font-display text-xs font-bold uppercase tracking-wider leading-tight">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: DASHBOARD ANALÍTICO EN VIVO                  */}
        {/* ==================================================== */}
        {activeModal === 'live_dashboard' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md max-h-[90vh] rounded-[28px] bg-[#121316] border border-[#26282E] p-5 shadow-2xl relative text-left flex flex-col overflow-y-auto no-scrollbar"
            >
              {/* Encabezado */}
              <div className="flex items-center justify-between pb-3 border-b border-[#26282E] mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">📊</span>
                  <div>
                    <h3 className="font-display text-white text-xl font-black tracking-wide uppercase leading-none">
                      DASHBOARD EN VIVO
                    </h3>
                    <span className="font-sans text-[11px] text-zinc-400">
                      Métricas y control en tiempo real
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Selector de evento activo */}
              <div className="w-full flex items-center justify-between px-2 mb-4 bg-[#16171B] p-2.5 rounded-2xl border border-[#26282E]">
                <button onClick={handlePrevEvent} className="text-zinc-400 hover:text-white p-1 text-xl font-bold cursor-pointer">‹</button>
                <div className="flex items-center space-x-2 truncate px-2">
                  <h2
                    onClick={() => setActiveModal('event_selector')}
                    className="font-display text-base sm:text-lg text-white tracking-wider uppercase cursor-pointer hover:text-[#E87A72] transition-colors truncate text-center"
                  >
                    {activeEvent?.title || 'MÉXICO TEQUILA & DESMADRE'}
                  </h2>
                  {activeEvent?.id && !activeEvent.id.startsWith('demo_') && (
                    <button
                      onClick={() => onNavigate?.(`/create-event?edit=${activeEvent.id}`)}
                      className="px-2 py-0.5 rounded-lg bg-[#26282E] hover:bg-neutral-700 text-[#E87A72] font-display text-[10px] font-bold tracking-wider uppercase transition-colors shrink-0 cursor-pointer"
                      title="Editar evento"
                    >
                      EDITAR
                    </button>
                  )}
                </div>
                <button onClick={handleNextEvent} className="text-zinc-400 hover:text-white p-1 text-xl font-bold cursor-pointer">›</button>
              </div>

              {/* CARD 1: ASISTENCIA (DIALES RADIALES Y GRÁFICA) */}
              <div className="w-full bg-[#16171B] border border-[#26282E] rounded-2xl p-4 mb-4">
                <div className="border-b border-[#26282E] pb-2 mb-4 text-center">
                  <span className="font-display text-lg text-white tracking-wider">ASISTENCIA</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-6">
                  {/* Invitaciones */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-[#26282E]" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-[#F17D02]" strokeDasharray="75, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span className="absolute font-display text-xl text-white">{liveInvitesCount || 100}</span>
                    </div>
                    <span className="font-sans text-[10px] tracking-wider text-zinc-400 mt-1 uppercase">INVITACIONES</span>
                    <span className="font-sans text-[10px] text-[#F17D02] font-bold">+100%</span>
                  </div>

                  {/* Ingresos */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-[#26282E]" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-[#22C55E]" strokeDasharray="80, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span className="absolute font-display text-xl text-white">{liveIngresosCount || 100}</span>
                    </div>
                    <span className="font-sans text-[10px] tracking-wider text-zinc-400 mt-1 uppercase">INGRESOS</span>
                    <span className="font-sans text-[10px] text-[#22C55E] font-bold">+100%</span>
                  </div>

                  {/* Cortesías */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-[#26282E]" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-[#38BDF8]" strokeDasharray="60, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span className="absolute font-display text-xl text-white">{liveCortesiasCount || 100}</span>
                    </div>
                    <span className="font-sans text-[10px] tracking-wider text-zinc-400 mt-1 uppercase">CORTESÍAS</span>
                    <span className="font-sans text-[10px] text-[#38BDF8] font-bold">+100%</span>
                  </div>
                </div>

                {/* Gráfica de Barras por Horas (Peak Hours) */}
                <div className="w-full border-t border-[#26282E] pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-sans text-xs text-zinc-400 uppercase font-medium">HORAS PICO (INGRESOS / HORA)</span>
                    <span className="font-sans text-[10px] text-zinc-500">22:00 - 04:00</span>
                  </div>
                  <div className="h-20 flex items-end justify-between gap-1 pt-2 px-1">
                    {(hourlyDistribution.length > 0 ? hourlyDistribution : [2, 8, 25, 45, 15, 5]).map((val, idx) => {
                      const hourLabels = ['22h', '23h', '00h', '01h', '02h', '03h'];
                      const heightPercent = Math.max(8, Math.min(100, Math.round((val / maxBarValue) * 100)));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                          <div className="text-[9px] text-zinc-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {val}
                          </div>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full bg-[#E87A72]/80 hover:bg-[#E87A72] rounded-t transition-all"
                          />
                          <span className="text-[9px] text-zinc-500 mt-1 font-mono">{hourLabels[idx] || `${idx}h`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* CARD 2: COVERS GENERAL (VENTA EN PUERTA) */}
              <div className="w-full bg-[#16171B] border border-[#26282E] rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-display text-sm tracking-wider text-white uppercase">COVERS GENERAL (EN PUERTA)</span>
                  <span className="font-sans text-xs text-zinc-400">Total recaudado</span>
                </div>
                <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-[#26282E]">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#8B24C7]/20 border border-[#8B24C7]/40 flex items-center justify-center text-sm">
                      🎟️
                    </div>
                    <div>
                      <div className="font-sans text-xs font-bold text-white uppercase">
                        COVER ({coverPrice || 50}BS C/U)
                      </div>
                      <div className="font-sans text-xs text-zinc-400">x {soldBandsCount || 16}</div>
                    </div>
                  </div>
                  <div className="font-display text-lg text-white">
                    Bs.{totalCollectedFormatted || '800,00'}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-[#26282E]/50">
                  <button
                    onClick={openWristbandsModal}
                    className="w-full py-2 px-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-[#26282E] hover:border-[#8B24C7]/60 text-white font-display text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center space-x-1.5 active:scale-98 cursor-pointer"
                  >
                    <span>⚙️</span>
                    <span>HABILITAR / ASIGNAR MANILLAS</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL: VISTA PREVIA DE FOTO DE GALERÍA               */}
        {/* ==================================================== */}
        {selectedPhoto && (
          <div
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[24px] bg-[#16171B] border border-[#26282E] p-3 shadow-2xl relative text-left flex flex-col overflow-hidden"
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>

              <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black mb-3">
                <img src={selectedPhoto} alt="Foto ampliada" className="w-full h-full object-cover" />
              </div>

              {isOwner && (
                <button
                  onClick={() => {
                    const idx = galleryPhotos.indexOf(selectedPhoto);
                    if (idx !== -1) handleDeleteGalleryPhoto(idx);
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-400 font-display text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
                >
                  ELIMINAR DE MI GALERÍA
                </button>
              )}
            </motion.div>
          </div>
        )}

        {activeModal === 'wristbands' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left flex flex-col"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center space-x-2.5 mb-1">
                <span className="text-xl">⚙️</span>
                <h3 className="font-display text-white text-xl font-black tracking-wide uppercase">
                  MANILLAS EN PUERTA
                </h3>
              </div>
              <p className="font-sans text-neutral-400 text-xs mb-4">
                Configura el precio unitario y audita el arqueo de manillas físicas para staff de puerta:
              </p>

              <div className="space-y-3.5">
                {/* 1. Precio de Cover */}
                <div>
                  <label className="font-display text-neutral-300 text-xs font-bold uppercase tracking-wider block mb-1">
                    Precio por Cover (Bs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#101114] border border-[#26282E] focus:border-[#8B24C7] text-white font-display text-lg font-black tracking-wide outline-none"
                    placeholder="50"
                  />
                </div>

                {/* 2. Manillas Asignadas */}
                <div>
                  <label className="font-display text-neutral-300 text-xs font-bold uppercase tracking-wider block mb-1">
                    Manillas Físicas Asignadas al Staff
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formAssigned}
                    onChange={(e) => setFormAssigned(Math.max(0, Number(e.target.value)))}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#101114] border border-[#26282E] focus:border-[#8B24C7] text-white font-display text-lg font-black tracking-wide outline-none"
                    placeholder="100"
                  />
                </div>

                {/* 3. Manillas Vendidas */}
                <div>
                  <label className="font-display text-neutral-300 text-xs font-bold uppercase tracking-wider block mb-1">
                    Manillas Cobradas / Vendidas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formSold}
                    onChange={(e) => setFormSold(Math.max(0, Number(e.target.value)))}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#101114] border border-[#26282E] focus:border-[#8B24C7] text-white font-display text-lg font-black tracking-wide outline-none"
                    placeholder="16"
                  />
                </div>

                {/* Arqueo en Vivo */}
                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-[#26282E] space-y-1 text-xs font-sans">
                  <div className="flex justify-between text-neutral-400">
                    <span>Recaudación estimada:</span>
                    <span className="font-display font-black text-white text-sm">
                      Bs. {(formPrice * formSold).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Manillas restantes en puerta:</span>
                    <span className="font-display font-black text-[#12C061] text-sm">
                      {Math.max(0, formAssigned - formSold)} un.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button
                  onClick={handleSaveCoverConfig}
                  disabled={isSavingCoverConfig}
                  className="w-full py-3 rounded-xl bg-[#8B24C7] hover:bg-[#781fb0] text-white font-display text-sm font-black tracking-wider uppercase transition-all shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCoverConfig ? 'GUARDANDO...' : 'GUARDAR EN TIEMPO REAL'}
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2 text-neutral-400 hover:text-white font-display text-xs font-bold tracking-wider uppercase transition-colors"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: SELECTOR DE EVENTOS CREADOS                    */}
      {/* ==================================================== */}
      <AnimatePresence>
        {activeModal === 'event_selector' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left flex flex-col max-h-[82vh]"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center space-x-2.5 mb-1">
                <span className="text-xl">🎪</span>
                <h3 className="font-display text-white text-xl font-black tracking-wide uppercase">
                  TUS EVENTOS
                </h3>
              </div>
              <p className="font-sans text-neutral-400 text-xs mb-3">
                Selecciona un evento para visualizar sus métricas y control en vivo:
              </p>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                {userEvents.length === 0 ? (
                  <div className="py-8 text-center bg-neutral-900/80 rounded-2xl border border-neutral-800 p-4">
                    <p className="font-sans text-neutral-400 text-xs mb-3">
                      Estás viendo el evento demo predeterminado. ¡Publica tu primer evento oficial!
                    </p>
                    <button
                      onClick={() => {
                        setActiveModal(null);
                        onNavigate?.('/create-event');
                      }}
                      className="px-4 py-2 bg-[#E87A72] text-black font-display font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
                    >
                      + CREAR EVENTO
                    </button>
                  </div>
                ) : (
                  userEvents.map((evt, idx) => {
                    const isSelected = idx === selectedEventIndex;
                    return (
                      <div
                        key={evt.id}
                        onClick={() => {
                          setSelectedEventIndex(idx);
                          setActiveModal(null);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#1C1E24] border-[#E87A72] shadow-md'
                            : 'bg-neutral-900 border-neutral-800/80 hover:border-neutral-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <h4 className="font-display text-white text-base font-black uppercase truncate leading-tight">
                            {evt.title}
                          </h4>
                          <span className="font-sans text-neutral-400 text-xs block mt-0.5">
                            {evt.dateStr}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center space-x-2">
                          <span className="text-[10px] font-display font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {evt.status}
                          </span>
                          {isSelected && <span className="text-[#E87A72] font-black text-sm">✓</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800 flex space-x-2">
                <button
                  onClick={() => {
                    setActiveModal(null);
                    onNavigate?.('/create-event');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display text-xs font-black tracking-wider uppercase transition-all shadow-md active:scale-98"
                >
                  + CREAR NUEVO
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white font-display text-xs font-bold tracking-wider uppercase transition-colors"
                >
                  CERRAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: AJUSTES DE CUENTA Y PERFIL (AVATAR TOP RIGHT)  */}
      {/* ==================================================== */}
      <AnimatePresence>
        {activeModal === 'account' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left flex flex-col max-h-[85vh] overflow-y-auto"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              {/* Header de Cuenta con Avatar y Edición de Nombre */}
              <div className="flex flex-col items-center justify-center pt-2 pb-4 text-center">
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-full p-1 border-2 border-[#E87A72] bg-[#16171B] shadow-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={avatarUrl || user.avatarUrl || './assets/images/foto_perfil.webp'}
                      alt={displayName}
                      className="w-full h-full object-cover rounded-full"
                    />
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center rounded-full">
                        <div className="w-5 h-5 border-2 border-[#E87A72] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Cambiar foto de perfil"
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#16171B] hover:bg-[#22252C] border border-white/20 hover:border-[#E87A72] flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer z-10 text-[#E87A72]"
                  >
                    ✏️
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                {!isEditingName ? (
                  <div className="flex items-center justify-center space-x-2 mt-2.5">
                    <h3 className="font-display text-white text-2xl font-black tracking-tight uppercase leading-none">
                      {displayName}
                    </h3>
                    <button
                      onClick={() => {
                        setEditNameValue(displayName);
                        setIsEditingName(true);
                      }}
                      className="text-neutral-400 hover:text-[#E87A72] text-xs font-bold cursor-pointer"
                    >
                      ✏️
                    </button>
                  </div>
                ) : (
                  <div className="mt-2.5 flex items-center justify-center space-x-1.5 w-full">
                    <input
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      className="flex-1 h-9 px-2.5 rounded-lg bg-[#101114] border border-[#E87A72] text-white font-display text-sm font-black uppercase outline-none"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="h-9 px-3 rounded-lg bg-[#12C061] text-black font-display font-black text-xs uppercase"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="h-9 px-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {isPartner && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#FAB205] text-black font-display font-black text-[10px] uppercase tracking-wider">
                      <span>👑</span>
                      <span>SOCIO +</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Botones de acción del perfil */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <button
                  onClick={() => {
                    setActiveModal('events');
                  }}
                  className="w-full p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between transition-colors text-left"
                >
                  <span className="font-display text-white text-sm font-black uppercase">
                    📅 EVENTOS ASISTIDOS ({attendedPasses.length})
                  </span>
                  <span className="text-neutral-500 font-bold">›</span>
                </button>

                <button
                  onClick={() => setActiveModal('subscription')}
                  className="w-full p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between transition-colors text-left"
                >
                  <span className="font-display text-white text-sm font-black uppercase">
                    💳 MEMBRESÍA SOCIO +
                  </span>
                  <span className="text-neutral-500 font-bold">›</span>
                </button>

                <button
                  onClick={handleShareApp}
                  className="w-full p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between transition-colors text-left"
                >
                  <span className="font-display text-white text-sm font-black uppercase">
                    🔗 COMPARTIR APP
                  </span>
                  <span className="text-neutral-500 font-bold">›</span>
                </button>

                <div className="pt-3 text-center">
                  <button
                    onClick={handleLogout}
                    className="font-display text-xs font-black tracking-widest text-[#EF4444] uppercase hover:underline cursor-pointer"
                  >
                    CERRAR SESIÓN
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: HISTORIAL DE EVENTOS ASISTIDOS                */}
      {/* ==================================================== */}
      <AnimatePresence>
        {activeModal === 'events' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left flex flex-col max-h-[82vh]"
            >
              <button
                onClick={() => setActiveModal('account')}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center space-x-2.5 mb-1">
                <span className="text-xl">📅</span>
                <h3 className="font-display text-white text-xl font-black tracking-wide uppercase">
                  EVENTOS ASISTIDOS
                </h3>
              </div>
              <p className="font-sans text-neutral-400 text-xs mb-3">
                Historial de eventos validados con tu código QR en puerta:
              </p>

              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                {attendedPasses.length === 0 ? (
                  <div className="py-10 px-4 text-center bg-neutral-900/80 border border-neutral-800 rounded-2xl my-2 flex flex-col items-center">
                    <span className="text-3xl block mb-2">🎟️</span>
                    <p className="font-sans text-neutral-400 text-xs sm:text-sm font-bold uppercase tracking-wider leading-relaxed px-3">
                      AÚN NO HAS ASISTIDO A NINGÚN EVENTO CON TU PASE QR
                    </p>
                  </div>
                ) : (
                  attendedPasses.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800/90 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display text-white text-base font-black uppercase leading-tight truncate">
                          {evt.title}
                        </h4>
                        <span className="text-[10px] font-display font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-[#12C061]/15 text-[#12C061] border border-[#12C061]/40 flex-shrink-0">
                          🟢 ASISTIDO
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-sans truncate">
                        📍 {evt.location || evt.hostName}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-neutral-800">
                <button
                  onClick={() => setActiveModal('account')}
                  className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-neutral-400 hover:text-white font-display text-xs font-bold tracking-wider uppercase border border-neutral-800 transition-colors cursor-pointer"
                >
                  VOLVER A CUENTA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: RACHAS                                        */}
      {/* ==================================================== */}
      <AnimatePresence>
        {activeModal === 'streak' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-6 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-3xl mb-3">
                🔥
              </div>

              <h3 className="font-display text-white text-2xl font-black tracking-wide uppercase mb-1">
                TUS RACHAS ACTIVAS
              </h3>

              <p className="font-sans text-neutral-400 text-xs mb-4 leading-relaxed">
                Cantidad de eventos consecutivos asistidos de un mismo anfitrión o club:
              </p>

              <div className="space-y-2.5 mb-5">
                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-display text-white text-base font-black uppercase">MAMACITA VIP</h4>
                    <span className="font-sans text-neutral-400 text-[11px]">Club Nocturno · Underground</span>
                  </div>
                  <span className="font-display text-[#FAB205] text-xs font-black px-2.5 py-1 rounded-full bg-[#FAB205]/10 border border-[#FAB205]/30">
                    🔥 3 eventos seguidos
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 rounded-xl bg-[#F17D02] text-black font-display font-black text-sm tracking-wider uppercase hover:bg-orange-500 transition-colors cursor-pointer"
              >
                ENTENDIDO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: PLUSCOINS Y STORE                             */}
      {/* ==================================================== */}
      <AnimatePresence>
        {activeModal === 'store' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-6 shadow-2xl relative text-left flex flex-col"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="w-14 h-14 rounded-2xl bg-[#FAB205]/15 border border-[#FAB205]/30 flex items-center justify-center text-3xl mb-3">
                ⭐
              </div>

              <h3 className="font-display text-white text-2xl font-black tracking-wide uppercase mb-1">
                PLUSCOINS & RECOMPENSAS
              </h3>

              <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800/80 mb-4">
                <span className="font-display text-[#FAB205] text-3xl font-black tracking-tight block">
                  380 <span className="text-xs text-neutral-400 font-sans tracking-normal">PLUSCOINS DISPONIBLES</span>
                </span>
                <p className="font-sans text-neutral-400 text-xs mt-1">
                  Gana monedas asistiendo temprano, invitando amigos y manteniendo tu racha activa.
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-white font-sans font-bold">🍹 1 Shot de Bienvenida</span>
                  <span className="text-[#FAB205] font-display font-black">150 PC</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-white font-sans font-bold">🎟️ Pase Fast Line en Puerta</span>
                  <span className="text-[#FAB205] font-display font-black">250 PC</span>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 rounded-xl bg-[#FAB205] text-black font-display font-black text-sm tracking-wider uppercase hover:bg-yellow-400 transition-colors cursor-pointer"
              >
                CERRAR
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: MEMBRESÍA SOCIO +                             */}
      {/* ==================================================== */}
      <AnimatePresence>
        {activeModal === 'subscription' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-6 shadow-2xl relative text-left"
            >
              <button
                onClick={() => {
                  setActiveModal(null);
                  setSecretCode('');
                  setSecretCodeError('');
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="w-14 h-14 rounded-2xl bg-[#FAB205]/15 border border-[#FAB205]/30 flex items-center justify-center text-3xl mb-3">
                👑
              </div>

              <h3 className="font-display text-white text-2xl font-black tracking-wide uppercase mb-1">
                MEMBRESÍA SOCIO +
              </h3>

              <p className="font-sans text-neutral-400 text-xs mb-4 leading-relaxed">
                Herramientas profesionales para organizadores, anfitriones y productores de eventos:
              </p>

              <ul className="space-y-2 mb-5 text-xs text-neutral-300 font-sans">
                <li className="flex items-center space-x-2">
                  <span className="text-[#12C061]">✓</span>
                  <span>Dashboard y analíticas en tiempo real en puerta</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-[#12C061]">✓</span>
                  <span>Control de cobro de covers y manillas físicas</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-[#12C061]">✓</span>
                  <span>Pases ilimitados y lista VIP sin comisiones</span>
                </li>
              </ul>

              {/* BLOQUE DE DESBLOQUEO / BYPASS KEY */}
              <form onSubmit={handleActivateProViaCode} className="space-y-3 pt-2 border-t border-[#26282E]">
                <div>
                  <label className="font-sans text-[#8E8E93] text-[11px] font-bold uppercase tracking-wider block mb-1.5 text-center">
                    CÓDIGO DE ACCESO PRO / BETA TESTER
                  </label>
                  <input
                    type="password"
                    value={secretCode}
                    onChange={(e) => {
                      setSecretCode(e.target.value);
                      if (secretCodeError) setSecretCodeError('');
                    }}
                    placeholder="Ingresa código de activación..."
                    className="w-full h-12 px-4 rounded-xl bg-[#16171B] border border-[#26282E] focus:border-[#FAB205] text-white text-center font-display text-base tracking-wider placeholder:text-neutral-600 outline-none transition-colors"
                  />
                  {secretCodeError && (
                    <p className="font-sans text-xs text-[#EF4444] font-bold text-center mt-2">
                      {secretCodeError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isActivatingPro}
                  className="w-full h-12 rounded-xl bg-[#FAB205] hover:bg-yellow-400 active:scale-98 text-black font-display font-black text-sm tracking-wider uppercase transition-all shadow-xl cursor-pointer flex items-center justify-center disabled:opacity-50"
                >
                  {isActivatingPro ? 'ACTIVANDO...' : '[ ACTIVAR MEMBRESÍA SOCIO + ]'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: NOTIFICACIONES (ABIERTO DESDE LA CAMPANA)      */}
      {/* ==================================================== */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={mockNotifications as NotificationItem[]}
        onNavigate={onNavigate}
      />

      {/* ==================================================== */}
      {/* TOAST FLOTANTE                                      */}
      {/* ==================================================== */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#E87A72] text-black font-display font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-2xl z-50 pointer-events-none"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileScreen;
