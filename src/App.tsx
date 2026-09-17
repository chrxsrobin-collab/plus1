import React from 'react';
import HomeScreen from './screens/HomeScreen';

export const App: React.FC = () => {
  const handleNavigate = (route: string) => {
    console.log(`[+1 Route] -> ${route}`);
  };

  return <HomeScreen onNavigate={handleNavigate} />;
};

export default App;
