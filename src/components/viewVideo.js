import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirestore, doc, updateDoc, getDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Header from './Header';
import Footer from './Footer';
import './viewVideo.css';
import dotsIcon from '../assets/icons/dots-icon.png';


const ViewVideo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const db = getFirestore();
  const auth = getAuth();

  const { videoUrl, videoName, videoPrice, videoType, views, videolikeCount, creatorStatus, timestamp, videoUsername, docId, index } = location.state;
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line
  const [dialogMessage, setDialogMessage] = useState('');
  const [comments, setComments] = useState([]); // State for comments
  const [newComment, setNewComment] = useState(''); // State for new comment input
  const [menuVisible, setMenuVisible] = useState(null); // State to control visibility of menu options

    // Fetch comments for the video when the component mounts
    useEffect(() => {
      const fetchComments = async () => {
        try {
          const videoDocRef = doc(db, 'videos', docId);
          const videoDocSnap = await getDoc(videoDocRef);
          if (videoDocSnap.exists()) {
          const data = videoDocSnap.data();
          const currentVideo = data.videos[index];
          setComments(currentVideo.comments || []);
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
  
        const videoDocRef = doc(db, 'videos', docId);
        const videoDocSnap = await getDoc(videoDocRef);
  
        if (videoDocSnap.exists()) {
          const data = videoDocSnap.data();
          const videosArray = data.videos;

          const currentVideo = videosArray[index];
  
          const newCommentObj = {
            comment: newComment,
            commentedBy: username,
            timestamp: new Date(),
            userId: user.uid,
            reportedBy: [],
          };
  
          const updatedComments = currentVideo.comments ? [...currentVideo.comments, newCommentObj] : [newCommentObj];
  
          videosArray[index] = {
            ...currentVideo,
            comments: updatedComments,
          };
  
          await updateDoc(videoDocRef, {
            videos: videosArray,
          });
  
          // Create or update the notification document
          const notificationsRef = doc(db, 'notifications', docId); // Notification collection per image
          const notification = {
            file: 'video',
            type: 'comment',
            commenter: username,
            comment: newComment,
            postContent: videoName,
            timestamp: new Date(),
            note: `${username} commented on your video "${videoName}"`,
            userId: user.uid,
            docId: docId, // Add docId
            index: index, // Add index
            likeCount: videolikeCount,
            videoUrl: videoUrl,
            videoName: videoName,
            views: views,
            videoPrice: videoPrice,
            videoType: videoType,
            videoUsername: videoUsername,
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
        const message = `Report: Under the video "${videoName}" by ${videoUsername}, a comment saying "${comment.comment}" was reported. The owner of the comment is ${comment.commentedBy} and it was reported by ${reporterUsername}.`;
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
  
        const videoDocRef = doc(db, 'videos', docId);
        const videoDocSnap = await getDoc(videoDocRef);
  
        if (videoDocSnap.exists()) {
          const data = videoDocSnap.data();
          const videosArray = data.videos;
          const currentVideo = videosArray[index];
  
          const updatedComments = currentVideo.comments.map((c, idx) =>
            idx === commentIdx ? { ...c, reportedBy: [...c.reportedBy, user.uid] } : c
          );
  
          videosArray[index] = {
            ...currentVideo,
            comments: updatedComments,
          };
  
          await updateDoc(videoDocRef, {
            videos: videosArray,
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
        const videoDocRef = doc(db, 'videos', docId);
        const videoDocSnap = await getDoc(videoDocRef);
  
        if (videoDocSnap.exists()) {
          const data = videoDocSnap.data();
          const videosArray = data.videos;
          const currentVideo = videosArray[index];
  
          const updatedComments = currentVideo.comments.filter((_, idx) => idx !== commentIdx);
  
          videosArray[index] = {
            ...currentVideo,
            comments: updatedComments,
          };
  
          await updateDoc(videoDocRef, {
            videos: videosArray,
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
      alert("You must be signed in to view images!");
      return;
    }

    try {
      const videoDocRef = doc(db, 'videos', docId);
      const videoDocSnap = await getDoc(videoDocRef);
  
      if (videoDocSnap.exists()) {
        const videoData = videoDocSnap.data();
        const videosArray = videoData.videos;
        const currentVideo = videosArray[index];
        const viewedBy = currentVideo.viewedBy || [];
  
        if (viewedBy.includes(user.uid)) {
          if (videoPrice === 0) {
            setDialogMessage('');
          } else if (isNaN(videoPrice)) {
            setDialogMessage('...Video is Loading...');
            setTimeout(() => {
              setIsPlaying(false);
            }, 10); // 2 seconds timer for paid videos
          } else {
            setTimeout(() => {
              setIsPlaying(false);
            }, 3000); // 2 seconds timer for paid images
          }
        } else {
          const updatedVideos = [...videosArray];
          updatedVideos[index] = {
            ...updatedVideos[index],
            views: (currentVideo.views || 0) + 1,
            viewedBy: [...viewedBy, user.uid], // Update viewedBy array manually
          };
          // Update view count and viewedBy array
          await updateDoc(videoDocRef, {
            videos: updatedVideos,
          });

          if (videoPrice === 0) {
            setDialogMessage('');
            setIsPlaying(true); // 5 seconds timer for free images
          } else {
            setDialogMessage('');
            setIsPlaying(true); // 5 seconds timer for free images   
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
    <div className="view-video-page">
        <Header />
      <div className="view-video-container">
        <h2 onClick={handleBackClick}>-{videoName}-</h2>
        <p><strong>Price:</strong> ${videoPrice}</p>
        <p><strong>Type:</strong> {videoType}</p>
        <p><strong>Likes:</strong> {videolikeCount}</p>
        <p><strong>Views:</strong> {views}</p>
        <p><strong>Video Status:</strong> {creatorStatus}</p>
        <p><strong>Uploaded:</strong> {timestamp ? timestamp.toLocaleDateString() : '...Loading...'}</p>
        
        <button className="play-button" onClick={handlePlay}>Play</button>
      </div>

      {isPlaying && (
        <div className="v-player-dialogue-box">
          <div className="video-player-container">
            <video width="100%" height="auto" controls autoPlay>
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <button className="close-button" onClick={closeDialog}>Close</button>
        </div>
      )}


          <div className="video-main-comment">
          <div className="video-comments-section">
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

export default ViewVideo;
