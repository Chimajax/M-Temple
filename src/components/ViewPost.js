import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirestore, doc, updateDoc, getDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import './ViewPost.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import dotsIcon from '../assets/icons/dots-icon.png';

const ViewPost = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    quote = '',
    username = '',
    likeCount = 0,
    timestamp = null,
    docId = '',
    index = 0,
    views = 0,
   // viewedBy = [],
  } = location.state || {};

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [menuVisible, setMenuVisible] = useState(null);
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const quoteDocRef = doc(db, 'quotes', docId);
        const quoteDocSnap = await getDoc(quoteDocRef);
        if (quoteDocSnap.exists()) {
          const data = quoteDocSnap.data();
          const currentQuote = data.quotes[index];
          setComments(currentQuote.comments || []);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };

    fetchComments();
  }, [db, docId, index]);



  useEffect(() => {
    const updateUserView = async () => {
      const user = auth.currentUser;
      if (!user) return; // Check if the user is authenticated
  
      const quoteDocRef = doc(db, 'quotes', docId); // Reference to the document
      const quoteDocSnap = await getDoc(quoteDocRef); // Fetch the document
  
      if (!quoteDocSnap.exists()) {
        console.error('Quote document does not exist');
        return;
      }
  
      const data = quoteDocSnap.data();
      const currentQuote = data.quotes[index]; // Get the current quote based on the index
  
      if (!data || !data.quotes || !currentQuote) {
        console.error('Quote data is missing or invalid');
        return;
      }
  
      // Ensure 'viewedBy' is initialized as an array
      const viewedByArray = currentQuote.viewedBy || [];
  
      // Check if the user's UID is already in the 'viewedBy' array
      if (!viewedByArray.includes(user.uid)) {
        // If not, update the document to add the UID to 'viewedBy' and increment 'views'
        const updatedQuotes = [...data.quotes];
        updatedQuotes[index] = {
          ...currentQuote,
          viewedBy: [...(currentQuote.viewedBy || []), user.uid], // Update the viewedBy array
          views: currentQuote.views + 1, // Increment the views count
        };
  
        await updateDoc(quoteDocRef, {
          quotes: updatedQuotes, // Update the quotes array in Firestore
        });
      }
    };
  
    updateUserView(); // Call the function inside useEffect
  }, [db, docId, index, auth]);
  
  
  // ... (rest of the code remains the same)


  const handleCommentSubmit = async () => {
    const user = auth.currentUser;
  
    if (!user || newComment.trim() === '') {
      alert("You must be signed in and write a comment to submit!");
      return;
    }
  
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      let username = 'Anonymous';
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        username = userData.username || 'Anonymous';
      }
  
      const quoteDocRef = doc(db, 'quotes', docId);
      const quoteDocSnap = await getDoc(quoteDocRef);
  
      if (quoteDocSnap.exists()) {
        const data = quoteDocSnap.data();
        const quotesArray = data.quotes;
        const currentQuote = quotesArray[index];
  
        const newCommentObj = {
          comment: newComment,
          commentedBy: username,
          timestamp: new Date(),
          userId: user.uid,
          reportedBy: [],
        };
  
        const updatedComments = currentQuote.comments ? [...currentQuote.comments, newCommentObj] : [newCommentObj];
  
        quotesArray[index] = {
          ...currentQuote,
          comments: updatedComments,
        };
  
        await updateDoc(quoteDocRef, {
          quotes: quotesArray,
        });
  
        // Create or update the notification document
        const notificationsRef = doc(db, 'notifications', docId); // Notification collection per post
        const notification = {
          type: 'comment',
          commenter: username,
          comment: newComment,
          postContent: quote,
          timestamp: new Date(),
          note: `${username} commented on your post "${quote}"`,
          userId: user.uid,
          docId: docId, // Add docId
          index: index, // Add index
        };

        await setDoc(notificationsRef, {
          notifications: arrayUnion(notification),
        }, { merge: true });
  
        setComments(updatedComments);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  

  const handleMenuClick = (commentIdx) => {
    setMenuVisible(menuVisible === commentIdx ? null : commentIdx);
  };

  const handleSkip = () => {
    alert('Skipping comment...');
    setMenuVisible(null);
  };

  const handleReport = async (comment, commentIdx) => {
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to report comments!");
      return;
    }

    if (comment.reportedBy.includes(user.uid)) {
      alert("You have already reported this comment!");
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      let reporterUsername = 'Anonymous';

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        reporterUsername = userData.username || 'Anonymous';
      }

      const botToken = '7289905112:AAEUKiAq1S9X8mDt8RYESVbPU6wYlirN72c';
      const chatId = '1395717860';
      const message = `Report: Under the post "${quote}" by ${username}, a comment saying "${comment.comment}" was reported. The owner of the comment is ${comment.commentedBy} and it was reported by ${reporterUsername}.`;
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

      const quoteDocRef = doc(db, 'quotes', docId);
      const quoteDocSnap = await getDoc(quoteDocRef);

      if (quoteDocSnap.exists()) {
        const data = quoteDocSnap.data();
        const quotesArray = data.quotes;
        const currentQuote = quotesArray[index];

        const updatedComments = currentQuote.comments.map((c, idx) =>
          idx === commentIdx ? { ...c, reportedBy: [...c.reportedBy, user.uid] } : c
        );

        quotesArray[index] = {
          ...currentQuote,
          comments: updatedComments,
        };

        await updateDoc(quoteDocRef, {
          quotes: quotesArray,
        });

        setComments(updatedComments);
        setMenuVisible(null);
        alert('Comment reported successfully!');
      }
    } catch (error) {
      console.error('Error reporting comment:', error);
    }
  };

  const handleDelete = async (commentIdx) => {
    const user = auth.currentUser;
    const comment = comments[commentIdx];

    if (!user || comment.userId !== user.uid) {
      alert("You can only delete your own comments!");
      return;
    }

    try {
      const quoteDocRef = doc(db, 'quotes', docId);
      const quoteDocSnap = await getDoc(quoteDocRef);

      if (quoteDocSnap.exists()) {
        const data = quoteDocSnap.data();
        const quotesArray = data.quotes;
        const currentQuote = quotesArray[index];

        const updatedComments = currentQuote.comments.filter((_, idx) => idx !== commentIdx);

        quotesArray[index] = {
          ...currentQuote,
          comments: updatedComments,
        };

        await updateDoc(quoteDocRef, {
          quotes: quotesArray,
        });

        setComments(updatedComments);
        setMenuVisible(null);
        alert('Comment deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    } else if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString();
    } else if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleDateString();
    }
    return 'Unknown';
  };

  const handleBackClick = () => {
    navigate(-1); // Navigate back to the previous page
  };

  return (
    <>
      <Header />
      <div className="view-post">
        <div onClick={handleBackClick} className="view-post-card">
          <h2>Post Details</h2>
          <p><strong>Quote:</strong> "{quote}"</p>
          <p><strong>Author:</strong> {username}</p>
          <p><strong>Likes:</strong> {likeCount}</p>
          <p><strong>views:</strong> {views}</p>
          <p><strong>Posted on:</strong> {timestamp ? formatTimestamp(timestamp) : 'Unknown'}</p>
        </div>

        <div className="comments-section push-up">
          <h3>Comments:</h3>
          {comments.length > 0 ? (
            comments.map((comment, idx) => (
              <div key={idx} className="comment">
                <p><strong>{comment.commentedBy}:</strong> {comment.comment}</p>
                <p className="comment-timestamp">{formatTimestamp(comment.timestamp)}</p>
                <img
                  src={dotsIcon}
                  alt="Menu"
                  className="dots-icon"
                  onClick={() => handleMenuClick(idx)}
                />
                {menuVisible === idx && (
                  <div className="menu">
                    <button onClick={handleSkip}>Skip</button>
                    {auth.currentUser && comment.userId === auth.currentUser.uid && (
                      <button onClick={() => handleDelete(idx)}>Delete</button>
                    )}
                    <button onClick={() => handleReport(comment, idx)}>Report</button>
                    
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>No comments yet.</p>
          )}
        </div>

        <div className="comment-input">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
          />
          <button onClick={handleCommentSubmit}>Submit</button>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ViewPost;
