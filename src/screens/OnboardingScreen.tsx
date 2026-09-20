import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import OnboardingStep1 from './OnboardingStep1';
import OnboardingStep2 from './OnboardingStep2';

export interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<'attendee' | 'host' | 'both'>('attendee');
  const [selectedCity, setSelectedCity] = useState<string>('La Paz, BO');
  const [isAdult, setIsAdult] = useState<boolean>(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleToggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]
    );
  };

  const handleSavePreferences = async (interestsToSave: string[], roleToSave: 'attendee' | 'host' | 'both', cityToSave: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const payload = {
          rolePreference: roleToSave,
          city: cityToSave,
          isAdult: true,
          interests: interestsToSave,
          onboardingCompleted: true,
          updatedAt: Date.now(),
        };

        try {
          await updateDoc(userDocRef, payload);
        } catch {
          // Fallback en caso de que el documento aún no esté inicializado
          await setDoc(userDocRef, payload, { merge: true });
        }
      }

      try {
        localStorage.setItem('plus1_onboarding_completed', 'true');
        localStorage.setItem('plus1_user_city', cityToSave);
      } catch {
        // ignore
      }

      onComplete();
    } catch (err) {
      console.error('Error guardando preferencias de onboarding:', err);
      // Permitir continuar incluso si hay error de red
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    handleSavePreferences(selectedInterests, selectedRole, selectedCity);
  };

  const handleSkip = () => {
    const defaultInterests =
      selectedInterests.length > 0
        ? selectedInterests
        : ['Reggaetón', 'Boliches & Clubs', 'Previas & Juntadas'];
    handleSavePreferences(defaultInterests, selectedRole, selectedCity);
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="onboarding-step-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full h-full"
          >
            <OnboardingStep1
              selectedRole={selectedRole}
              onSelectRole={setSelectedRole}
              selectedCity={selectedCity}
              onSelectCity={setSelectedCity}
              isAdult={isAdult}
              onToggleAdult={setIsAdult}
              onNext={() => setStep(2)}
              onSkip={handleSkip}
            />
          </motion.div>
        ) : (
          <motion.div
            key="onboarding-step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full h-full"
          >
            <OnboardingStep2
              selectedInterests={selectedInterests}
              onToggleInterest={handleToggleInterest}
              onBack={() => setStep(1)}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingScreen;
