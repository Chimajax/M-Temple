import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, updateDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import loginIcon from '../assets/icons/login-icon.png';
import penIcon from '../assets/icons/pen-icon.png';
import './EditProfile.css';
import Header from '../components/Header';  // Assuming you have a Header component
// import Footer from '../components/Footer';  // Assuming you have a Footer component

const EditProfile = () => {
  const [username, setUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [bio, setBio] = useState('');
  const [newBio, setNewBio] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePic, setProfilePic] = useState(loginIcon);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async (user) => {
      if (user) {
       // console.log("User is signed in:", user.email); // Debugging line
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.username || '');
            setBio(userData.bio || '');
            setFirstName(userData.firstName || '');
            setLastName(userData.lastName || '');
            if (userData.profilepic) {
              setProfilePic(userData.profilepic);
            } else {
              // Update the path to use 'profilepic'
              const profilePicRef = ref(storage, `${user.email}/profilepic`);
              try {
                const profilePicUrl = await getDownloadURL(profilePicRef);
                setProfilePic(profilePicUrl);
              } catch (error) {
                console.error("Error fetching profile picture URL:", error);
                setProfilePic(loginIcon);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        console.log("No user is signed in.");
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user);
      } else {
        console.log("No user is signed in.");
      }
    });

    return () => unsubscribe();
  }, [auth, db, storage]);

  const handleProfilePicClick = () => {
    setShowDialog(true);
  };

  const handleProfilePicUpload = async (event) => {
    const file = event.target.files[0];
    const user = auth.currentUser;

    if (file && user) {
      try {
        console.log("Uploading file:", file.name); // Debugging line
        const profilePicRef = ref(storage, `${user.email}/profilepic`);
        await uploadBytes(profilePicRef, file);
        const profilePicUrl = await getDownloadURL(profilePicRef);

          // Get the current user document
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();

        // Update the user document with the new profile picture URL
          await updateDoc(doc(db, 'users', user.uid), { 
            profilepic: profilePicUrl, // Update the profilepic field with the new URL
            profilepicValue: (userData.profilepicValue || 0) + 1 // Increment the profilepicValue field
          });

        setProfilePic(profilePicUrl);
      } catch (error) {
        console.error("Error updating profile picture:", error);
      }
    }
  };

  const handleUsernameChange = async () => {
    const user = auth.currentUser;
    const usernameInput = newUsername.trim(); // rename the local variable
  
    if (usernameInput.length <= 4 || !usernameInput.startsWith('@') || !/[a-zA-Z]/.test(usernameInput) || usernameInput.length >= 12) {
      setError('Username not supported, include an "@" at the beginning');
      return;
    }
  
    try {
      // Check if the new username already exists in the "users" collection
      const usernameExists = await checkUsernameUniqueness(usernameInput);
      if (usernameExists) {
        setError('Username already exists');
        return;
      }
  
      await updateDoc(doc(db, 'users', user.uid), { username: usernameInput });
      setUsername(usernameInput);
      setIsEditingUsername(false);
      setError('');
        } catch (error) {
      console.error("Error updating username:", error);
    }
  };

  const checkUsernameUniqueness = async (newUsername) => {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const usernames = querySnapshot.docs.map((doc) => doc.data().username);
  
    return usernames.includes(newUsername);};

  const handleBioChange = async () => {
    const user = auth.currentUser;

    if (newBio.length > 100) {
      setError('Bio cannot be more than 100 characters');
    } else if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { bio: newBio });
        setBio(newBio);
        setIsEditingBio(false);
        setError('');
      } catch (error) {
        console.error("Error updating bio:", error);
      }
    }
  };

  const toggleUsernameEdit = () => {
    setIsEditingUsername(!isEditingUsername);
    setError(''); // Clear error when starting edit
  };

  const toggleBioEdit = () => {
    setIsEditingBio(!isEditingBio);
    setError(''); // Clear error when starting edit
  };

  const handleSaveClick = () => {
   // window.location.href = '/profile';
   // Navigate to the /support page
   navigate('/profile');
  };

  return (
    <>
      <Header />
      <div className="small-height"></div>
      <div className="edit-profile-container">
        <div className="profile-pic-box">
          <div className="profile-pic-container" onClick={handleProfilePicClick}>
            <img src={profilePic} alt="Profile" className="profile-pic" />
            <label htmlFor="profile-pic-upload" className="pen-icon">
              <img src={penIcon} alt="Edit" className="pen-icon" />
            </label>
            <input
              type="file"
              accept="image/*"
              id="profile-pic-upload"
              style={{ display: 'none' }}
              onChange={handleProfilePicUpload}
            />
          </div>
        </div>

        <div className="username-container">
          <p>Username: {username}</p>
          <img
            src={penIcon}
            alt="Edit"
            className="pen-icon"
            onClick={toggleUsernameEdit}
          />
        </div>

        {isEditingUsername && (
          <div className="edit-username-container">
            <input
              type="text"
              placeholder="New username"
              value={newUsername}
              onChange={(e) => {
                setNewUsername(e.target.value);
                setError(''); // Clear error on new input
              }}
            />
            <div>
              <input
                type="checkbox"
                id="checkbox"
                checked={isCheckboxChecked}
                onChange={(e) => setIsCheckboxChecked(e.target.checked)}
              />
              <label htmlFor="checkbox">I understand this</label>
            </div>
            <button
              onClick={handleUsernameChange}
              disabled={!isCheckboxChecked}
              style={{
                padding: '10px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: isCheckboxChecked ? '#1a73e8' : '#ccc',
                color: 'white',
                fontSize: '16px',
                cursor: isCheckboxChecked ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.3s',
              }}
            >
              OK
            </button>
            {error && <p className="error-message">{error}</p>}
          </div>
        )}

        <div className="bio-container">
          <p>Bio: {bio}</p>
          <img
            src={penIcon}
            alt="Edit"
            className="pen-icon"
            onClick={toggleBioEdit}
          />
        </div>

        {isEditingBio && (
          <div className="edit-bio-container">
            <textarea
              placeholder="Write your bio (Max 100 characters)"
              value={newBio}
              onChange={(e) => {
                setNewBio(e.target.value);
                setError(''); // Clear error on new input
              }}
              maxLength={100}
            />
            <button
              onClick={handleBioChange}
              className="save-button"
            >
              Save Bio
            </button>
            {error && <p className="error-message">{error}</p>}
          </div>
        )}

        <p>Your Name: {firstName} {lastName}</p>

        <button
          onClick={handleSaveClick}
          className="save-button"
          style={{
            backgroundColor: username ? '#1a73e8' : '#ccc',
            cursor: username ? 'pointer' : 'not-allowed',
          }}
          disabled={!username} // Disable button if username is empty
         >
          SAVE
        </button> 

        {showDialog && (
          <div className="dialog-box">
            <div className="dialog-content">
              <img src={profilePic} alt="Profile" className="profile-pic-large" />
              <button onClick={() => setShowDialog(false)} className="close-button">CLOSE</button>
            </div>
          </div>
        )}
      </div>
      <div className="small-height"></div>
      {/*<Footer />*/}
    </>
  );
};

export default EditProfile;
