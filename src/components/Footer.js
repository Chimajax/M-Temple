import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import './Footer.css';

// Import the logo images
import homeIcon from '../assets/icons/home-icon.png';
import contactIcon from '../assets/icons/hambuger-icon.png';
import createIcon from '../assets/icons/create-icon.png';
import bellIcon from '../assets/icons/bell-icon.png';
import loginIcon from '../assets/icons/login-icon.png';

const Footer = () => {
  const [profilePic, setProfilePic] = useState(loginIcon);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [showCreateBox, setShowCreateBox] = useState(false); // State for toggling the create box

  const auth = getAuth();
  const storage = getStorage();

  useEffect(() => {
    const fetchProfilePic = async (user) => {
      if (user) {
        setIsSignedIn(true);
        try {
          const profilePicRef = ref(storage, `${user.email}/profilepic`);
          const url = await getDownloadURL(profilePicRef);
          setProfilePic(url);
        } catch (error) {
          console.error('Error fetching profile picture:', error);
          setProfilePic(loginIcon); // Fallback in case of error
        }
      } else {
        setIsSignedIn(false);
        setProfilePic(loginIcon);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      fetchProfilePic(user);
    });

    return () => {
      unsubscribe();
    };
  }, [auth, storage]);

  const handleCreateClick = () => {
    setShowCreateBox(!showCreateBox); // Toggle the visibility of the create box
  };

  const handleCloseCreateBox = () => {
    setShowCreateBox(false); // Set the state to false to close the create box
  };

  return (
    <>
      <footer className="footer">
        <Link to="/">
          <img src={homeIcon} alt="Home" className="footer-icon" />
        </Link>
        <a href="#contact">
          <img src={contactIcon} alt="Contact" className="footer-icon" />
        </a>
        <a href="#create" onClick={handleCreateClick}>
          <img src={createIcon} alt="Create" className="footer-icon" />
        </a>
        <Link to="/notification">
          <img src={bellIcon} alt="Bell" className="footer-icon" />
        </Link>
        <Link to={isSignedIn ? "/profile" : "/signin"}>
          <div className="profile-pic-container">
            <img src={profilePic} alt={isSignedIn ? "Profile" : "Login"} />
          </div>
        </Link>
      </footer>

      {/* Dialog box that appears when the create icon is clicked */}
      {showCreateBox && (
        <div className="create-box">
          <Link to="/quote" className="create-box-link" onClick={handleCloseCreateBox} >QUOTE</Link>
          <Link to="/image" className="create-box-link" onClick={handleCloseCreateBox} >IMAGE</Link>
          <Link to="/video" className="create-box-link" onClick={handleCloseCreateBox} >VIDEO</Link>
          <Link to="/ebook" className="create-box-link" onClick={handleCloseCreateBox} >EBOOK</Link>
        </div>
      )}
    </>
  );
};

export default Footer;
