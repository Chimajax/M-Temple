// src/hooks/useRemainingTime.js

import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const useRemainingTime = (initialRemainingTime) => {
  const [remainingTime, setRemainingTime] = useState(initialRemainingTime);
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    // If there is no time remaining, exit early
    if (remainingTime <= 0) return;

    const intervalId = setInterval(() => {
      setRemainingTime(prevTime => {
        // Calculate the new remaining time
        const newRemainingTime = prevTime - 1;

        // Handle plan expiration
        if (newRemainingTime <= 0) {
          clearInterval(intervalId);

          // Update Firestore to reset plan to FREE
          const user = auth.currentUser;
          if (user) {
            updateDoc(doc(db, 'users', user.uid), {
              plan: 'FREE',
              remainingTime: 0,
            }).catch(error => {
              console.error("Error updating plan expiration:", error);
            });
          }

          return 0;
        }

        // Update Firestore with the new remaining time
        const user = auth.currentUser;
        if (user) {
          updateDoc(doc(db, 'users', user.uid), {
            remainingTime: newRemainingTime,
          }).catch(error => {
            console.error("Error updating remaining time:", error);
          });
        }

        return newRemainingTime;
      });
    }, 1000); // Update every second

    // Cleanup function to clear the interval on unmount or when remainingTime changes
    return () => clearInterval(intervalId);
  }, [remainingTime, auth, db]);

  return [remainingTime, setRemainingTime];
};

export default useRemainingTime;
