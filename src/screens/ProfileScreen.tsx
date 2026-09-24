import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserProfile,
  CreatedEventItem,
  NotificationItem,
  BUSINESS_CATEGORIES,
  BusinessCategoryType,
} from '../types/home';
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
} from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { computeEventEndTimestamp } from '../lib/dateUtils';
import { NotificationsModal } from '../components/NotificationsModal';
import { PullToRefresh } from '../components/PullToRefresh';
import '../styles/fonts.css';

export interface ProfileScreenProps {
  userId?: string;
  user?: UserProfile;
  onBack?: () => void;
  onNavigate?: (route: string) => void;
  onUpdateName?: (newName: string) => void;
  onUpdateAvatar?: (newAvatarUrl: string) => void;
}

// Helper universal de compresión de imágenes tipo canvas
const compressImage = (file: File, maxDim: number, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
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
        if (!ctx) return reject(new Error('Canvas context no disponible'));
        ctx.drawImage(img, 0, 0, width, height);
        let base64 = canvas.toDataURL('image/webp', quality);
        if (!base64.startsWith('data:image/webp')) {
          base64 = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
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
  userId,
  user = mockUserProfile,
  onBack,
  onNavigate,
  onUpdateName,
  onUpdateAvatar,
}) => {
  const currentAuthUser = auth.currentUser;
  const targetUserId = userId || currentAuthUser?.uid;
  const isOwner = Boolean(currentAuthUser?.uid && (!userId || userId === currentAuthUser.uid));

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<
    'account' | 'wristbands' | 'event_selector' | 'events' | 'streak' | 'store' | 'subscription' | null
  >(null);

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

  // Estado del perfil del usuario consultado (targetUserId)
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>(() => {
    return (
      (isOwner ? currentAuthUser?.displayName : null) ||
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
      (isOwner ? currentAuthUser?.photoURL : null) ||
      user.avatarUrl ||
      './assets/images/foto_perfil.webp'
    );
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ----------------------------------------------------
  // ESTADOS PÁGINA DE NEGOCIO / CREADOR PRO
  // ----------------------------------------------------
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string>('');
  const [businessCategory, setBusinessCategory] = useState<string>('club');
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [currentUserFollowing, setCurrentUserFollowing] = useState<string[]>([]);
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState<string | null>(null);
  const [showLiveDashboard, setShowLiveDashboard] = useState<boolean>(false);

  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Escucha reactiva del perfil del anfitrión consultado (targetUserId)
  useEffect(() => {
    if (!targetUserId) return;
    const userRef = doc(db, 'users', targetUserId);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setUserProfileData(d);
        if (d.name) {
          setDisplayName(d.name);
          setEditNameValue(d.name);
        }
        if (d.photoUrl) {
          setAvatarUrl(d.photoUrl);
        } else if (isOwner && currentAuthUser?.photoURL) {
          setAvatarUrl(currentAuthUser.photoURL);
        }
        if (d.coverPhotoUrl) setCoverPhotoUrl(d.coverPhotoUrl);
        if (d.businessCategory) setBusinessCategory(d.businessCategory);
        if (Array.isArray(d.galleryPhotos)) setGalleryPhotos(d.galleryPhotos);
        if (typeof d.followersCount === 'number') setFollowersCount(d.followersCount);
      }
    });

    return () => unsubUser();
  }, [targetUserId, isOwner, currentAuthUser]);

  // Escucha reactiva del usuario conectado (para lista de anfitriones que sigue y alertas)
  useEffect(() => {
    if (!currentAuthUser) return;
    const currentRef = doc(db, 'users', currentAuthUser.uid);
    const unsubCurrent = onSnapshot(currentRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (Array.isArray(d.following)) {
          setCurrentUserFollowing(d.following);
        }
      }
    });

    const notifsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentAuthUser.uid),
      where('read', '==', false)
    );
    const unsubNotifs = onSnapshot(
      notifsQuery,
      (snap) => {
        const count = snap.docs.length;
        setUnreadNotifCount(count > 0 ? count : 9);
      },
      () => {}
    );

    return () => {
      unsubCurrent();
      unsubNotifs();
    };
  }, [currentAuthUser]);

  // Escucha reactiva en tiempo real de eventos creados por el anfitrión (targetUserId)
  useEffect(() => {
    if (!targetUserId) {
      setUserEvents([]);
      return;
    }

    const q = query(
      collection(db, 'events'),
      where('hostUserId', '==', targetUserId)
    );

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
  }, [targetUserId]);

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

  // Manejo de subida de foto de portada (Cover Panorámico)
  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner || !currentAuthUser) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona una imagen válida');
      return;
    }

    setIsUploadingCover(true);
    try {
      const compressedBase64 = await compressImage(file, 1200, 0.85);
      setCoverPhotoUrl(compressedBase64);
      showToast('✦ Foto de portada actualizada');

      const userRef = doc(db, 'users', currentAuthUser.uid);
      await setDoc(userRef, { coverPhotoUrl: compressedBase64, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error('Error al subir portada:', err);
      showToast('Error al actualizar portada');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  // Selección de Ramo Comercial
  const handleSelectBusinessCategory = async (catId: BusinessCategoryType) => {
    if (!isOwner || !currentAuthUser) return;
    setBusinessCategory(catId);
    setIsCategoryModalOpen(false);

    const catObj = BUSINESS_CATEGORIES.find((c) => c.id === catId);
    showToast(`Ramo actualizado a ${catObj?.label || catId}`);

    try {
      const userRef = doc(db, 'users', currentAuthUser.uid);
      await setDoc(userRef, { businessCategory: catId, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error('Error al guardar categoría comercial:', err);
    }
  };

  // Subida de foto a la Galería (máximo 6 fotos)
  const handleGalleryPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner || !currentAuthUser) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona una imagen válida');
      return;
    }

    if (galleryPhotos.length >= 6) {
      showToast('Límite de 6 fotos alcanzado');
      return;
    }

    setIsUploadingGallery(true);
    try {
      const compressedBase64 = await compressImage(file, 800, 0.8);
      const updatedGallery = [...galleryPhotos, compressedBase64];
      setGalleryPhotos(updatedGallery);
      showToast('Foto añadida a la galería');

      const userRef = doc(db, 'users', currentAuthUser.uid);
      await setDoc(userRef, { galleryPhotos: updatedGallery, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error('Error al subir foto a la galería:', err);
      showToast('Error al añadir foto');
    } finally {
      setIsUploadingGallery(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  // Eliminar foto de la Galería
  const handleDeleteGalleryPhoto = async (index: number) => {
    if (!isOwner || !currentAuthUser) return;
    const updatedGallery = galleryPhotos.filter((_, i) => i !== index);
    setGalleryPhotos(updatedGallery);
    showToast('Foto eliminada de la galería');

    try {
      const userRef = doc(db, 'users', currentAuthUser.uid);
      await setDoc(userRef, { galleryPhotos: updatedGallery, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error('Error al eliminar foto:', err);
    }
  };

  // Seguimiento dinámico de Anfitrión (Follow / Unfollow)
  const isFollowing = useMemo(() => {
    if (!targetUserId) return false;
    return currentUserFollowing.includes(targetUserId);
  }, [currentUserFollowing, targetUserId]);

  const handleToggleFollow = async () => {
    if (!currentAuthUser) {
      showToast('Inicia sesión para seguir anfitriones');
      return;
    }
    if (!targetUserId || isOwner) return;

    const isCurrentlyFollowing = currentUserFollowing.includes(targetUserId);
    const newFollowing = isCurrentlyFollowing
      ? currentUserFollowing.filter((id) => id !== targetUserId)
      : [...currentUserFollowing, targetUserId];

    const newFollowersCount = Math.max(0, (followersCount || 0) + (isCurrentlyFollowing ? -1 : 1));

    // Actualización reactiva optimista local
    setCurrentUserFollowing(newFollowing);
    setFollowersCount(newFollowersCount);
    showToast(isCurrentlyFollowing ? 'Dejaste de seguir a este anfitrión' : '¡Ahora sigues a este anfitrión! ⚡');

    try {
      // 1. Guardar following en documento del visitante
      await setDoc(
        doc(db, 'users', currentAuthUser.uid),
        { following: newFollowing, updatedAt: Date.now() },
        { merge: true }
      );

      // 2. Guardar contador en documento del anfitrión
      await setDoc(
        doc(db, 'users', targetUserId),
        { followersCount: newFollowersCount, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (err) {
      console.error('Error toggling follow:', err);
      showToast('Error al sincronizar seguimiento');
    }
  };

  const isPartner = Boolean(userProfileData?.isPartner ?? (isOwner ? user?.isPartner : false));

  // Pull-to-Refresh: Sincronización manual en tiempo real desde Firestore
  const handleRefresh = async () => {
    try {
      if (targetUserId) {
        // 1. Re-consultar perfil
        const userRef = doc(db, 'users', targetUserId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const d = snap.data();
          setUserProfileData(d);
          if (d.name) setDisplayName(d.name);
          if (d.photoUrl) setAvatarUrl(d.photoUrl);
          if (d.coverPhotoUrl) setCoverPhotoUrl(d.coverPhotoUrl);
          if (d.businessCategory) setBusinessCategory(d.businessCategory);
          if (Array.isArray(d.galleryPhotos)) setGalleryPhotos(d.galleryPhotos);
          if (typeof d.followersCount === 'number') setFollowersCount(d.followersCount);
        }

        // 2. Re-consultar eventos creados por el anfitrión
        const qEvents = query(
          collection(db, 'events'),
          where('hostUserId', '==', targetUserId)
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
        
        {/* ==================================================== */}
        {/* VISTA A: PÁGINA DE NEGOCIO / CREADOR (isPartner === true) */}
        {/* VISTA B: PERFIL PERSONAL FREE (isPartner === false) */}
        {/* ==================================================== */}
        {isPartner ? (
          <div className="w-full flex flex-col">
            {/* A. COVER PANORÁMICO SUPERIOR */}
            <div className="h-44 sm:h-52 -mx-4 sm:-mx-5 w-[calc(100%+2rem)] sm:w-[calc(100%+2.5rem)] relative bg-[#181A1E] overflow-hidden select-none border-b border-[#26282E]">
              {/* Botón Volver */}
              <button
                onClick={onBack || (() => onNavigate?.('/'))}
                aria-label="Regresar"
                className="absolute top-3 left-3 z-30 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:text-[#E87A72] transition-colors cursor-pointer active:scale-95 shadow-lg"
              >
                ‹
              </button>

              {/* Botón Notificaciones si es dueño */}
              {isOwner && (
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  aria-label="Notificaciones"
                  className="absolute top-3 right-14 z-30 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:text-[#E87A72] transition-colors cursor-pointer active:scale-95 shadow-lg"
                >
                  <span className="text-sm">🔔</span>
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-[#EF4444] text-white font-display text-[9px] font-black rounded-full flex items-center justify-center border border-black leading-none">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>
              )}

              {/* Icono Flotante para Cambiar Portada (Solo Dueño) */}
              {isOwner && (
                <button
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={isUploadingCover}
                  aria-label="Cambiar foto de portada"
                  className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white hover:text-[#E87A72] transition-colors cursor-pointer shadow-lg active:scale-95 flex items-center justify-center"
                  title="Cambiar foto de portada"
                >
                  {isUploadingCover ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#E87A72] border-t-transparent animate-spin" />
                  ) : (
                    <span className="text-sm">📷</span>
                  )}
                </button>
              )}

              {/* Imagen de Portada o Placeholder Brutalista */}
              {coverPhotoUrl ? (
                <img
                  src={coverPhotoUrl}
                  alt="Portada del negocio"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#181A1E] flex flex-col items-center justify-center text-center p-4 relative">
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage: "url('./assets/images/fondo_iniciob.webp')",
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <span className="text-3xl mb-1 filter drop-shadow opacity-50">🎪</span>
                  <span className="font-display text-xs text-neutral-400 font-bold uppercase tracking-widest">
                    PORTADA DE ANFITRIÓN +1
                  </span>
                </div>
              )}

              {/* Degradado inferior de sombra sutil */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* Input oculto para subir portada */}
              {isOwner && (
                <input
                  type="file"
                  ref={coverFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverPhotoChange}
                />
              )}
            </div>

            {/* B. AVATAR SUPERPUESTO Y NOMBRE */}
            <div className="flex flex-col items-center text-center relative z-20">
              <div className="-mt-14 sm:-mt-16 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#0B0C0E] bg-[#16171B] overflow-hidden z-10 shadow-xl relative group">
                <img
                  src={avatarUrl || user?.avatarUrl || './assets/images/foto_perfil.webp'}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />

                {isOwner && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Cambiar foto de perfil"
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-base cursor-pointer"
                  >
                    📷
                  </button>
                )}
              </div>

              {isOwner && (
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              )}

              {/* Nombre del perfil en Antonio Bold */}
              <div className="flex items-center justify-center space-x-2 mt-2">
                <h2 className="font-display text-2xl sm:text-3xl text-white uppercase text-center tracking-wide leading-tight">
                  {displayName}
                </h2>
                {isOwner && (
                  <button
                    onClick={() => {
                      setEditNameValue(displayName);
                      setIsEditingName(true);
                    }}
                    aria-label="Editar nombre"
                    className="w-6 h-6 rounded-full bg-[#16171B] hover:bg-neutral-800 border border-[#26282E] flex items-center justify-center text-[#9CA3AF] hover:text-[#E87A72] transition-colors active:scale-90 focus:outline-none cursor-pointer"
                  >
                    <svg className="w-3 h-3 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Badge Socio Oficial */}
              <div className="mt-1 flex items-center justify-center">
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FAB205]/20 to-[#E87A72]/20 border border-[#FAB205]/40 text-[#FAB205] font-display text-[10px] font-black tracking-wider uppercase">
                  ✦ SOCIO OFICIAL +
                </span>
              </div>

              {/* C. SELECTOR / BADGE DE RAMO COMERCIAL */}
              <div className="mt-1.5 flex items-center justify-center">
                {isOwner ? (
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="px-3.5 py-1 bg-[#26282E] hover:bg-[#32353D] text-zinc-300 hover:text-white font-sans text-xs uppercase tracking-wider rounded-full inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-neutral-700/60 shadow-sm"
                    title="Presiona para cambiar tu ramo comercial"
                  >
                    <span>{BUSINESS_CATEGORIES.find((c) => c.id === businessCategory)?.icon || '🪩'}</span>
                    <span>{BUSINESS_CATEGORIES.find((c) => c.id === businessCategory)?.label || 'Club'}</span>
                    <span className="text-[10px] text-zinc-400">▾</span>
                  </button>
                ) : (
                  <div className="px-3 py-1 bg-[#26282E] text-zinc-300 font-sans text-xs uppercase tracking-wider rounded-full inline-flex items-center gap-1.5 border border-neutral-700/60">
                    <span>{BUSINESS_CATEGORIES.find((c) => c.id === businessCategory)?.icon || '🪩'}</span>
                    <span>{BUSINESS_CATEGORIES.find((c) => c.id === businessCategory)?.label || 'Club'}</span>
                  </div>
                )}
              </div>

              {/* Contador de seguidores */}
              <div className="mt-1.5 text-center">
                <span className="font-display text-xs sm:text-sm font-black text-[#9CA3AF] tracking-widest uppercase">
                  👥 {followersCount} SEGUIDORES
                </span>
              </div>

              {/* D. BOTÓN DE ACCIÓN DINÁMICO (COLOR SALMÓN #E87A72) */}
              <div className="w-full max-w-xs mx-auto mt-4 px-2">
                {isOwner ? (
                  <button
                    onClick={() => setShowLiveDashboard((prev) => !prev)}
                    className="w-full h-12 rounded-2xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    <span>📊</span>
                    <span>{showLiveDashboard ? 'OCULTAR DASHBOARD' : 'MIS EVENTOS CREADOS'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleToggleFollow}
                    className={`w-full h-12 rounded-2xl font-display font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer ${
                      isFollowing
                        ? 'bg-[#26282E] hover:bg-neutral-800 text-white border border-neutral-700'
                        : 'bg-[#E87A72] hover:bg-[#d66f67] text-black'
                    }`}
                  >
                    <span>{isFollowing ? '✓' : '+'}</span>
                    <span>{isFollowing ? 'SIGUIENDO ✓' : 'SEGUIR'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* E. GALERÍA DE FOTOS DEL ANFITRIÓN (HASTA 6 FOTOS) */}
            <div className="w-full mt-6 px-1">
              <div className="text-left mb-2 px-1">
                <h3 className="font-display text-white text-lg sm:text-xl font-black tracking-wider uppercase">
                  GALERÍA DE EVENTOS
                </h3>
                <p className="font-sans text-[#8E8E93] text-xs">
                  Muestra cómo se viven tus noches
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 mb-6 w-full">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const photo = galleryPhotos[idx];
                  if (photo) {
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedLightboxPhoto(photo)}
                        className="aspect-square rounded-xl bg-[#16171B] border border-[#26282E] overflow-hidden relative group cursor-pointer shadow-md"
                      >
                        <img
                          src={photo}
                          alt={`Galería ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {isOwner && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGalleryPhoto(idx);
                            }}
                            aria-label="Eliminar foto"
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 border border-white/20 text-white hover:text-red-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-lg"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (isOwner) {
                    return (
                      <div
                        key={idx}
                        onClick={() => galleryFileInputRef.current?.click()}
                        className="aspect-square rounded-xl bg-[#16171B]/60 hover:bg-[#16171B] border border-dashed border-[#26282E] hover:border-[#E87A72]/60 flex flex-col items-center justify-center text-zinc-500 hover:text-[#E87A72] cursor-pointer transition-colors active:scale-95 shadow-sm"
                      >
                        <span className="text-2xl font-bold leading-none">+</span>
                        <span className="text-[10px] font-sans font-semibold mt-1 uppercase">Añadir</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="aspect-square rounded-xl bg-[#16171B]/30 border border-[#26282E]/40 flex items-center justify-center text-neutral-700"
                    >
                      <span className="text-sm">📸</span>
                    </div>
                  );
                })}
              </div>

              {isOwner && (
                <input
                  type="file"
                  ref={galleryFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleGalleryPhotoUpload}
                />
              )}
            </div>

            {/* EVENTOS PÚBLICOS DEL ANFITRIÓN */}
            <div className="w-full mt-2 mb-6 px-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-display text-white text-lg font-black tracking-wider uppercase">
                  EVENTOS ({userEvents.length})
                </h3>
                {isOwner && (
                  <button
                    onClick={() => onNavigate?.('/create-event')}
                    className="text-[#E87A72] hover:underline font-display text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    + NUEVO EVENTO
                  </button>
                )}
              </div>

              {userEvents.length > 0 ? (
                <div className="space-y-2.5">
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
                            {evt.dateStr} · 👥 {evt.guestsCount || 0} CONFIRMADOS
                          </span>
                        </div>
                      </div>
                      {isOwner ? (
                        <button
                          onClick={() => onNavigate?.(`/create-event?edit=${evt.id}`)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#26282E] hover:bg-neutral-800 text-white hover:text-[#E87A72] font-display text-xs font-bold tracking-wider uppercase transition-colors shrink-0 cursor-pointer border border-neutral-700/60"
                        >
                          EDITAR
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate?.(`/vip/${evt.id}`)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display text-xs font-black tracking-wider uppercase transition-transform active:scale-95 shrink-0 cursor-pointer shadow-md"
                        >
                          VER PASE
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#16171B]/50 border border-dashed border-[#26282E] text-center text-xs text-neutral-400">
                  No hay eventos programados en este momento.
                </div>
              )}
            </div>

            {/* DASHBOARD ANALÍTICO EN VIVO (SOLO DUEÑO Y SI SHOWLIVEDASHBOARD) */}
            {isOwner && showLiveDashboard && (
              <div id="liveAnalyticsDashboard" className="w-full mt-4 mb-6">
                {/* --- TOP SELECTOR DE EVENTO --- */}
                <div className="w-full flex items-center justify-between px-2 mb-3">
                  <button onClick={handlePrevEvent} className="text-zinc-400 hover:text-white p-1 text-xl font-bold cursor-pointer">‹</button>
                  <div className="flex items-center space-x-2 truncate px-2">
                    <h2
                      onClick={() => setActiveModal('event_selector')}
                      className="font-display text-xl text-white tracking-wider uppercase cursor-pointer hover:text-[#E87A72] transition-colors truncate text-center"
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

                {/* --- CARD 1: ASISTENCIA (DIALES RADIALES Y GRÁFICA) --- */}
                <div className="w-full bg-[#16171B] border border-[#26282E] rounded-2xl p-4 mb-4">
                  <div className="border-b border-[#26282E] pb-2 mb-4 text-center">
                    <span className="font-display text-lg text-white tracking-wider">ASISTENCIA EN VIVO</span>
                  </div>

                  {/* 3 Diales / Medidores Circulares */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-6">
                    {/* Dial Naranja - Invitaciones */}
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

                    {/* Dial Verde - Ingresos */}
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

                    {/* Dial Celeste - Cortesías */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path className="text-[#26282E]" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="text-[#00A3FF]" strokeDasharray="60, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <span className="absolute font-display text-xl text-white">{liveCortesiasCount || 100}</span>
                      </div>
                      <span className="font-sans text-[10px] tracking-wider text-zinc-400 mt-1 uppercase">CORTESÍAS</span>
                      <span className="font-sans text-[10px] text-[#00A3FF] font-bold">+100%</span>
                    </div>
                  </div>

                  {/* Gráfica de Barras por Horas (Peak Hours) */}
                  <div className="w-full border-t border-[#26282E] pt-4">
                    <div className="h-28 flex items-end justify-between px-2 gap-2 border-b border-[#26282E] pb-1">
                      <div className="w-6 bg-zinc-800 h-2 rounded-t-sm" />
                      <div className="w-6 bg-zinc-800 h-3 rounded-t-sm" />
                      <div className="w-6 bg-zinc-800 h-2 rounded-t-sm" />
                      <div className="w-6 bg-zinc-800 h-4 rounded-t-sm" />
                      <div className="w-6 bg-[#22C55E]/40 border border-[#22C55E] h-14 rounded-t-sm" />
                      <div className="w-6 bg-[#22C55E] h-24 rounded-t-sm" />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-sans mt-2 px-1">
                      <span>12 AM</span>
                      <span>4 AM</span>
                      <span>8 AM</span>
                      <span>12 PM</span>
                      <span>4 PM</span>
                      <span>8 PM</span>
                    </div>
                  </div>
                </div>

                {/* --- CARD 2: COVERS GENERAL (VENTA EN PUERTA) --- */}
                <div className="w-full bg-[#16171B] border border-[#26282E] rounded-2xl p-4 mb-6">
                  <div className="border-b border-[#26282E] pb-2 mb-3 text-center flex items-center justify-between">
                    <div className="w-6" />
                    <span className="font-display text-sm text-zinc-300 tracking-wider">COVERS GENERAL</span>
                    <button
                      onClick={openWristbandsModal}
                      title="Configurar manillas"
                      className="text-zinc-400 hover:text-white p-1 text-xs cursor-pointer"
                    >
                      ⚙️
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#8B24C7] flex items-center justify-center text-white text-xs font-bold">
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
              </div>
            )}
          </div>
        ) : (
          /* ==================================================== */
          /* VISTA B: PERFIL PERSONAL FREE (isPartner === false)    */
          /* ==================================================== */
          <div className="w-full flex flex-col">
            {/* 1. TOP BAR (+1 LOGO A LA IZQUIERDA · CAMPANA DERECHA) */}
            <header className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-2.5 w-full relative z-30">
              <button
                onClick={onBack || (() => onNavigate?.('/'))}
                aria-label="Regresar al inicio"
                className="flex items-center space-x-1 focus:outline-none cursor-pointer group transition-transform active:scale-95"
              >
                <span className="font-display text-[#E87A72] text-[32px] sm:text-[34px] font-black tracking-tighter leading-none group-hover:brightness-110">
                  +1
                </span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  aria-label="Notificaciones"
                  className="relative w-9 h-9 rounded-full bg-neutral-900/90 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-all active:scale-90 focus:outline-none cursor-pointer"
                >
                  <span className="text-base">🔔</span>
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#EF4444] text-white font-display text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black shadow-md leading-none">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>
              </div>
            </header>

            {/* 2. AVATAR Y DATOS DE PERFIL */}
            <div className="flex flex-col items-center text-center mt-2">
              <div className="relative group">
                <div
                  onClick={() => isOwner && fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full p-[2px] border-2 border-[#E87A72] bg-[#16171B] shadow-xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
                >
                  <img
                    src={avatarUrl || user?.avatarUrl || './assets/images/foto_perfil.webp'}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                {isOwner && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Cambiar foto de perfil"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#E87A72] border-2 border-black flex items-center justify-center text-black shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  >
                    <span className="text-xs">📷</span>
                  </button>
                )}
                {isOwner && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
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
            </div>

            {/* BLOQUE COMPACTO DE EVENTOS PARA USUARIOS FREE */}
            <div className="w-full mt-4">
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
                          className="px-3.5 py-1.5 rounded-xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display text-xs font-black tracking-wider uppercase transition-transform active:scale-95 shrink-0 cursor-pointer shadow-md"
                        >
                          VER
                        </button>
                      )}
                    </div>
                  ))}

                  {userEvents.length > 3 && (
                    <button
                      onClick={() => setActiveModal('events')}
                      className="w-full py-2.5 rounded-xl bg-[#16171B] hover:bg-neutral-800 border border-[#26282E] text-zinc-400 hover:text-white font-display text-xs font-bold tracking-wider uppercase transition-colors text-center cursor-pointer"
                    >
                      MIS EVENTOS CREADOS ({userEvents.length}) ›
                    </button>
                  )}
                </div>
              ) : isOwner ? (
                <div className="w-full p-4 rounded-2xl bg-[#16171B]/50 border border-dashed border-[#26282E] flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-xl mb-1.5">🎉</span>
                  <p className="font-sans text-xs sm:text-sm text-neutral-300 font-medium tracking-wide uppercase mb-3 max-w-[260px]">
                    ¿ORGANIZAS UNA PREVIA O FIESTA? CREA TU PRIMER EVENTO
                  </p>
                  <button
                    onClick={() => onNavigate?.('/create-event')}
                    className="py-2.5 px-4 rounded-xl bg-[#E87A72] hover:bg-[#d66f67] text-black font-display font-black text-xs tracking-wider uppercase transition-transform active:scale-95 shadow-md cursor-pointer"
                  >
                    [ + CREAR EVENTO ]
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 3. FILA HORIZONTAL DE LAS 3 TARJETAS DE MÉTRICAS     */}
        {/* (Solo para el dueño de la cuenta)                    */}
        {/* ==================================================== */}
        {isOwner && (
          <div className="grid grid-cols-3 gap-2.5 w-full mt-4">
            {/* Tarjeta 1: EVENTOS */}
            <div
              onClick={() => setActiveModal('events')}
              className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#E87A72]/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg active:scale-95"
            >
              <div className="text-xl mb-1">📅</div>
              <span className="font-display text-white text-3xl sm:text-[34px] font-black tracking-tight leading-none my-1">
                {attendedPasses.length > 0 ? attendedPasses.length : 10}
              </span>
              <span className="font-display text-neutral-400 text-[11px] font-bold tracking-wider uppercase">
                EVENTOS
              </span>
            </div>

            {/* Tarjeta 2: RACHA */}
            <div
              onClick={() => setActiveModal('streak')}
              className="p-3.5 rounded-2xl bg-[#16171B] border border-[#26282E] hover:border-[#FAB205]/60 flex flex-col items-center justify-between text-center cursor-pointer transition-colors shadow-lg active:scale-95"
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

            {/* Tarjeta 3: PLUSCOINS */}
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
        )}

        {/* ==================================================== */}
        {/* 5. SECCIÓN CUENTA (Solo para el dueño de la cuenta)  */}
        {/* ==================================================== */}
        {isOwner && (
          <div className="w-full mt-4 mb-6">
            <h3 className="font-display text-white text-lg font-black tracking-wider uppercase mb-3 px-1 text-left">
              CUENTA
            </h3>

            <div className="space-y-2.5">
              {/* Botón Suscripción */}
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
                      {isPartner ? 'GESTIONAR SUSCRIPCIÓN SOCIO +' : 'HAZTE SOCIO + POR $US 4.99/MES'}
                    </span>
                    <span className="font-sans text-neutral-400 text-xs block">
                      Diseñado para promotores, clubes y organizadores
                    </span>
                  </div>
                </div>
                <span className="text-neutral-500 font-bold text-lg">›</span>
              </div>

              {/* Botón Compartir App */}
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
                      COMPARTIR APP
                    </span>
                    <span className="font-sans text-neutral-400 text-xs block">
                      Invita a tus amigos y gana 50 Pluscoins
                    </span>
                  </div>
                </div>
                <span className="text-neutral-500 font-bold text-lg">›</span>
              </div>
            </div>

            {/* 6. PIE DE PANTALLA: CERRAR SESIÓN */}
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

      </PullToRefresh>

      {/* ==================================================== */}
      {/* MODAL: CONFIGURACIÓN DE COVERS Y MANILLAS EN PUERTA */}
      {/* ==================================================== */}
      <AnimatePresence>
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

        {/* ==================================================== */}
        {/* MODAL: SELECTOR DE RAMO COMERCIAL (BUSINESS CATEGORY)*/}
        {/* ==================================================== */}
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[28px] bg-[#16171B] border border-[#26282E] p-5 shadow-2xl relative text-left flex flex-col"
            >
              <button
                onClick={() => setIsCategoryModalOpen(false)}
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
                Selecciona la categoría que mejor representa a tu espacio o proyecto:
              </p>

              <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {BUSINESS_CATEGORIES.map((cat) => {
                  const isSelected = businessCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleSelectBusinessCategory(cat.id)}
                      className={`p-3 rounded-2xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#E87A72]/20 border-[#E87A72] text-white shadow-md'
                          : 'bg-neutral-900/80 hover:bg-neutral-800 border-[#26282E] text-zinc-300'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="font-display text-xs font-bold uppercase tracking-wider truncate">
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
        {/* MODAL: LIGHTBOX DE FOTO DE GALERÍA                   */}
        {/* ==================================================== */}
        {selectedLightboxPhoto && (
          <div
            onClick={() => setSelectedLightboxPhoto(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full max-h-[85vh] rounded-2xl overflow-hidden bg-[#16171B] border border-[#26282E] shadow-2xl flex flex-col"
            >
              <button
                onClick={() => setSelectedLightboxPhoto(null)}
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
              >
                ✕
              </button>
              <img
                src={selectedLightboxPhoto}
                alt="Vista previa de galería"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
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
