import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className = '',
  style,
  scrollRef: externalScrollRef,
}) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = externalScrollRef || internalRef;

  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const touchStartY = useRef<number>(0);
  const isPulling = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isRefreshing) return;
    const container = containerRef.current;
    const isAtTop = !container || container.scrollTop <= 0;
    const isWindowAtTop = typeof window !== 'undefined' ? window.scrollY <= 0 : true;

    if (isAtTop && isWindowAtTop && e.touches.length === 1) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPulling.current || isRefreshing || e.touches.length !== 1) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    const container = containerRef.current;
    const isAtTop = !container || container.scrollTop <= 0;
    const isWindowAtTop = typeof window !== 'undefined' ? window.scrollY <= 0 : true;

    if (diff > 0 && isAtTop && isWindowAtTop) {
      // Resistencia elástica tipo iOS
      const dampedDistance = Math.min(diff * 0.45, 95);
      setPullDistance(dampedDistance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || isRefreshing) {
      isPulling.current = false;
      return;
    }
    isPulling.current = false;

    if (pullDistance >= 70) {
      setIsRefreshing(true);
      setPullDistance(60);

      // Vibración háptica nativa
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(15);
        } catch {}
      }

      const startTime = Date.now();
      try {
        await Promise.resolve(onRefresh());
      } catch (err) {
        console.error('[PullToRefresh] Error al refrescar:', err);
      }

      // Duración mínima de 400ms y máxima de 800ms para suavidad visual
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 500 - elapsed);
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, remaining);
    } else {
      setPullDistance(0);
    }
  };

  const isTriggered = pullDistance >= 70;
  const progressPercent = Math.min((pullDistance / 70) * 100, 100);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative w-full ${className}`}
      style={style}
    >
      {/* Indicador Pull-to-Refresh flotante */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{
              opacity: 1,
              y: isRefreshing ? 24 : Math.min(pullDistance * 0.6, 52),
              scale: isRefreshing ? 1 : Math.max(0.7, Math.min(1, pullDistance / 50)),
            }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.25 } }}
            className="absolute top-2 inset-x-0 mx-auto w-10 h-10 rounded-full bg-[#16171B] border border-[#26282E] shadow-2xl flex items-center justify-center z-50 pointer-events-none"
          >
            {isRefreshing ? (
              <div className="w-5 h-5 rounded-full border-2 border-[#E87A72] border-t-transparent animate-spin" />
            ) : (
              <div
                className="w-5 h-5 flex items-center justify-center transition-transform duration-150"
                style={{
                  transform: `rotate(${progressPercent * 2.5}deg)`,
                  color: isTriggered ? '#E87A72' : '#FFFFFF',
                }}
              >
                <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido envuelto */}
      {children}
    </div>
  );
};

export default PullToRefresh;
