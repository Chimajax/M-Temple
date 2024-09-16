import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Quote.css';

const Quote = () => {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [loading, setLoading] = useState(true); 
  const [userUid, setUserUid] = useState(null);
  const [isNotPosting, setIsNotPosting] = useState(true);
  const [blockMessage, setBlockMessage] = useState(false);

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0); 

  const messages = ["What's new?", "Take A Tour?", "Pass a message?", "Rate My App"]; // Messages to dissappear

  
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.username || '');
            setFirstName(userData.firstName || '');
            setEmail(userData.email || '');

            const profilePicRef = ref(storage, `${user.email}/profilepic`);
            const profilePicUrl = await getDownloadURL(profilePicRef);
            setProfilePic(profilePicUrl);
          }
          setUserUid(user.uid); 
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user);
      } else {
        setLoading(false); 
      }
    });

     // Automatically switch block messages every 3 seconds
     const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000); // 3 seconds interval

    setTimeout(() => {
      setBlockMessage(true);
    }, 2500);

    return () => {
      clearInterval(messageInterval); // Clear interval when component unmounts
       unsubscribe();}
  }, [auth, db, storage, messages.length]);

  const handlePostQuote = async () => {
    if (quoteMessage.trim() === '') {
      alert('Quote cannot be empty');
      return;
    }

    setIsNotPosting(false);

    try {
      const quoteRef = doc(db, 'quotes', userUid); 
      const quoteDoc = await getDoc(quoteRef);

      if (!quoteDoc.exists()) {
        // If the document does not exist, create it with an empty quotes array
        await setDoc(quoteRef, {
          quotes: [],
          numberOfQuotes: 0,
        });
      }

      // Add the new quote without a timestamp
      const newQuote = {
        quote: quoteMessage,
        views: 0,
        viewCount: [],
        likeCount: 0,
        username: username,
        firstName: firstName,
        email: email,
        timestamp: new Date(),
        ownerId: auth.currentUser.uid, // Add the auth user ID to the newQuote object
      };

      await updateDoc(quoteRef, {
        quotes: arrayUnion(newQuote),
        numberOfQuotes: (quoteDoc.exists() ? quoteDoc.data().numberOfQuotes : 0) + 1,
        timestamp: serverTimestamp(), // Setting a global timestamp
      });


      // updating quote in user document
      // Get the current user document
      const userDoc = await getDoc(doc(db, 'users', userUid));
      const userData = userDoc.data();

      // Increment the profilepic value by 1
      const newQuotesValue = (userData.quotes || 0) + 1;

      // Update the user document with the new profilepic value
      await updateDoc(doc(db, 'users', userUid), { quotes: newQuotesValue });

      // finished

      setQuoteMessage('');
      //alert('Quote posted successfully with timestamp!');

      // Redirect to the home page after 1 second
      setTimeout(() => {
        navigate('/');
      }, 1000);
      
    } catch (error) {
      console.error('Error posting quote:', error);
      console.log(`Failed to post quote: ${error.message}`);
    }
  };

  const handleBlockClose = async () => {
    setBlockMessage(false)
  }

  return (
    <>
      <Header />
      {loading ? (
        <div className="loading-page">
          <div className="loading-circle"></div>
        </div>
      ) : (
        <div className="quote-container">
          <div className="q-profile-info-container">
            <div className="q-profile-pic-container">
              <img src={profilePic} alt="Profile" className="profile-pic" />
            </div>
            <div className="q-username-container">
              <div className="username">Username: {username}</div>
            </div>
          </div>
          <div className="quote-input-container">
            <textarea
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              placeholder="Type your quote here..."
              className="quote-message"
            />
           {isNotPosting ? (
            <button className="post-quote-button" onClick={handlePostQuote}>
              POST
            </button> ) : (<div className="loading-circle"></div>) }

            {blockMessage && (
              <div className="block-message">
                <div>{messages[currentMessageIndex]}</div> {/* Show current message */}
                <button onClick={handleBlockClose}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
      <Footer />
    </>
  );
};

export default Quote;
