import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const Data = () => {
  const [userData, setUserData] = useState('No Data');
  const db = getFirestore();
  const auth = getAuth();

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = doc(db, 'users', user.uid);
      const docSnapshot = await getDoc(userDoc);
      if (docSnapshot.exists()) {
        setUserData(docSnapshot.data());
      }
    }
  };

  const updateUserData = async (newData) => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = doc(db, 'users', user.uid);
      await updateDoc(userDoc, newData);
      setUserData((prevData) => ({ ...prevData, ...newData }));
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userData !== 'No Data') {
        updateUserData(userData);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [userData]);

  return { userData, setUserData };
};

export default Data;
