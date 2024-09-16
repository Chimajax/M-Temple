import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './Pin.css'; // Add your styles in Pin.css
import Header from './Header';

const Pin = () => {
  const [pin, setPin] = useState(null);  // To store the current pin from Firestore
  const [newPin, setNewPin] = useState('');  // To store new pin input
  const [confirmPin, setConfirmPin] = useState('');  // To store confirmed pin
  const [stage, setStage] = useState('');  // Stages: subscribe, input-pin, confirm-pin
  const [error, setError] = useState('');  // To store error message
  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const checkPinStatus = async () => {
      const user = auth.currentUser;

      if (!user) {
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (!userData.pin || userData.pin === false) {
          // If no pin found, show subscription dialog
          setStage('subscribe');
        } else if (userData.pin === true) {
          // If pin is set to true but not a number, allow pin setup
          setStage('set-new-pin');
        } else if (typeof userData.pin === 'number') {
          // If a number pin exists, show "input current pin" dialog
          setStage('input-current-pin');
        }
        setPin(userData.pin);
      }
    };

    checkPinStatus();
  }, [auth, db]);

  const handleSubscribeClick = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { pin: true });
        window.location.href = 'https://www.youtube.com/@chaosmystictemple4210';  // Redirect to the sponsor channel
      }
    } catch (error) {
      setError(`Error subscribing: ${error.message}`);
    }
  };

  const handleSetNewPin = () => {
    setError(''); // Clear error message on new input
    if (newPin.length !== 4 || isNaN(newPin)) {
      setError('Pin must be exactly 4 digits.');
      return;
    }
    setStage('confirm-new-pin');
  };

  const handleConfirmPin = async () => {
    setError(''); // Clear error message on new input
    if (newPin !== confirmPin) {
      setError('Pins do not match. Please try again.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { pin: Number(newPin) });  // Save the new pin as a number
        // alert('Pin successfully updated!');   You can keep this alert for success message
        setNewPin('');
        setConfirmPin('');
        setStage('');
        setError('');  // Clear error message
      }
    } catch (error) {
      setError(`Error setting pin: ${error.message}`);
    }
  };

  const handleInputCurrentPin = (inputPin) => {
    if (inputPin.length === 4) {
      setError(''); // Clear error message on new input
      if (Number(inputPin) === pin) {
        setStage('set-new-pin');
      } else {
        setError('Incorrect current pin. Please try again.');
      }
    }
  };

  return (
    <>
    <Header />
    <div className="pin-container">
      {stage === 'subscribe' && (
        <div className="new-pin-dialogue-box">
          <p>No Pin Found, To Get Started First Subscribe to Our Sponsor Channel</p>
          <button onClick={handleSubscribeClick}>Subscribe First</button>
          {error && <div className="pin-error-message">{error}</div>}
        </div>
      )}

      {stage === 'input-current-pin' && (
        <div className="pin-dialogue-box">
          <p>Input Current Pin</p>
          <input
            type="password"
            maxLength="4"
            onChange={(e) => {
                setError(''); // Clear error message on new input
                handleInputCurrentPin(e.target.value);
              }}
            placeholder="Enter current pin"
          />
          {error && <div className="pin-error-message">{error}</div>}
        </div>
      )}

      {stage === 'set-new-pin' && (
        <div className="pin-dialogue-box">
          <p>Set Your New Pin</p>
          <input
            type="password"
            maxLength="4"
            value={newPin}
            onChange={(e) => {
                setError(''); // Clear error message on new input
                setNewPin(e.target.value);
              }}
            placeholder="Enter new pin"
          />
          <button onClick={handleSetNewPin}>Confirm</button>
          {error && <div className="pin-error-message">{error}</div>}
        </div>
      )}

      {stage === 'confirm-new-pin' && (
        <div className="pin-dialogue-box">
          <p>Confirm Your New Pin</p>
          <input
            type="password"
            maxLength="4"
            value={confirmPin}
            onChange={(e) => {
                setError(''); // Clear error message on new input
                setConfirmPin(e.target.value);
              }}
            placeholder="Re-enter new pin"
          />
          <button onClick={handleConfirmPin}>Set Pin</button>
          {error && <div className="pin-error-message">{error}</div>}
        </div>
      )}

      {pin && typeof pin === 'number' && (
        <div>
          <button onClick={() => setStage('input-current-pin')}>Change Pin</button>
        </div>
      )}
    </div>
    </>
  );
};

export default Pin;