import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, query, where, collection } from 'firebase/firestore';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import PassScreen from './screens/PassScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import ProfileScreen from './screens/ProfileScreen';
import TicketsScreen from './screens/TicketsScreen';
import ScannerScreen from './screens/ScannerScreen';
import EventManagerScreen from './screens/EventManagerScreen';
import ExploreScreen from './screens/ExploreScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import EventInviteModal from './components/EventInviteModal';
import { PassItem, UserProfile } from './types/home';
import { mockMamacitaPass, mockUserProfile } from './data/mockData';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('plus1_display_name') : null;
    return {
      ...mockUserProfile,
      name: savedName || mockUserProfile.name || 'CHRIS G.',
    };
  });
  const [userTickets, setUserTickets] = useState<PassItem[]>([]);
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    // Si la URL actual del navegador contiene hash (#/e/...) o /e/, iniciamos en ella
    if (typeof window !== 'undefined') {
      if (window.location.hash.startsWith('#/e/')) {
        return window.location.hash.replace('#', '');
      }
      if (window.location.pathname.startsWith('/e/')) {
        return window.location.pathname;
      }
    }
    return '/';
  });

  // Escucha cambios en el hash del navegador para enlaces compartidos deep link (#/e/:eventId)
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.startsWith('#/e/')) {
        setCurrentRoute(window.location.hash.replace('#', ''));
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Escucha del estado de autenticación de Firebase en tiempo real
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);

      if (user) {
        const defaultGuestName = "INVITADO #" + user.uid.slice(-4).toUpperCase();
        const initialName = user.displayName || (user.isAnonymous ? defaultGuestName : 'USUARIO VIP');

        setUserProfile((prev) => ({
          ...prev,
          id: user.uid,
          name: initialName,
          avatarUrl: user.photoURL || prev.avatarUrl,
        }));

        // Sincronizar documento del usuario en Firestore
        const userDocRef = doc(db, 'users', user.uid);
        getDoc(userDocRef).then((snap) => {
          if (!snap.exists()) {
            if (!user.displayName && user.isAnonymous) {
              updateProfile(user, { displayName: defaultGuestName }).catch(console.warn);
            }
            setDoc(userDocRef, { name: initialName, streak: 1, points: 0, onboardingCompleted: false }, { merge: true }).catch(console.warn);
            setIsOnboarding(true);
          } else {
            const data = snap.data();
            if (data?.onboardingCompleted !== true) {
              setIsOnboarding(true);
            } else {
              setIsOnboarding(false);
            }
          }
        }).catch((err) => {
          console.warn('[+1 App] Error verificando usuario:', err);
        });

        const unsubDoc = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data) {
              setUserProfile((prev) => ({
                ...prev,
                ...(data.name ? { name: data.name } : {}),
                ...(data.photoUrl ? { avatarUrl: data.photoUrl } : {}),
                rolePreference: data.rolePreference,
                city: data.city,
                interests: data.interests,
                onboardingCompleted: data.onboardingCompleted,
              }));
              if (data.onboardingCompleted === true) {
                setIsOnboarding(false);
              }
            }
          }
        }, (err) => {
          console.warn('[+1 App] Escucha de usuario:', err);
        });

        // Escucha en tiempo real de los pases del usuario en la colección 'passes' (estrictamente activos)
        const passesQuery = query(
          collection(db, 'passes'),
          where('userId', '==', user.uid),
          where('status', '==', 'active')
        );
        const unsubPasses = onSnapshot(passesQuery, (snapshot) => {
          const ticketsList: PassItem[] = snapshot.docs
            .map((d) => {
              const data = d.data();
              const rawHolderName = (
                data.rawHolderName ||
                data.userName ||
                data.holderName ||
                user.displayName ||
                'INVITADO'
              )
                .replace(/\s*·\s*(\+1(\s*INCLUIDO)?|INDIVIDUAL)$/i, '')
                .trim();
              const allowsPlusOne = Boolean(
                data.allowsPlusOne ??
                  data.withPlusOne ??
                  data.allowPlusOne ??
                  false
              );
              const eventImg =
                data.eventImageUrl ||
                data.imageUrl ||
                data.artImage ||
                data.flyerImage ||
                '';
              const eventName = data.eventTitle || data.title || 'Evento +1';

              return {
                id: d.id,
                eventId: data.eventId,
                eventTitle: eventName,
                eventImageUrl: eventImg,
                title: eventName,
                emoji: '',
                dateStr: data.eventDate || data.dateStr || 'PRÓXIMAMENTE',
                timeStr: data.eventTime || data.timeStr || '22:00',
                location: data.eventLocation || data.location || 'Acceso Oficial +1',
                status: 'active' as const,
                statusText: 'PASE ACTIVO',
                companionsCount: allowsPlusOne ? 1 : 0,
                allowsPlusOne,
                withPlusOne: allowsPlusOne,
                accentBorderColor: '#12C061',
                holderName: rawHolderName,
                listType: 'VIP',
                ticketId: `#${d.id.slice(0, 5).toUpperCase()}`,
                verifiedProvider: 'VERIFICADO CON GOOGLE',
                feedbackMessage: data.feedbackMessage,
                imageUrl: eventImg,
                qrCodeValue: data.qrCodeValue || d.id,
              };
            })
            .filter((p) => p.status === 'active');
          setUserTickets(ticketsList);
        }, (err) => {
          console.warn('[+1 App] Escucha de pases:', err);
        });

        return () => {
          unsubDoc();
          unsubPasses();
        };
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateName = (newName: string) => {
    setUserProfile((prev) => ({ ...prev, name: newName }));
  };

  const handleUpdateAvatar = (newAvatarUrl: string) => {
    setUserProfile((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
    try {
      localStorage.setItem('plus1_avatar_url', newAvatarUrl);
    } catch {
      // ignore
    }
  };

  const handleNavigate = (route: string) => {
    console.log(`[+1 Route] -> ${route}`);
    setCurrentRoute(route);
  };

  const renderScreen = () => {
    if (currentRoute === '/scanner' || currentRoute.startsWith('/scanner?') || currentRoute.startsWith('/scanner/') || currentRoute.startsWith('/app/door')) {
      let eventIdParam: string | undefined;
      if (currentRoute.includes('?')) {
        const queryParams = new URLSearchParams(currentRoute.split('?')[1]);
        eventIdParam = queryParams.get('eventId') || undefined;
      } else if (currentRoute.startsWith('/scanner/')) {
        eventIdParam = currentRoute.replace('/scanner/', '').trim();
      }
      return (
        <ScannerScreen
          eventId={eventIdParam}
          onBack={() => setCurrentRoute('/')}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute === '/profile') {
      return (
        <ProfileScreen
          user={userProfile}
          onUpdateName={handleUpdateName}
          onUpdateAvatar={handleUpdateAvatar}
          onBack={() => setCurrentRoute('/')}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute.startsWith('/manage-event/') || currentRoute.startsWith('/event-manager/')) {
      const eventId = currentRoute.replace('/manage-event/', '').replace('/event-manager/', '').trim();
      return (
        <EventManagerScreen
          eventId={eventId}
          onBack={() => setCurrentRoute('/profile')}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute.startsWith('/create-event')) {
      const queryIndex = currentRoute.indexOf('?');
      let editEventId: string | undefined;
      if (queryIndex !== -1) {
        const params = new URLSearchParams(currentRoute.slice(queryIndex));
        editEventId = params.get('edit') || undefined;
      }
      return (
        <CreateEventScreen
          eventId={editEventId}
          onBack={() => setCurrentRoute('/')}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute === '/explore' || currentRoute === '/search') {
      return (
        <ExploreScreen
          onBack={() => setCurrentRoute('/')}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute === '/tickets' || currentRoute === '/passes') {
      return (
        <TicketsScreen
          tickets={userTickets}
          onBack={() => setCurrentRoute('/')}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute.startsWith('/pass/')) {
      return (
        <PassScreen
          pass={mockMamacitaPass}
          onBack={() => setCurrentRoute('/tickets')}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute.startsWith('/e/')) {
      const eventId = currentRoute.replace('/e/', '').trim() || 'pepe-birthday';
      return (
        <div className="relative w-full min-h-[100dvh]">
          <HomeScreen user={userProfile} onNavigate={handleNavigate} />
          <EventInviteModal
            isOpen={true}
            eventId={eventId}
            onClose={() => {
              if (window.location.hash.startsWith('#/e/')) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }
              setCurrentRoute('/');
            }}
            onNavigate={handleNavigate}
          />
        </div>
      );
    }

    return <HomeScreen user={userProfile} onNavigate={handleNavigate} />;
  };

  if (isAuthChecking) {
    return (
      <div className="w-full min-h-[100dvh] bg-black flex items-center justify-center">
        <span className="font-display text-[#E87A72] text-6xl font-black tracking-tighter animate-pulse">+1</span>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onSuccess={() => setCurrentRoute('/')} />;
  }

  if (isOnboarding) {
    return (
      <OnboardingScreen
        onComplete={() => {
          setIsOnboarding(false);
          setCurrentRoute('/');
        }}
      />
    );
  }

  return (
    <div className="w-full min-h-[100dvh] relative bg-black flex flex-col justify-between overflow-hidden">
      {renderScreen()}
    </div>
  );
};

export default App;

