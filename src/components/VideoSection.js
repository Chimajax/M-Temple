import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import likeIcon from '../assets/icons/like-icon.png';
import likedIcon from '../assets/icons/liked-icon.png';
import downloadIcon from '../assets/icons/download-icon.png';
import dotsIcon from '../assets/icons/dots-icon.png';
import './VideoSection.css';
import { useNavigate } from 'react-router-dom';

const VideoSection = () => {
  const [quotes, setQuotes] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null);
  const db = getFirestore();
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const quotesCollection = collection(db, 'quotes');
        const quotesSnapshot = await getDocs(quotesCollection);
        const allQuotes = [];
        const user = auth.currentUser;

        quotesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.quotes && Array.isArray(data.quotes)) {
            data.quotes.forEach((quote, idx) => {
              const uniqueId = doc.id + '-' + idx;
              const isLiked = user ? data.quotes[idx].likedBy?.includes(user.uid) : false;
              allQuotes.push({
                id: uniqueId,
                docId: doc.id,
                index: idx,
                quote: quote.quote,
                username: quote.username || 'Anonymous',
                likeCount: quote.likeCount || 0,
                isLiked: isLiked,
                likedBy: quote.likedBy || [],
                reported: quote.reported || 0,
                reportedBy: quote.reportedBy || [],
                views: quote.views || 0,
                viewedBy: quote.viewedBy || [],
                timestamp: quote.timestamp ? new Date(quote.timestamp) : null,
                ownerId: quote.ownerId,
              });
            });
          }
        });

        // Sort quotes by timestamp, most recent first
        allQuotes.sort((a, b) => {
          const dateA = a.timestamp ? a.timestamp.getTime() : 0;
          const dateB = b.timestamp ? b.timestamp.getTime() : 0;
          return dateB - dateA;
        });

        setQuotes(allQuotes);
      } catch (error) {
        console.error('Error fetching quotes:', error);
      }
    };

    fetchQuotes();
  }, [db, auth]);

  const handleLike = async (quote, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;
  
    if (!user) {
      alert("You must be signed in to like quotes!");
      return;
    }

    // Temporarily update the like icon
  setQuotes((prevQuotes) =>
    prevQuotes.map((q) =>
      q.id === quote.id ? { ...q, isLiked: !q.isLiked } : q
    )
  );
  
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
      setQuotes((prevQuotes) =>
        prevQuotes.map((q) =>
          q.id === quote.id ? { ...q, isLiked: !q.isLiked } : q
        )
      );
      console.error('Error updating like count:', error);
    }
  };

  const handleBookmark = async (quote, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to bookmark!");
      return;
    }

    try {
      const quoteDocRef = doc(db, 'quotes', quote.docId);
    const quoteDocSnap = await getDoc(quoteDocRef);

    if (quoteDocSnap.exists()) {
      const docData = quoteDocSnap.data();
      const quotesArray = docData.quotes;
      const currentQuote = quotesArray[quote.index];

      // Fetch the username of the current user 
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const username = userDocSnap.exists() ? userDocSnap.data().username || 'Anonymous' : 'Anonymous';

      const content = currentQuote.quote;
      const updatedLikeCount = quote.likeCount;

      // Create notification object with docId and index
      const bookmark = {
        quote: content,
        timestamp: new Date(),
        username: username,
        likecount: updatedLikeCount,
        note: `you bookmarked the post "${content}"`,
        docId: quote.docId, // Add docId
        index: quote.index, // Add index
      };

      // Check if the user has already bookmarked the post
      const postBookmarkRef = doc(db, 'bookmarks', user.uid);
      const postBookmarkSnap = await getDoc(postBookmarkRef);
      if (postBookmarkSnap.exists()) {
        const bookmarks = postBookmarkSnap.data().bookmarks;
        const bookmarkIndex = bookmarks.findIndex((b) => b.docId === quote.docId && b.index === quote.index);
        if (bookmarkIndex !== -1) {
          // Remove the bookmark
          bookmarks.splice(bookmarkIndex, 1);
          await setDoc(postBookmarkRef, {
            bookmarks: bookmarks,
          }, { merge: true });
        } else {
          // Add the bookmark
          await updateDoc(postBookmarkRef, {
            bookmarks: arrayUnion(bookmark),
          }, { merge: true });
        }
      } else {
        // Add the bookmark
        await setDoc(postBookmarkRef, {
          bookmarks: [bookmark],
        });
      }

      // Update the UI to reflect the new bookmark status
        console.log('bookmarking sucessful')
      }
      setMenuVisible(null);
    } catch (error) {
      console.error('Error adding to bookmark:', error);
    }

  }
  
  const handleReport = async (quote, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to report quotes!");
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid); // Reference to the user's Firestore document
      const userDocSnap = await getDoc(userDocRef);

      let reporterUsername = 'Anonymous';

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        reporterUsername = userData.username || 'Anonymous'; // Fetch username from Firestore
      }

      const quoteDocRef = doc(db, 'quotes', quote.docId);
      const quoteDocSnap = await getDoc(quoteDocRef);

      if (quoteDocSnap.exists()) {
        const docData = quoteDocSnap.data();
        const quotesArray = docData.quotes;
        const currentQuote = quotesArray[quote.index];
        const reportedBy = currentQuote.reportedBy || [];

        if (!reportedBy.includes(user.uid)) {
          const reportedCount = (currentQuote.reported || 0) + 1;
          reportedBy.push(user.uid);

          const updatedQuote = {
            ...currentQuote,
            reported: reportedCount,
            reportedBy: reportedBy,
          };

          quotesArray[quote.index] = updatedQuote;

          await updateDoc(quoteDocRef, {
            quotes: quotesArray,
          });

          const botToken = '7289905112:AAEUKiAq1S9X8mDt8RYESVbPU6wYlirN72c';
          const chatId = '1395717860';
          const message = `A quote saying "${quote.quote}" was reported. The owner of the post is ${quote.username}, and it was reported by ${reporterUsername}.`;
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

          setQuotes((prevQuotes) =>
            prevQuotes.map((q) =>
              q.id === quote.id ? { ...q, reported: reportedCount } : q
            )
          );
          setMenuVisible(null);

          alert('Quote reported successfully!');
        } else {
          alert('You have already reported this quote!');
        }
      }
    } catch (error) {
      console.error('Error reporting quote:', error);
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
        views: quote.views,
        viewedBy: quote.viewedBy,
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

  const handleVisit = async (quote, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up

    navigate('/viewprofile', {
      
      state: {
        ownerId: quote.ownerId,
      },
    });
  }



  return (
    <div className="quote-section">
      {quotes.length > 0 ? (
        quotes.map((quote, index) => (
          <div key={index} className="quote-card" onClick={() => handleQuoteClick(quote)}>
            <div className="quote-actions">
              <div className="quote-author" onClick={(e) => handleVisit(quote, e)} >- {quote.username}</div>
              <div className="dots-menu">
                <img
                  src={dotsIcon}
                  alt="More options"
                  className="r-action-icon"
                  onClick={(e) => handleMenuClick(quote.id, e)}
                />
                {menuVisible === quote.id && (
                  <div className="menu">
                    <button className="menu-item" onClick={(e) => handleReport(quote, e)}>Report</button>
                    <button className="menu-item" onClick={(e) => handleBookmark(quote, e)}>Bookmark</button>
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
          <div>No quotes available, Try Reloading Page</div>
        </div>
      )}
    </div>
  );
};

export default VideoSection;
