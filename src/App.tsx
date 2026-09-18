import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import PassScreen from './screens/PassScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import ProfileScreen from './screens/ProfileScreen';
import TicketsScreen from './screens/TicketsScreen';
import ScannerScreen from './screens/ScannerScreen';
import EventInviteModal from './components/EventInviteModal';
import { PassItem, UserProfile } from './types/home';
import { mockMamacitaPass, mockUserProfile } from './data/mockData';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('plus1_display_name') : null;
    return {
      ...mockUserProfile,
      name: savedName || mockUserProfile.name || 'CHRIS G.',
    };
  });
  const [userTickets, setUserTickets] = useState<PassItem[]>([]);
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    // Si la URL actual del navegador contiene /e/ o hash con ruta, podemos iniciar en ella
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/e/')) {
      return window.location.pathname;
    }
    return '/';
  });

  // Escucha del estado de autenticación de Firebase en tiempo real
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);

      if (user) {
        const savedName =
          (typeof window !== 'undefined' ? localStorage.getItem('plus1_display_name') : null) ||
          user.displayName ||
          (user.isAnonymous ? 'INVITADO +1' : 'CHRIS G.');

        setUserProfile((prev) => ({
          ...prev,
          id: user.uid,
          name: savedName,
          avatarUrl: user.photoURL || prev.avatarUrl,
        }));

        // Sincronizar documento del usuario en Firestore si existe
        const userDocRef = doc(db, 'users', user.uid);
        const unsubDoc = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.name) {
              setUserProfile((prev) => ({ ...prev, name: data.name }));
              if (typeof window !== 'undefined') {
                localStorage.setItem('plus1_display_name', data.name);
              }
            }
          }
        }, (err) => {
          console.warn('[+1 App] Escucha de usuario:', err);
        });

        return () => unsubDoc();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateName = (newName: string) => {
    setUserProfile((prev) => ({ ...prev, name: newName }));
  };

  const handleNavigate = (route: string) => {
    console.log(`[+1 Route] -> ${route}`);
    setCurrentRoute(route);
  };

  const renderScreen = () => {
    if (currentRoute === '/scanner') {
      return (
        <ScannerScreen
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
          onBack={() => setCurrentRoute('/')}
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
            onClose={() => setCurrentRoute('/')}
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

  return (
    <div className="w-full min-h-[100dvh] relative bg-black flex flex-col justify-between overflow-hidden">
      {renderScreen()}
    </div>
  );
};

export default App;

