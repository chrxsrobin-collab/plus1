import React, { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import PassScreen from './screens/PassScreen';
import { mockMamacitaPass } from './data/mockData';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>('/');

  const handleNavigate = (route: string) => {
    console.log(`[+1 Route] -> ${route}`);
    setCurrentRoute(route);
  };

  if (currentRoute === '/passes' || currentRoute.startsWith('/pass')) {
    return (
      <PassScreen
        pass={mockMamacitaPass}
        onBack={() => setCurrentRoute('/')}
        onNavigate={handleNavigate}
      />
    );
  }

  return <HomeScreen onNavigate={handleNavigate} />;
};

export default App;

