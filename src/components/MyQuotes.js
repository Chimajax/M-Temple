import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, updateDoc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import likeIcon from '../assets/icons/like-icon.png';
import likedIcon from '../assets/icons/liked-icon.png';
import downloadIcon from '../assets/icons/download-icon.png';
import dotsIcon from '../assets/icons/dots-icon.png';
import Footer from './Footer';
import './VideoSection.css';

const MyQuotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(null);
  const [userUid, setUserUid] = useState(null);
  
  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserQuotes = async (user) => {
      if (user) {
        try {
          setUserUid(user.uid);

          // Fetch the user's quotes document
          const quoteRef = doc(db, 'quotes', user.uid);
          const quoteDoc = await getDoc(quoteRef);

          if (quoteDoc.exists()) {
            const quoteData = quoteDoc.data();
            const allQuotes = [];
            if (quoteData.quotes && Array.isArray(quoteData.quotes)) {
              quoteData.quotes.forEach((quote, idx) => {
                const uniqueId = user.uid + '-' + idx;
                const isLiked = quote.likedBy?.includes(user.uid) || false;
                allQuotes.push({
                  id: uniqueId,
                  docId: quoteRef.id, // Corrected here
                  index: idx,
                  quote: quote.quote,
                  username: quote.username || 'Anonymous',
                  likeCount: quote.likeCount || 0,
                  isLiked: isLiked,
                  likedBy: quote.likedBy || [],
                  reported: quote.reported || 0,
                  reportedBy: quote.reportedBy || [],
                  timestamp: quote.timestamp ? new Date(quote.timestamp) : null,
                  ownerId: quote.ownerId,
                });
              });

              // Sort quotes by timestamp, most recent first
              allQuotes.sort((a, b) => {
                const dateA = a.timestamp ? a.timestamp.getTime() : 0;
                const dateB = b.timestamp ? b.timestamp.getTime() : 0;
                return dateB - dateA;
              });

              setQuotes(allQuotes);
            } else {
              setQuotes([]);
            }
          } else {
            setQuotes([]);
          }
        } catch (error) {
          console.error("Error fetching quotes:", error);
        } finally {
          setLoading(false);
        }
      } else {
        // Redirect to login if no user is signed in
        navigate('/login');
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserQuotes(user);
      } else {
        setLoading(false);
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, db, navigate]);

  const handleLike = async (quote, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;
  
    if (!user) {
      alert("You must be signed in to like quotes!");
      return;
    }
  
    try {
      const quoteDocRef = doc(db, 'quotes', quote.docId);
      const quoteDocSnap = await getDoc(quoteDocRef);
  
      if (quoteDocSnap.exists()) {
        const docData = quoteDocSnap.data();
        const quotesArray = docData.quotes;
        const currentQuote = quotesArray[quote.index];
        const likedBy = currentQuote.likedBy || [];
        const userIdIndex = likedBy.indexOf(user.uid);
        let updatedLikeCount = quote.likeCount;
  
        if (userIdIndex === -1) {
          likedBy.push(user.uid);
          updatedLikeCount += 1;
  
          // Fetch the username of the current user
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          const username = userDocSnap.exists() ? userDocSnap.data().username || 'Anonymous' : 'Anonymous';

           // Fetch the post owner's user ID
        const postOwnerUid = quote.ownerId; 
  
          const content = currentQuote.quote;
  
          // Create notification object with docId and index
          const notification = {
            quote: content,
            timestamp: new Date(),
            username: username,
            likecount: updatedLikeCount,
            note: `${username} liked your post "${content}"`,
            docId: quote.docId, // Add docId
            index: quote.index, // Add index
          };
  
          // Send notification to the post owner's notifications
        const postOwnerNotificationsRef = doc(db, 'notifications', postOwnerUid);
        await setDoc(postOwnerNotificationsRef, {
            notifications: arrayUnion(notification),
          }, { merge: true });
        } else {
          likedBy.splice(userIdIndex, 1);
          updatedLikeCount -= 1;
        }
  
        const updatedQuote = {
          ...currentQuote,
          likedBy: likedBy,
          likeCount: updatedLikeCount,
        };
  
        quotesArray[quote.index] = updatedQuote;
  
        await updateDoc(quoteDocRef, {
          quotes: quotesArray,
        });
  
        setQuotes((prevQuotes) =>
          prevQuotes.map((q) => (q.id === quote.id ? { ...q, likeCount: updatedLikeCount, isLiked: likedBy.includes(user.uid) } : q))
        );
      }
    } catch (error) {
      console.error('Error updating like count:', error);
    }
  };

  const handleDelete = async (quote, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to delete quotes!");
      return;
    }

    try {
      const quoteDocRef = doc(db, 'quotes', user.uid);
      const quoteDocSnap = await getDoc(quoteDocRef);

      if (quoteDocSnap.exists()) {
        const docData = quoteDocSnap.data();
        const quotesArray = docData.quotes;
        // Remove the quote from the array
        quotesArray.splice(quote.index, 1);

        await updateDoc(quoteDocRef, {
          quotes: quotesArray,
        });

        // Update the state with the new quotes
        setQuotes((prevQuotes) => prevQuotes.filter((q) => q.id !== quote.id));

         // Get the current user document
      const userDoc = await getDoc(doc(db, 'users', userUid));
      const userData = userDoc.data();

      // Increment the profilepic value by 1
      const newQuotesValue = (userData.quotes || 0) - 1;

      // Update the user document with the new profilepic value
      await updateDoc(doc(db, 'users', userUid), { quotes: newQuotesValue });

      // finished

      }
    } catch (error) {
      console.error('Error deleting quote:', error);
    }
  };

  const handleMenuClick = (quoteId, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    setMenuVisible(menuVisible === quoteId ? null : quoteId);
  };

  const handleQuoteClick = (quote) => {
    navigate('/viewpost', {
      state: {
        quote: quote.quote,
        username: quote.username,
        likeCount: quote.likeCount,
        timestamp: quote.timestamp,
        docId: quote.docId,
        index: quote.index,
      },
    });
  };

  const formatLikeCount = (count) => {
    if (count < 1000) {
      return count.toString();
    } else if (count < 1000000) {
      return (count / 1000).toFixed(1) + 'k';
    } else {
      return (count / 1000000).toFixed(1) + 'M';
    }
  };

  return (
    <>
      {loading ? (
        <div className="loading-page">
          <div className="loading-circle"></div>
        </div>
      ) : (
        <div className="my-quote-section push-down">  {/* i got push up from MyVideoSection.js*/}
          {quotes.length > 0 ? (
            quotes.map((quote, index) => (
              <div key={index} className="my-quote-card" onClick={() => handleQuoteClick(quote)}>
                <div className="quote-actions">
                  <div className="quote-author">- {quote.username}</div>
                  <div className="dots-menu">
                    <img
                      src={dotsIcon}
                      alt="More options"
                      className="r-action-icon"
                      onClick={(e) => handleMenuClick(quote.id, e)}
                    />
                    {menuVisible === quote.id && (
                      <div className="menu">
                        <button className="menu-item" onClick={(e) => handleDelete(quote, e)}>Delete</button>
                        <button className="menu-item" onClick={() => setMenuVisible(null)}>Skip</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="quote-text">"{quote.quote}"</div>
                <div className="quote-actions-1">
                  <div className="like-count" onClick={(e) => handleLike(quote, e)}>
                  <img
                  src={quote.isLiked ? likedIcon : likeIcon}
                  alt={quote.isLiked ? "Liked" : "Like"}
                  className="action-icon"
                />
                <span className="like-number">{formatLikeCount(quote.likeCount)}</span>
              </div>
              <div className="download-button">
                <img src={downloadIcon} alt="Download" className="action-icon" />
              </div>
            </div>
          </div>
          
        ))
      ) : (
        <div className="q-loading-page">
          <div style={{ color: 'white' }}>No quotes available, post a quote</div>
        </div>
      )}
      <Footer />
    </div>
      )}
      </>
);
};

export default MyQuotes;
