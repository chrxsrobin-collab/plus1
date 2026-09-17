import React, { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import PassScreen from './screens/PassScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import ProfileScreen from './screens/ProfileScreen';
import TicketsScreen from './screens/TicketsScreen';
import ScannerScreen from './screens/ScannerScreen';
import EventInviteModal from './components/EventInviteModal';
import { PassItem } from './types/home';
import { mockMamacitaPass, mockEventInvites } from './data/mockData';

export const App: React.FC = () => {
  const [userTickets, setUserTickets] = useState<PassItem[]>([]);
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    // Si la URL actual del navegador contiene /e/ o hash con ruta, podemos iniciar en ella
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/e/')) {
      return window.location.pathname;
    }
    return '/';
  });

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
          onBack={() => setCurrentRoute('/')}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentRoute === '/create-event') {
      return (
        <CreateEventScreen
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
          <HomeScreen onNavigate={handleNavigate} />
          <EventInviteModal
            isOpen={true}
            eventId={eventId}
            onClose={() => setCurrentRoute('/')}
            onNavigate={handleNavigate}
          />
        </div>
      );
    }

    return <HomeScreen onNavigate={handleNavigate} />;
  };

  return (
    <div className="w-full min-h-[100dvh] relative bg-black flex flex-col justify-between overflow-hidden">
      {renderScreen()}
    </div>
  );
};

export default App;

