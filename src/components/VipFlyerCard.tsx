import React from 'react';
import { motion } from 'framer-motion';
import { VipFlyerItem } from '../types/home';

interface VipFlyerCardProps {
  flyer: VipFlyerItem;
  onApplyVipClick: (flyerId: string) => void;
}

export const VipFlyerCard: React.FC<VipFlyerCardProps> = ({
  flyer,
  onApplyVipClick,
}) => {
  return (
    <div className="w-[260px] sm:w-[275px] h-[335px] rounded-2xl p-3 bg-[#101114] border-[1.5px] border-[#fe97de] select-none flex flex-col justify-between shadow-none">
      {/* Ilustración de Arte Retrowave / Pixel Art del Flyer */}
      <div className="relative w-full h-[155px] rounded-xl overflow-hidden bg-[#16181e] mb-2 flex items-center justify-center border border-neutral-800">
        {flyer.theme === 'dubai' && (
          <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#1b003a] via-[#090b1c] to-[#04040a] p-2">
            <div className="w-full h-full border border-purple-500/30 rounded flex flex-col items-center justify-between p-2">
              <div className="px-3 py-1 bg-[#101026] border border-[#00f3ff] rounded-sm">
                <span className="text-[#00f3ff] font-display text-xs tracking-widest font-black uppercase">
                  CLUB DUBÁI
                </span>
              </div>
              <div className="w-11 h-12 border-t-2 border-l-2 border-r-2 border-[#fe97de] bg-[#ff2a85]/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[#fe97de] rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {flyer.theme === 'indie' && (
          <div className="w-full h-full relative flex flex-col items-center justify-end bg-gradient-to-b from-[#0e1726] to-[#05080f] overflow-hidden p-2">
            <div className="absolute inset-0 flex justify-around opacity-40">
              <div className="w-8 h-full bg-gradient-to-b from-cyan-400 via-transparent to-transparent -rotate-12 transform origin-top" />
              <div className="w-8 h-full bg-gradient-to-b from-pink-500 via-transparent to-transparent rotate-6 transform origin-top" />
              <div className="w-8 h-full bg-gradient-to-b from-yellow-400 via-transparent to-transparent rotate-24 transform origin-top" />
            </div>
            <div className="relative z-10 flex items-end justify-center space-x-3 text-2xl mb-1">
              <span title="Guitarrista">🎸</span>
              <span title="Cantante">🎤</span>
              <span title="Bajo">⚡</span>
            </div>
            <div className="w-full h-2 bg-purple-950 rounded-sm" />
          </div>
        )}

        {flyer.theme === 'reggaeton' && (
          <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-[#ff0055] via-[#4a0024] to-[#14000b] overflow-hidden p-2">
            <div className="text-center z-10">
              <span className="text-3xl filter drop-shadow-md">🔥💃</span>
              <p className="font-display text-[#fab205] text-xs font-black tracking-widest uppercase mt-1">
                LATIN PERREO
              </p>
            </div>
          </div>
        )}

        {flyer.theme === 'techno' && (
          <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0a0f] via-[#11131c] to-[#000000] overflow-hidden p-2">
            <div className="w-full h-full border border-neutral-700/60 rounded flex flex-col items-center justify-center relative">
              <div className="w-12 h-12 border border-[#12c061] rounded-full flex items-center justify-center">
                <span className="font-display text-[#12c061] text-xs font-mono font-bold tracking-widest">
                  135 BPM
                </span>
              </div>
              <span className="text-lg mt-1">🔊</span>
            </div>
          </div>
        )}
      </div>

      {/* Info del Flyer */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-display text-white text-base font-bold tracking-tight uppercase line-clamp-1">
            {flyer.typeBadge}: {flyer.title}
          </h4>
          <p className="font-sans text-[#fe97de] text-xs font-medium tracking-normal mt-0.5 line-clamp-1">
            {flyer.subtitle}
          </p>
          {flyer.badgeDetail && (
            <p className="font-sans text-neutral-400 text-xs font-normal mt-0.5">
              {flyer.badgeDetail} •
            </p>
          )}
        </div>

        {/* Botón Píldora: SOLICITAR VIP */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={(e) => {
            e.stopPropagation();
            onApplyVipClick(flyer.id);
          }}
          className="w-full mt-2.5 py-2 px-3 rounded-full bg-white hover:bg-neutral-100 text-black font-display text-xs font-extrabold tracking-wider uppercase flex items-center justify-center transition-colors focus:outline-none"
        >
          SOLICITAR VIP
        </motion.button>
      </div>
    </div>
  );
};

export default VipFlyerCard;
