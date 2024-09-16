import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirestore, doc, updateDoc, getDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Header from './Header';
import Footer from './Footer';
import './ViewEbook.css';
import dotsIcon from '../assets/icons/dots-icon.png';

const ViewEbook = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const db = getFirestore();
  const auth = getAuth();

  const { ebookUrl, ebookName, ebookPrice, ebookType, views, ebooklikeCount, creatorStatus, timestamp, ebookUsername, docId, index } = location.state;
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line
  const [dialogMessage, setDialogMessage] = useState('');
  const [comments, setComments] = useState([]); // State for comments
  const [newComment, setNewComment] = useState(''); // State for new comment input
  const [menuVisible, setMenuVisible] = useState(null); // State to control visibility of menu options

  // Fetch comments for the ebook when the component mounts
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const ebookDocRef = doc(db, 'ebooks', docId);
        const ebookDocSnap = await getDoc(ebookDocRef);
        if (ebookDocSnap.exists()) {
          const data = ebookDocSnap.data();
          const currentEbook = data.ebooks[index];
          setComments(currentEbook.comments || []);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };

    fetchComments();
  }, [db, docId, index]);

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

      const ebookDocRef = doc(db, 'ebooks', docId);
      const ebookDocSnap = await getDoc(ebookDocRef);

      if (ebookDocSnap.exists()) {
        const data = ebookDocSnap.data();
        const ebooksArray = data.ebooks;

        const currentEbook = ebooksArray[index];

        const newCommentObj = {
          comment: newComment,
          commentedBy: username,
          timestamp: new Date(),
          userId: user.uid,
          reportedBy: [],
        };

        const updatedComments = currentEbook.comments ? [...currentEbook.comments, newCommentObj] : [newCommentObj];

        ebooksArray[index] = {
          ...currentEbook,
          comments: updatedComments,
        };

        await updateDoc(ebookDocRef, {
          ebooks: ebooksArray,
        });

        // Create or update the notification document
        const notificationsRef = doc(db, 'notifications', docId); // Notification collection per ebook
        const notification = {
          file: 'ebook',
          type: 'comment',
          commenter: username,
          comment: newComment,
          postContent: ebookName,
          timestamp: new Date(),
          note: `${username} commented on your ebook "${ebookName}"`,
          userId: user.uid,
          docId: docId, // Add docId
          index: index, // Add index
          likeCount: ebooklikeCount,
          ebookUrl: ebookUrl,
          ebookName: ebookName,
          views: views,
          ebookPrice: ebookPrice,
          ebookType: ebookType,
          ebookUsername: ebookUsername,
          creatorStatus: creatorStatus,
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
      const message = `Report: Under the ebook "${ebookName}" by ${ebookUsername}, a comment saying "${comment.comment}" was reported. The owner of the comment is ${comment.commentedBy} and it was reported by ${reporterUsername}.`;
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

      const ebookDocRef = doc(db, 'ebooks', docId);
      const ebookDocSnap = await getDoc(ebookDocRef);

      if (ebookDocSnap.exists()) {
        const data = ebookDocSnap.data();
        const ebooksArray = data.ebooks;
        const currentEbook = ebooksArray[index];

        const updatedComments = currentEbook.comments.map((c, idx) =>
          idx === commentIdx ? { ...c, reportedBy: [...c.reportedBy, user.uid] } : c
        );

        ebooksArray[index] = {
          ...currentEbook,
          comments: updatedComments,
        };

        await updateDoc(ebookDocRef, {
          ebooks: ebooksArray,
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
      const ebookDocRef = doc(db, 'ebooks', docId);
      const ebookDocSnap = await getDoc(ebookDocRef);

      if (ebookDocSnap.exists()) {
        const data = ebookDocSnap.data();
        const ebooksArray = data.ebooks;
        const currentEbook = ebooksArray[index];

        const updatedComments = currentEbook.comments.filter((_, idx) => idx !== commentIdx);

        ebooksArray[index] = {
          ...currentEbook,
          comments: updatedComments,
        };

        await updateDoc(ebookDocRef, {
          ebooks: ebooksArray,
        });

        setComments(updatedComments);
        setMenuVisible(null);
        alert('Comment deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleBackClick = () => {
    navigate(-1); // Navigate back to the previous page
  };

  const handlePlay = async () => {
    setIsPlaying(true);
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to view ebooks!");
      return;
    }

    try {
      const ebookDocRef = doc(db, 'ebooks', docId);
      const ebookDocSnap = await getDoc(ebookDocRef);

      if (ebookDocSnap.exists()) {
        const ebookData = ebookDocSnap.data();
        const ebooksArray = ebookData.ebooks;
        const currentEbook = ebooksArray[index];
        const viewedBy = currentEbook.viewedBy || [];

        if (viewedBy.includes(user.uid)) {
          if (ebookPrice === 0) {
            setDialogMessage('');
          } else if (isNaN(ebookPrice)) {
            setDialogMessage('...Ebook is Loading...');
            setTimeout(() => {
              setIsPlaying(false);
            }, 10); // 2 seconds timer for paid ebooks
          } else {
            setTimeout(() => {
              setIsPlaying(false);
            }, 3000); // 2 seconds timer for paid ebooks
          }
        } else {
          const updatedEbooks = [...ebooksArray];
          updatedEbooks[index] = {
            ...updatedEbooks[index],
            views: (currentEbook.views || 0) + 1,
            viewedBy: [...viewedBy, user.uid], // Update viewedBy array manually
          };
          // Update view count and viewedBy array
          await updateDoc(ebookDocRef, {
            ebooks: updatedEbooks,
          });

          if (ebookPrice === 0) {
            setDialogMessage('');
            setIsPlaying(true); // 5 seconds timer for free ebooks
          } else {
            setDialogMessage('');
            setIsPlaying(true); // 5 seconds timer for free ebooks
            // Hide the dialog box after 2.5 seconds
            setTimeout(() => {
              setIsPlaying(false);
            }, 3000);
          }
        }
      }
    } catch (error) {
      console.error('Error updating view count:', error);
      setDialogMessage('Error updating view count');
      setIsPlaying(false);

      // Hide the dialog box after 2.5 seconds
      setTimeout(() => {
        setIsPlaying(false);
      }, 1000);
    }
  };

  const handleSkip = () => {
    alert('skipped')
  }

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

  const closeDialog = () => {
    setIsPlaying(false);
  };

  return (
    <div className="view-ebook-page">
      <Header />
      <div className="view-ebook-container">
        <h2 onClick={handleBackClick}>-{ebookName}-</h2>
        <p><strong>Price:</strong> ${ebookPrice}</p>
        <p><strong>Type:</strong> {ebookType}</p>
        <p><strong>Likes:</strong> {ebooklikeCount}</p>
        <p><strong>Views:</strong> {views}</p>
        <p><strong>Ebook Status:</strong> {creatorStatus}</p>
        <p><strong>Uploaded:</strong> {timestamp ? timestamp.toLocaleDateString() : '...Loading...'}</p>

        <button className="play-button" onClick={handlePlay}>Read</button>
      </div>

      {isPlaying && (
        <div className="e-player-dialogue-box">
          <div className="ebook-player-container">
            <iframe src={ebookUrl} width="100%" height="auto" />
          </div>
          <button className="close-button" onClick={closeDialog}>Close</button>
        </div>
      )}


      <div className="ebook-main-comment">
        <div className="ebook-comments-section">
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
            <p className="white-text">No comments yet.</p>
          )}
        </div>

        <div className="comment-input">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
          />
          <button onClick={handleCommentSubmit}>Comment</button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ViewEbook;