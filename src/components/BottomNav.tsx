import React from 'react';
import { motion } from 'framer-motion';
import { TabType } from '../types/home';

export interface BottomNavProps {
  activeTab: TabType;
  onTabSelect: (tab: TabType) => void;
  visible?: boolean;
  variant?: 'floating' | 'fixed';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabSelect,
  visible = true,
  variant = 'fixed',
}) => {
  if (variant === 'fixed') {
    return (
      <motion.nav
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full bg-black/95 backdrop-blur-md border-t border-neutral-800/90 px-8 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between z-50 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.8)]"
      >
        {/* 1. Home (Casa) */}
        <button
          onClick={() => onTabSelect('home')}
          aria-label="Inicio"
          className="p-2 flex flex-col items-center justify-center transition-transform hover:scale-110 focus:outline-none"
        >
          <svg
            className={"w-6 h-6 " + (activeTab === 'home' ? "text-white stroke-2" : "text-neutral-500")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={activeTab === 'home' ? 2.5 : 2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </button>

        {/* 2. Mis QRs / Pases (Ticket / Billetera) */}
        <button
          onClick={() => onTabSelect('passes')}
          aria-label="Mis Pases y QRs"
          className="p-2 flex flex-col items-center justify-center transition-transform hover:scale-110 focus:outline-none"
        >
          <svg
            className={"w-6 h-6 rotate-45 " + (activeTab === 'passes' ? "text-white" : "text-neutral-400")}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M15.5 1h-7A2.5 2.5 0 0 0 6 3.5v17A2.5 2.5 0 0 0 8.5 23h7a2.5 2.5 0 0 0 2.5-2.5v-17A2.5 2.5 0 0 0 15.5 1zm1 19.5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V17h1a1.5 1.5 0 0 0 0-3H7.5V10h1a1.5 1.5 0 0 0 0-3H7.5V3.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1V7h-1a1.5 1.5 0 0 0 0 3h1v4h-1a1.5 1.5 0 0 0 0 3h1v3.5z" />
          </svg>
        </button>

        {/* 3. Buscar (Lupa) */}
        <button
          onClick={() => onTabSelect('search')}
          aria-label="Buscar eventos"
          className="p-2 flex flex-col items-center justify-center transition-transform hover:scale-110 focus:outline-none"
        >
          <svg
            className={"w-6 h-6 " + (activeTab === 'search' ? "text-white" : "text-neutral-400")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </motion.nav>
    );
  }

  // Floating Dynamic Capsule (Auto-Hiding)
  return (
    <motion.nav
      initial={false}
      animate={
        visible
          ? {
              y: 0,
              x: '-50%',
              opacity: 1,
              pointerEvents: 'auto' as const,
            }
          : {
              y: 100,
              x: '-50%',
              opacity: 0,
              pointerEvents: 'none' as const,
            }
      }
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        mass: 0.8,
      }}
      onClick={(e) => e.stopPropagation()}
      className="fixed bottom-4 left-1/2 z-50 max-w-[260px] w-[90%] mx-auto py-2.5 px-6 rounded-full bg-[#121316]/85 backdrop-blur-lg border border-[#26282E] shadow-2xl flex items-center justify-around select-none"
    >
      {/* 1. Home (Casa) */}
      <button
        onClick={() => onTabSelect('home')}
        aria-label="Inicio"
        className="p-1 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none"
      >
        <svg
          className={"w-5 h-5 transition-colors " + (activeTab === 'home' ? "text-white stroke-2" : "text-neutral-500 hover:text-neutral-300")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={activeTab === 'home' ? 2.5 : 2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      </button>

      {/* 2. Mis QRs / Pases (Ticket / Billetera) */}
      <button
        onClick={() => onTabSelect('passes')}
        aria-label="Mis Pases y QRs"
        className="p-1 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none"
      >
        <svg
          className={"w-5 h-5 rotate-45 transition-colors " + (activeTab === 'passes' ? "text-white" : "text-neutral-500 hover:text-neutral-300")}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M15.5 1h-7A2.5 2.5 0 0 0 6 3.5v17A2.5 2.5 0 0 0 8.5 23h7a2.5 2.5 0 0 0 2.5-2.5v-17A2.5 2.5 0 0 0 15.5 1zm1 19.5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V17h1a1.5 1.5 0 0 0 0-3H7.5V10h1a1.5 1.5 0 0 0 0-3H7.5V3.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1V7h-1a1.5 1.5 0 0 0 0 3h1v4h-1a1.5 1.5 0 0 0 0 3h1v3.5z" />
        </svg>
      </button>

      {/* 3. Buscar (Lupa) */}
      <button
        onClick={() => onTabSelect('search')}
        aria-label="Buscar eventos"
        className="p-1 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none"
      >
        <svg
          className={"w-5 h-5 transition-colors " + (activeTab === 'search' ? "text-white" : "text-neutral-500 hover:text-neutral-300")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    </motion.nav>
  );
};

export default BottomNav;

