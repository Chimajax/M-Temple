import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import './Profile.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';
import loginIcon from '../assets/icons/login-icon.png';

const Profile = () => {
  const [username, setUsername] = useState('');
  const [followers, setFollowers] = useState('');
  const [followings, setFollowings] = useState('');
  const [bio, setBio] = useState('');
  const [balance, setBalance] = useState(0);
  const [plan, setPlan] = useState('');
  const [profilePic, setProfilePic] = useState(loginIcon);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true); // Add a loading state
  const [quotes, setQuotes] = useState('');
  const [images, setImages] = useState('');
  const [videos, setVideos] = useState('');
  const [ebooks, setEbooks] = useState('');

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const navigate = useNavigate();

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}m`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    } else {
      return num.toString();
    }
  };

  useEffect(() => {
    const fetchUserData = async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.username || '');
            setBio(userData.bio || '');
            setBalance(formatNumber(userData.Balance.toFixed(3)));
            setPlan(userData.plan || '');
            setFollowers(formatNumber(userData.followers || 0));
            setFollowings(formatNumber(userData.followings || 0));
            setQuotes(formatNumber(userData.quotes || 'empty'));
            setImages(formatNumber(userData.images || 'empty'));
            setVideos(formatNumber(userData.videos || 'empty'));
            setEbooks(formatNumber(userData.ebooks || 'empty'));

            const profilePicRef = ref(storage, `${user.email}/profilepic`);
            const profilePicUrl = await getDownloadURL(profilePicRef);
            setProfilePic(profilePicUrl);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false); // Set loading to false after data is fetched
        }
      } else {
        setLoading(false); // Set loading to false if no user is found
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user);
      } else {
        setLoading(false); // Set loading to false if user is not logged in
      }
    });

    return () => unsubscribe();
  }, [auth, db, storage]);
  

  const handleProfilePicClick = () => {
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
  };

  const handleEditClick = () => {
    navigate('/editprofile');
  };

  return (
    <>
      <Header />
      {loading ? (
        <div className="loading-page">
        <div className="loading-circlee"></div>
      </div>
      ) : (
        <div className="profile-container">
          <div className="profile-info-container">
            <div className="profile-head-box">
            <div className="profile-pic-container" onClick={handleProfilePicClick}>
              <img src={profilePic} alt="Profile" className="profile-pic" />
            </div>
            <div className="info-container">
              <div className="info-box">Username: {username}</div>
              <div className="info-box">Balance: $ {balance}</div>
              <div className="info-box" onClick={() => navigate('/plan')}>Plan: {plan}</div>
                  </div>
                </div>
            </div>
            <div className="p-follow-container">
              <div className="p-follow-box">Followers: {followers}</div>
              <div className="p-follow-box">Followings: {followings}</div>
            </div>
            


          <button className="edit-button" onClick={handleEditClick}>EDIT</button>
          <p className="bio-text">Bio: {bio}</p>
          <div className="p-post-container">
           <div className="p-post">
            <div className="pp-post">
            <div>M-Temple Ad Posts will go here</div>
             </div>
            </div>
          <div className="p-post" onClick={() => navigate('/myquotes')}>Quotes: {quotes}</div>
          <div className="p-post" onClick={() => navigate('/myimages')}>Images: {images}</div>
          <div className="p-post" onClick={() => navigate('/myvideos')}>Videos: {videos}</div>
          <div className="p-post" onClick={() => navigate('/myebooks')}>Ebooks: {ebooks}</div>
          </div>
        </div>
      )}
      {showDialog && (
        <div className="dialog-box">
          <div className="dialog-content">
            <img src={profilePic} alt="Profile" className="profile-pic-large" />
            <button className="close-button" onClick={handleCloseDialog}>CLOSE</button>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
};

export default Profile;
