import React, { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import PassScreen from './screens/PassScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import ProfileScreen from './screens/ProfileScreen';
import TicketsScreen from './screens/TicketsScreen';
import { mockMamacitaPass, mockWalletTickets } from './data/mockData';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>('/');

  const handleNavigate = (route: string) => {
    console.log(`[+1 Route] -> ${route}`);
    setCurrentRoute(route);
  };

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
        tickets={mockWalletTickets}
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

  return <HomeScreen onNavigate={handleNavigate} />;
};

export default App;

