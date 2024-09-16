import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import './ViewProfile.css'; // Optional CSS file for styling
import Header from './Header';
import Footer from './Footer';
import loginIcon from '../assets/icons/login-icon.png';

const ViewProfile = () => {
  const [userData, setUserData] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false); // Add this state
  const [isGifting, setIsGifting] = useState(false); // Add this state
  const [giftingAmount, setGiftingAmount] = useState('');
  const [giftAmount, setGiftAmount] = useState(null); // Add this state
  const [pinInput, setPinInput] = useState('');
  const [isPin, setIsPin] = useState(false); // Add this state
  const [isDone, setIsDone] = useState(false); // Add this state
  const [buttonText, setButtonText] = useState('Loading'); 
  const [message, setMessage] = useState(''); 
  const [isUnfollowing, setIsUnfollowing] = useState(false); // Add this state
  const location = useLocation();
  const navigate = useNavigate();
  const db = getFirestore();

  // Fetch the owner profile based on the ownerId passed via navigate
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (location.state && location.state.ownerId) {
        try {
          const userDocRef = doc(db, 'users', location.state.ownerId);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserData(userData);
  
            // Check if current user is already following the profile user
            const auth = getAuth();
            const currentUser = auth.currentUser;
            const currentUserDocRef = doc(db, 'users', currentUser.uid);
          const currentUserDocSnap = await getDoc(currentUserDocRef);
          const currentUserData = currentUserDocSnap.data();
          setCurrentUserData(currentUserData)

            if (currentUser) {
              const followersBy = userData.followersBy || [];
              const isAlreadyFollowing = followersBy.includes(currentUser.uid);
              setIsFollowing(isAlreadyFollowing);
            }

            if (currentUser !== null) {
                const followersBy1 = currentUserData.followersBy;
                if (!followersBy1){ console.log('nothing found')}
                const followBack = followersBy1.includes(location.state.ownerId);
               if (followBack) {
                setButtonText('Follow Back')
                console.log('This person follows you')
               } else {
                setButtonText('Follow')
                console.log('This person does not follow you')
               }
              }

             // Check if userData ID matches current user's ID
             if (location.state.ownerId === currentUser.uid) {
                navigate('/profile'); // Navigate to /profile if IDs match
                console.log('Owner Profile')
              }

              // Get the authId or uid from the userData object
         // const profileUserId = userData.authId || userData.uid || auth.userData;
        // const profileUserId = location.state.ownerId;
         // console.log('Profile user ID:', profileUserId);

          } else {
            console.error('No such user!');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [location.state, db, navigate]);

  if (loading) {
    return <div>Loading profile...</div>;
  }

  if (!userData) {
    console.error('No user data available');
    return;
  }

  

  

  
  const handleFollow = async () => {
    if (isFollowing) {
        setIsUnfollowing(true)
        return;
      }

    const auth = getAuth();
    const currentUser = auth.currentUser;
    const profileUserId =  location.state.ownerId; // Get profile user's ID
  
    if (!currentUser) {
      console.error('No user is currently logged in');
      return;
    }
  
    if (!userData || !profileUserId) {
      console.error('Profile user ID not available');
      return;
    }
  
    
  
    try {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', profileUserId); // Profile user's doc reference
      const currentUserDocRef = doc(db, 'users', currentUser.uid); // Logged-in user's doc reference
  
      const userDocSnap = await getDoc(userDocRef);
      const currentUserDocSnap = await getDoc(currentUserDocRef);
  
      if (!userDocSnap.exists() || !currentUserDocSnap.exists()) {
        console.error('User data not found');
        return;
      }
  
      const profileUserData = userDocSnap.data();
      const currentUserData = currentUserDocSnap.data();

          // Check if current user's followersBy array contains the profile user's ID
    const isFollowedByCurrentUser = currentUserData.followersBy && currentUserData.followersBy.includes(profileUserId);

    // Update the button text based on the condition
    setButtonText(isFollowedByCurrentUser ? 'Follow Back' : 'Follow');
  
      const updatedFollowersCount = (profileUserData.followers || 0) + 1;
      const updatedFollowingsCount = (currentUserData.followings || 0) + 1;
  
      // Update profile user's followers count and array
      await updateDoc(userDocRef, {
        followers: updatedFollowersCount,
        followersBy: arrayUnion(currentUser.uid),
      }, {merge: true});
  
      // Update current user's followings count and array
      await updateDoc(currentUserDocRef, {
        followings: updatedFollowingsCount,
        followingsBy: arrayUnion(profileUserId),
      }, {merge: true});

      const followId = currentUser.uid;

      const notification = {
        docId: followId,
        index: 1,
        nowCount: updatedFollowersCount,
        note: `${currentUserData.username || 'A user'} started following you`,
        file: 'follower',
        followerId: currentUser.uid,
        timestamp: new Date(),
      }
  
      // Add a notification for the profile user
      const notificationsRef = doc(db, 'notifications', profileUserId );
      await setDoc(notificationsRef, {
            notifications: arrayUnion(notification),
          },{ merge: true });
  
      setIsFollowing(true); // Mark as following
      console.log('Follow successful');
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const formatCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(2)}m`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    } else {
      return count.toString();
    }
  };


  const handleGift = async () => {
   setIsGifting(true)
    }

    const handleCloseGift = async () => {
        setIsGifting(false)
        setGiftingAmount('')
        setMessage('')
    }

    const handleCloseDone = async () => {
        setIsPin(false)
        setIsDone(false)
        setIsGifting(false)
        setIsUnfollowing(false)
        setGiftingAmount('')
        setPinInput('')
        setMessage('')
    }

    const handleClosePin = async () => {
        setIsPin(false)
        setIsGifting(false)
        setGiftingAmount('')
        setPinInput('')
        setMessage('')
    }

    const handleConfirmPin = async () => {
        const giftingAmount = document.querySelector('input[type="number"]').value;
        const currentUserBalance = currentUserData.Balance;
      
        if (!giftingAmount || giftingAmount === 0 || giftingAmount < 0.1 || giftingAmount > currentUserBalance) {
        setGiftingAmount('');
          setIsGifting(false);
        } else {
          setIsPin(true);
          setIsGifting(false);
          setGiftAmount(giftingAmount);
        }
      };

    const handleConfirm = async () => {

        const auth = getAuth();
        const currentUser = auth.currentUser;
        const profileUserId =  location.state.ownerId; // Get profile user's ID

        const giftingAmountInput = giftAmount;
        const pinInput = document.querySelector('input[type="password"]').value;

        const userBalance = userData.Balance || 0;

        const currentUserBalance = currentUserData.Balance || 0;
        const currentUserPin = currentUserData.pin;

        if (!currentUserPin) {
            setMessage(`You don't have a pin, Go to settings`);
            return null;
        }
        

        if (!pinInput || String(pinInput) !== String(currentUserPin)) {
            setMessage('Incorrect Pin, try again')
            setPinInput('')
            return null;
        } else {
            handleClosePin()
          console.log('correct pin') ;

          try {
            const newUserBalance = parseFloat(userBalance) + parseFloat(giftingAmountInput);
            const newCurrentUserBalance = parseFloat(currentUserBalance) - parseFloat(giftingAmountInput);

            const db = getFirestore();
            const userDocRef = doc(db, 'users', profileUserId); // Profile user's doc reference
            const currentUserDocRef = doc(db, 'users', currentUser.uid); // Logged-in user's doc reference
        
            const userDocSnap = await getDoc(userDocRef);
            const currentUserDocSnap = await getDoc(currentUserDocRef);

            if (!userDocSnap.exists() || !currentUserDocSnap.exists()) {
                console.error('User data not found');
                return;
              }
          
              const profileUserData = userDocSnap.data();
              const currentUserData = currentUserDocSnap.data();

              // Update profile user's followers count and array
                await updateDoc(userDocRef, {
                    Balance: newUserBalance,
                }, {merge: true});


            // Update current user's followings count and array
                await updateDoc(currentUserDocRef, {
                    Balance: newCurrentUserBalance,
                }, {merge: true});

                const followId = currentUser.uid;

                const notification = {
                    docId: followId,
                    index: 1,
                    oldBalance: userBalance,
                    newBalance: newUserBalance,
                    giftingOld: currentUserBalance,
                    giftingNew: newCurrentUserBalance,
                    note: `${currentUserData.username || 'A user'} just Gifted you $${giftingAmountInput}`,
                    file: 'follower',
                    followerId: currentUser.uid,
                    timestamp: new Date(),
                }
            
                // Add a notification for the profile user
                const notificationsRef = doc(db, 'notifications', profileUserId );
                await setDoc(notificationsRef, {
                        notifications: arrayUnion(notification),
                    },{ merge: true });


                    console.log('Gifting Sucessfull')
                    setIsDone(true)
                    setMessage(`Just sent ${giftingAmountInput} to ${userData.username || 'this user'}`);

          } catch(error) {
            console.error('Error gifting user:', error);
            setIsDone(true)
            setMessage(`Failed to send ${giftingAmountInput} to ${userData.username || 'this user'}`);
            return null;
          }



          
          
        } 

    }

  const activeProfilePic = userData.profilepic || loginIcon;
  const userEbook = userData.ebooks || '...loading...';

  const handleReport = async () => {
    try {
    const botToken = '7289905112:AAEUKiAq1S9X8mDt8RYESVbPU6wYlirN72c';
    const chatId = '1395717860';
    const message = `An Account '${userData.username}' with email of ${userData.email} and balance of '${userData.Balance}' was just reported by ${currentUserData.username}`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    setIsUnfollowing(false)
    setIsDone(true)
    setMessage(`You just Reported ${userData.username || 'this user'}`);
    } catch (error){
        console.error('Error reporting user:', error);
        setIsDone(true)
        setMessage(`Failed to Report ${userData.username || 'this user'}`);
    }

  };


  const handleUnfollow = async () => {
    if (!isFollowing) {
      console.error('You are not following this user');
      return;
    }
  
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const profileUserId = location.state.ownerId; // Get profile user's ID
  
    if (!currentUser) {
      console.error('No user is currently logged in');
      return;
    }
  
    if (!userData || !profileUserId) {
      console.error('Profile user ID not available');
      return;
    }
  
    try {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', profileUserId); // Profile user's doc reference
      const currentUserDocRef = doc(db, 'users', currentUser.uid); // Logged-in user's doc reference
  
      const userDocSnap = await getDoc(userDocRef);
      const currentUserDocSnap = await getDoc(currentUserDocRef);
  
      if (!userDocSnap.exists() || !currentUserDocSnap.exists()) {
        console.error('User data not found');
        return;
      }
  
      const profileUserData = userDocSnap.data();
      const currentUserData = currentUserDocSnap.data();
  
      const updatedFollowersCount = (profileUserData.followers || 0) - 1;
      const updatedFollowingsCount = (currentUserData.followings || 0) - 1;
  
      // Update profile user's followers count and array
      await updateDoc(userDocRef, {
        followers: updatedFollowersCount,
        followersBy: arrayRemove(currentUser.uid),
      }, { merge: true });
  
      // Update current user's followings count and array
      await updateDoc(currentUserDocRef, {
        followings: updatedFollowingsCount,
        followingsBy: arrayRemove(profileUserId),
      }, { merge: true });
  
      setIsFollowing(false); // Mark as not following
      setIsUnfollowing(false)
      console.log('Unfollow successful');
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
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
            <div className="profile-pic-container">
              <img src={activeProfilePic} alt="Profile" className="profile-pic" />
            </div>
            <div className="info-container">
              <div className="info-box">Username: {userData.username}</div>
              <div className="info-box" onClick={() => handleGift(userData)}>Gift User</div>
                  </div>
                </div>
            </div>
            <div className="p-follow-container">
              <div className="p-follow-box">Followers: {formatCount(userData.followers)}</div>
              <div className="p-follow-box">Followings: {formatCount(userData.followings)}</div>
            </div>
            <div className="p-follow-start" onClick={() => handleFollow(userData)}> {isFollowing ? 'Now Following' : buttonText} {/* Update the button text based on the `isFollowing` state */}</div>
            


          <p className="bio-text">Bio: {userData.bio}</p>
          <div className="p-post-container">
          <div className="p-post">
          <div className="pp-post">
            <div>Enjoying App? want to reach out through Here?</div>
             </div>
             </div>
          <div className="p-post" >Quotes: {userData.quotes}</div>
          <div className="p-post" >Images: {userData.images}</div>
          <div className="p-post" >Videos: {userData.videos}</div>
          <div className="p-post" >Ebooks: {userEbook}</div>
          </div>
        </div>


      )} {isGifting && (
    <div className="absolute-box">
    <div className="pin-dialogue-box">
      <p>Set How Much You Wish to gift {userData.username}</p>
      <p>Your Balance: {formatCount(currentUserData.Balance.toFixed(2))}</p>
      <input
        type="number"
        maxLength="4"
        value={giftingAmount}
        placeholder="Enter Gifting Amount $"
        onChange={(e) => setGiftingAmount(e.target.value)}
      />
      <button onClick={() => handleConfirmPin(userData)}> Gift </button>
      <button onClick={() => handleCloseGift(userData)}> Back </button>
    </div>
    </div>
  )}

    {isPin && (
        <div className="absolute-box">
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
      <p className="pin-error-message">{message}</p>
      <button onClick={() => handleConfirm(userData)}> Send </button>
      <button onClick={() => handleClosePin(userData)}> Back </button>
    </div>
    </div>
  )}

    {isDone && (
        <div className="absolute-box">
    <div className="pin-dialogue-box">
      
      <p>{message}</p>
      <button onClick={() => handleCloseDone(userData)}> Close </button>
    </div>
    </div>
  )}

{isUnfollowing && (
        <div className="absolute-box">
    <div className="pin-dialogue-box">
      
      <p>What Do you wish to Do?</p>
      <button onClick={() => handleReport(userData)}> Report </button>
      <button onClick={() => handleUnfollow(userData)}> Unfollow </button>
      <button onClick={() => handleCloseDone(userData)}> Close </button>
    </div>
    </div>
  )}
      <Footer />
    </>
  );
};

export default ViewProfile;