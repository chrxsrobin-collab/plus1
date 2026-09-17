import React, { useState, useEffect } from 'react';
import HomeScreen from './screens/HomeScreen';
import PassScreen from './screens/PassScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import ProfileScreen from './screens/ProfileScreen';
import TicketsScreen from './screens/TicketsScreen';
import ScannerScreen from './screens/ScannerScreen';
import AuthScreen from './screens/AuthScreen';
import EventInviteModal from './components/EventInviteModal';
import { PassItem, UserProfile } from './types/home';
import { mockMamacitaPass, mockUserProfile } from './data/mockData';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser);
  const [currentUserName, setCurrentUserName] = useState<string>('CHRIS G.');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [userTickets, setUserTickets] = useState<PassItem[]>([]);
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    // Si la URL actual del navegador contiene /e/ o hash con ruta, podemos iniciar en ella
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/e/')) {
      return window.location.pathname;
    }
    return '/';
  });

  // Listener reactivo global de Firebase Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists() && snap.data().name) {
            setCurrentUserName(snap.data().name);
          } else {
            const initialName = user.displayName || (user.isAnonymous ? 'INVITADO +1' : 'USUARIO +1');
            setCurrentUserName(initialName);
            await setDoc(
              userDocRef,
              {
                name: initialName,
                displayName: initialName,
                email: user.email || null,
                isAnonymous: user.isAnonymous,
                updatedAt: Date.now(),
              },
              { merge: true }
            );
          }
        } catch (e) {
          console.warn('Error al consultar perfil de usuario:', e);
          if (user.displayName) {
            setCurrentUserName(user.displayName);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleNavigate = (route: string) => {
    console.log(`[+1 Route] -> ${route}`);
    setCurrentRoute(route);
  };

  // Pantalla de carga mientras se verifica el token persistido
  if (isAuthLoading) {
    return (
      <div className="w-full min-h-[100dvh] bg-black flex flex-col items-center justify-center text-white select-none">
        <h1 className="font-display text-[#E87A72] text-7xl font-black tracking-tighter animate-pulse">
          +1
        </h1>
        <p className="font-sans text-[#8E8E93] text-xs font-bold tracking-widest uppercase mt-3">
          CONECTANDO...
        </p>
      </div>
    );
  }

  // Si no hay sesión activa, renderizar la pantalla completa de login (AuthScreen)
  if (!currentUser) {
    return (
      <AuthScreen
        onSuccess={() => {
          setCurrentRoute('/');
        }}
      />
    );
  }

  const activeUserProfile: UserProfile = {
    ...mockUserProfile,
    name: currentUserName,
    avatarUrl: currentUser.photoURL || mockUserProfile.avatarUrl,
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
          user={activeUserProfile}
          userName={currentUserName}
          onUpdateUserName={(newName) => setCurrentUserName(newName)}
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
          <HomeScreen onNavigate={handleNavigate} user={activeUserProfile} />
          <EventInviteModal
            isOpen={true}
            eventId={eventId}
            onClose={() => setCurrentRoute('/')}
            onNavigate={handleNavigate}
          />
        </div>
      );
    }

    return <HomeScreen onNavigate={handleNavigate} user={activeUserProfile} />;
  };

  return (
    <div className="w-full min-h-[100dvh] relative bg-black flex flex-col justify-between overflow-hidden">
      {renderScreen()}
    </div>
  );
};

export default App;

