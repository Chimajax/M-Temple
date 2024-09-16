import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import './Plan.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';

const Plan = ({ remainingTime, setRemainingTime }) => {
  const [balance, setBalance] = useState(0);
  const [plan, setPlan] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState(null); // Add this state
  const [isPin, setIsPin] = useState(false); // Add this state
  const [message, setMessage] = useState(''); 
  const [pinInput, setPinInput] = useState('');

  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setBalance(userData.Balance || 0);
            setPlan(userData.plan);
            setRemainingTime(userData.remainingTime);
            setPin(userData.pin);


            if (plan === 'FREE') {
              setRemainingTime(0);

              const user = auth.currentUser;
        await updateDoc(doc(db, 'users', user.uid), {
          remainingTime: 0,
        });
        console.log('time updated')


            }
          } else {
            alert('No user document found');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          alert(`Error fetching user data: ${error.message}`);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user);
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [auth, db, plan, setRemainingTime]);

  const handlePlanClick = (planName, price) => {

    if (plan === planName) {
      return; // do nothing if the plan is already active
    }

    setSelectedPlan(planName);
    setPlanPrice(price);
    setDialogMessage('per month, are you sure?');
    setShowDialog(true);
  };

  const handleDialogYesClick = async () => {
    if (balance >= planPrice) {
      const newBalance = balance - planPrice;
      const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

      try {
        const user = auth.currentUser;
        await updateDoc(doc(db, 'users', user.uid), {
          Balance: parseInt(newBalance),
          plan: selectedPlan,
          remainingTime: thirtyDaysInSeconds,
        });

        setShowDialog(true);

        setBalance(newBalance);
        setPlan(selectedPlan);
        setRemainingTime(thirtyDaysInSeconds);

        setDialogMessage(`Plan Updated: ${selectedPlan}, New Balance: $${newBalance}`);
      } catch (error) {
        setShowDialog(true);
        console.error("Error updating plan:", error);
        setDialogMessage(`Error updating plan: ${error.message}`);
      }
    } else {
      setShowDialog(true);
      setDialogMessage('Not Enough Money');
      setPlanPrice(0);
    }
  };

  const handleDialogNoClick = () => {
    setShowDialog(false);
  };

  const handleDialogCloseClick = () => {
    setShowDialog(false);
  };

  const handleCloseDone =  async (e) => {
    if (e) {
      e.stopPropagation();
    }
    setIsPin(false)
    setMessage('')
    setPinInput('')
  }


  const handleStartDone =  async () => {
    setShowDialog(false); // turns to false
    

    setTimeout(() => {
      setIsPin(true);
    }, 300);
 }




  const handleConfirm = async() => {


    if (!pin) {
      setMessage(`You don't have a pin, Go to settings`);
       return null;
    }
  
    const pinInput = document.querySelector('input[type="password"]').value;
  
    
    if (!pinInput || String(pinInput) !== String(pin)) {
      setMessage('Incorrect Pin, try again')
      setPinInput('')
      return null;
    } else {
      console.log('correct pin')
      handleCloseDone()
      handleDialogYesClick()
      
    }
  }

  return (
    <>
      <Header />
      {loading ? (
        <div className="loading-page">
          <div className="loading-circlee"></div>
        </div>
      ) : (
        <div className="plan-page">
          <div className="plan-info-container">
            <div className="info-box" onClick={() => navigate('/profile')}>Plan: {plan}</div>
            <div className="info-box">Balance: $ {balance}</div>
            {plan !== 'FREE' && remainingTime > 0 && (
              <div className="info-box">Time Remaining: {Math.floor(remainingTime / 86400)}d {Math.floor((remainingTime % 86400) / 3600)}h {Math.floor((remainingTime % 3600) / 60)}m {Math.floor(remainingTime % 60)}s</div>
            )}
          </div>
          <div className="plans-container">
            <div className="plan-box">
              <div className="plan-name">FREE</div>
              <ol>
                <li>ads</li>
                <li>Max-Withdraw: $50</li>
              </ol>
              <button className="plan-price" onClick={() => handlePlanClick('FREE', 0)}>
                {plan === 'FREE' ? 'ACTIVE' : 'Price: $0'}
              </button>
            </div>
            <div className="plan-box">
              <div className="plan-name">PRO</div>
              <ol>
                <li>mini ads</li>
                <li>Max-Withdraw: $500</li>
              </ol>
              <button className="plan-price" onClick={() => handlePlanClick('PRO', 4.99)}>
                {plan === 'PRO' ? 'ACTIVE' : 'Price: $4.99'}
              </button>
            </div>
            <div className="plan-box">
              <div className="plan-name">PRO+</div>
              <ol>
                <li>no ads</li>
                <li>Max-Withdraw: No limit</li>
              </ol>
              <button className="plan-price" onClick={() => handlePlanClick('PRO+', 10.99)}>
                {plan === 'PRO+' ? 'ACTIVE' : 'Price: $10.99'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDialog && (
        <div className="change-plan-box">
          <div className="plan-name">
            <p>{dialogMessage}</p>
            {dialogMessage === 'per month, are you sure?' ? (
              <>
                <button className="plan-price" onClick={handleStartDone}>Yes</button>
                <button className="plan-price" onClick={handleDialogNoClick}>No</button>
              </>
            ) : (
              <button className="plan-price" onClick={handleDialogCloseClick}>OK</button>
            )}
          </div>
        </div>
      )}

      


                      {isPin  && ( 
                            <div className="cart-fixed-password-box"> {/*gotten from cart page*/}
                        <div className="pin-dialogue-box">
                        <p>Confirm Pin to Proceed</p>
                        <input
                            type="password"
                            maxLength="4"
                            value={pinInput}
                            placeholder="Your Pin"
                            onChange={(e) => {
                                setMessage('');
                                setPinInput(e.target.value);}}

                        />
                        <p style={{color: 'red'}}>{message}</p>
                        <button onClick={(e) => handleConfirm()}> Done </button>
                        <button onClick={(e) => handleCloseDone(e)}> Back </button>
                        </div>
                        </div>
                    )}
      <Footer />
    </>
  );
};

export default Plan;
