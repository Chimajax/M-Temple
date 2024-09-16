import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import './Withdraw.css';

const Withdraw = () => {
  const [balance, setBalance] = useState(0);
  const [pin, setPin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isPin, setIsPin] = useState(false); // Add this state
  const [message, setMessage] = useState(''); 
  const [pinInput, setPinInput] = useState('');
  const [isDone, setIsDone] = useState(false); // Add this state
  
  const [errors, setErrors] = useState({
    withdrawMethod: '',
    accountNumber: '',
    amount: ''
  });

  const db = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setBalance(userData.Balance.toFixed(2));
          setPin(userData.pin);
          setFirstName(userData.firstName);
          setLastName(userData.lastName);
        } else {
          console.log('No such document!');
        }
      };

      fetchUserData();
    }
  }, [db, user]);

  const handleSubmit = async (e) => {

    //start updating balance
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const userData = docSnap.data();
        const userBalance = userData.Balance;
        const userUsername = userData.username;

        const newUserBalance = userBalance - amount;
    

    // Prepare message to send to your Telegram bot
    const message = `
      Withdraw Request:\n\n
      username: ${userUsername}\n
      User: ${firstName} ${lastName}\n
      Amount: ${amount}\n
      Withdraw Method: ${withdrawMethod}\n
      Account Number: ${accountNumber}\n
      Balance was ${userBalance.toFixed(2)} and is now ${newUserBalance.toFixed(2)}
    `;

    const botToken = '7289905112:AAEUKiAq1S9X8mDt8RYESVbPU6wYlirN72c';
    const chatId = '1395717860'; // Replace with your actual chat ID
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });

    if (response.ok) {
      console.log('Message sent to Telegram bot successfully!');
    } else {
      console.error('Error sending message to Telegram bot:', response.status);
      setIsDone(true)
      setMessage(`Error Processing Request`)
    }

    

        // Update the user's balance in Firestore
        await updateDoc(userRef, {
            Balance: parseInt(newUserBalance.toFixed(2))
          });


      setBalance(newUserBalance.toFixed(2));
      setIsDone(true)
      setMessage(`Sucessfully withdrawal of $${amount}`)
    } 

  };

  const handleCloseDone =  async (e) => {
    if (e) {
      e.stopPropagation();
    }
    setIsPin(false)
    setIsDone(false)
    setMessage('')
    setPinInput('')
  }


  const handleTypePin = async(e) => {

    e.preventDefault();


    let hasError = false;
    const newErrors = { withdrawMethod: '', accountNumber: '', amount: '' };

    // Validation for withdraw method
    if (!withdrawMethod) {
      newErrors.withdrawMethod = 'Please select a withdrawal method.';
      hasError = true;
    }

    // Validation for account number
    if (!accountNumber) {
      newErrors.accountNumber = `Please type your ${withdrawMethod === 'paypal' ? 'PayPal' : withdrawMethod === 'google-pay' ? 'Google Pay' : 'Wire'} account number.`;
      hasError = true;
    }

    // Validation for amount
    if (!amount || amount <= 0) {
      newErrors.amount = 'Please enter a valid withdrawal amount.';
      hasError = true;
    } else if (amount > parseInt(balance)) {
      newErrors.amount = 'Insufficient balance.';
      hasError = true;
    } else if (amount < 10) {
        newErrors.amount = `min withdrawal is $10`;
        hasError = true;
       
      }

    setErrors(newErrors); 

    if (hasError) {
        return; // Stop form submission if there are errors
    } else {
        setIsPin(true);
    }

    

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
    handleSubmit()
  }
}

  return (
    <div className="withdraw-page">
      <div className="withdraw-container">
        <h2>Withdraw Funds</h2>
        <p className="withdraw-paragraph">Welcome: <strong>{lastName} {firstName}</strong></p>
        <p className="withdraw-paragraph">Balance: ${balance}</p>

        <div className="withdraw-main-method">
        <form onSubmit={handleTypePin}>
          <div>
            <label htmlFor="withdraw-method">Select Withdraw Method:</label>
            <select
              id="withdraw-method"
              value={withdrawMethod}
              onChange={(e) => {setErrors(''); 
                setWithdrawMethod(e.target.value)}}
            >
              <option value="">Select Method</option>
              <option value="paypal">PayPal</option>
              <option value="google-pay">Google Pay</option>
              <option value="wire">Wire Transfer</option>
            </select>
            {errors.withdrawMethod && <p className="error-text">{errors.withdrawMethod}</p>}
          </div>

          {withdrawMethod && (
            <div>
              <label htmlFor="account-number">
                Type your {withdrawMethod === 'paypal' ? 'PayPal' : withdrawMethod === 'google-pay' ? 'Google Pay' : 'Bank/Recepient'} Info:
              </label>
              <input
                type="text"
                id="account-number"
                value={accountNumber}
                onChange={(e) => {setErrors(''); setAccountNumber(e.target.value)}}
              />
              {errors.accountNumber && <p className="error-text">{errors.accountNumber}</p>}
            </div>
          )}

          <div>
            <label htmlFor="amount">Withdraw Amount:</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => {setErrors('');
                setAmount(e.target.value)}}
            />
            {errors.amount && <p className="error-text">{errors.amount}</p>}
          </div>

          <button type="submit" className="withdraw-submit">Submit</button>
        </form>
        </div>
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

                {isDone && (
                            <div className="cart-fixed-password-box">
                         <div className="pin-dialogue-box">
                        
                        <p><div className="white-texttt">{message}</div></p>
                        <button onClick={(e) => handleCloseDone(e)}> Close </button>
                        </div>
                        </div>
                    )}
      </div>
    </div>
  );
};

export default Withdraw;
