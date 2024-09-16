import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, updateDoc, collection, onSnapshot } from 'firebase/firestore'; // Import Firestore functions
import './Header.css';

import loginIcon from '../assets/icons/login-icon.png';
import settingsIcon from '../assets/icons/settings-icon.png'; 
import cancelIcon from '../assets/icons/cancel-icon.png'; 

const Header = () => {  
  const [intervalId, setIntervalId] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false); 
  const [cartNumber, setCartNumber] = useState(0); // Cart item count
  const location = useLocation();
  const navigate = useNavigate(); // Initialize the useNavigate hook

  const [showCreateBoxH, setShowCreateBoxH] = useState(false); // State for toggling the create box

  const auth = getAuth();
  const storage = getStorage();
  const firestore = getFirestore(); // Initialize Firestore

  // Fetch the profile picture
  useEffect(() => {
    let interval;

    const fetchProfilePic = async (user) => {
      if (user) {
        setIsSignedIn(true);
        try {
          const profilePicRef = ref(storage, `${user.email}/profilepic`);
          try {
            const url = await getDownloadURL(profilePicRef);
            setProfilePic(url);
          } catch (error) {
            console.error('Error fetching profile picture:', error);
            setProfilePic(loginIcon);
          }
        } catch (error) {
          console.error('Error creating profile picture reference:', error);
          setProfilePic(loginIcon);
        }
      } else {
        setIsSignedIn(false);
        setProfilePic(null);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      fetchProfilePic(user);
      const interval = setInterval(() => fetchProfilePic(user), 1000);
      setIntervalId(interval);

      // If user is signed in, listen to their cart items
      if (user) {
        const cartRef = doc(firestore, 'carts', user.uid); // Reference to user's cart
        const unsubscribeCart = onSnapshot(cartRef, (doc) => {
          if (doc.exists()) {
            const cartData = doc.data();
            const cartItems = cartData.cart || []; // Assuming 'items' is an array in the cart document
            setCartNumber(cartItems.length); // Set cart number to the length of the items array
          } else {
            setCartNumber(0); // If no cart document, set cart number to 0
          }
        });

        return () => {
          clearInterval(interval);
          unsubscribeCart(); // Unsubscribe from cart listener when component unmounts
        };
      }
    });

    return () => {
      clearInterval(intervalId);
      unsubscribe();
    };
  }, [auth, storage, firestore]);

  const handleSettingsClick = () => {
    setShowSettings(!showSettings);
  };

  const handleCancelClick = () => {
    setShowSettings(false);
  };

  const handleLogout = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(firestore, 'users', user.uid); // Get the user's Firestore document reference
      try {
        await updateDoc(userDocRef, { signedIn: false }); // Update the signedIn field to false
        setTimeout(() => {
          auth.signOut().then(() => {
            setTimeout(() => {
              navigate('/signin'); // Reload the page 1 second after signing out
            }, 1000);
          });
        }, 500);
        clearInterval(intervalId); // Clear the interval here
      } catch (error) {
        console.error('Error updating signedIn status:', error);
      }
    }
  }; 

  const handleCreateClickH = () => {
    setShowCreateBoxH(!showCreateBoxH); // Toggle the visibility of the create box
  };

  const handleSupport = async () => {
    const user = auth.currentUser;
    
    const botToken = '7289905112:AAEUKiAq1S9X8mDt8RYESVbPU6wYlirN72c';
    const chatId = '1395717860';
    if (user) {
      const userName = user.username || user.email; // Get the user's name or email
      const message = `${userName} opened Support`; // Create the message to send to the Telegram bot
  
      // Send the message to the Telegram bot using the Telegram API
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
      }
  
      // Navigate to the /support page
      navigate('/support');
    }
  };

  const handleCart = () => {
    if (location.pathname !== '/cartpage') {
      navigate('/cartpage');
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      <header className="header">
        <div className="cart-direct" onClick={handleCart}>{cartNumber}</div>
        <div className="header-logo">M-Temple</div>

        {/* Navigation Links */}
        <nav className="header-nav">
          <Link to="/">Home</Link>
          <Link to="/notification">News</Link>
          <a href="#create" onClick={handleCreateClickH}>
            Create
          </a>
          <a href="#more">More</a>
          {isSignedIn ? (
            <Link to="/profile">
              <div className="profile-pic-contain">
                <img src={profilePic} alt="Profile" className="profile-picc" />
              </div>
            </Link>
          ) : (
            <Link to="/signin">
              <a href="#login" className="login-button">Login</a>
            </Link>
          )}
        </nav>

        {/* Settings Icon */}
        {location.pathname === '/profile' && (
          <img
            src={settingsIcon}
            alt="Settings"
            className="settings-icon"
            onClick={handleSettingsClick}
          />
        )}

        {showSettings && (
          <div className="settings-dialog">
            <img
              src={cancelIcon}
              alt="Cancel"
              className="cancel-icon"
              onClick={handleCancelClick}
            />
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/bookmark">Bookmarks</Link></li>
              <li><Link to="/pin">Pin</Link></li>
              <li><a href="#">Deposit</a></li>
              <li><Link to="/withdraw">Withdraw</Link></li>
              <li><Link to="/about">About</Link></li>
              <li onClick={handleSupport}>Chat Support</li>
              <li>
                <button className="logout-button" onClick={handleLogout}>
                  Log Out
                </button>
              </li>
            </ul>
          </div>
        )}
      </header>

      {/* Dialog box that appears when the create icon is clicked */}
      {showCreateBoxH && (
        <div className="create-box-h">
          <Link to="/quote" className="create-box-link-h">QUOTE</Link>
          <Link to="/image" className="create-box-link-h">IMAGE</Link>
          <Link to="/video" className="create-box-link-h">VIDEO</Link>
          <Link to="/ebook" className="create-box-link-h">EBOOK</Link>
        </div>
      )}
    </>
  );
};

export default Header;
