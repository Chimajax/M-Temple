import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirestore, doc, updateDoc, getDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import './ViewImage.css'; // Assuming you have a separate CSS file for styling
import dotsIcon from '../assets/icons/dots-icon.png';


const ViewImage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const db = getFirestore();
  const auth = getAuth();

  const {
    imageUrl,
    imageName,
    likeCount,
    timestamp,
    docId,
    index,
    imagePrice,
    imageType,
    imageUsername,
    creatorStatus,
    views,
  } = location.state || {};

  const [dialogMessage, setDialogMessage] = useState('');
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [showImage, setShowImage] = useState(false); // New state to control image visibility
  const [comments, setComments] = useState([]); // State for comments
  const [newComment, setNewComment] = useState(''); // State for new comment input
  const [menuVisible, setMenuVisible] = useState(null); // State to control visibility of menu options

  // Format timestamp if available
  const formattedDate = timestamp ? timestamp.toLocaleDateString() : 'Unknown date';

  // Fetch comments for the image when the component mounts
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const imageDocRef = doc(db, 'images', docId);
        const imageDocSnap = await getDoc(imageDocRef);
        if (imageDocSnap.exists()) {
          const data = imageDocSnap.data();
          const currentImage = data.images[index];
          setComments(currentImage.comments || []);
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

      const imageDocRef = doc(db, 'images', docId);
      const imageDocSnap = await getDoc(imageDocRef);

      if (imageDocSnap.exists()) {
        const data = imageDocSnap.data();
        const imagesArray = data.images;
        const currentImage = imagesArray[index];

        const newCommentObj = {
          comment: newComment,
          commentedBy: username,
          timestamp: new Date(),
          userId: user.uid,
          reportedBy: [],
        };

        const updatedComments = currentImage.comments ? [...currentImage.comments, newCommentObj] : [newCommentObj];

        imagesArray[index] = {
          ...currentImage,
          comments: updatedComments,
        };

        await updateDoc(imageDocRef, {
          images: imagesArray,
        });

        // Create or update the notification document
        const notificationsRef = doc(db, 'notifications', docId); // Notification collection per image
        const notification = {
          file: 'image',
          type: 'comment',
          commenter: username,
          comment: newComment,
          postContent: imageName,
          timestamp: new Date(),
          note: `${username} commented on your image "${imageName}"`,
          userId: user.uid,
          docId: docId, // Add docId
          index: index, // Add index
          likeCount: likeCount,
          imageUrl: imageUrl,
          imageName: imageName,
          views: views,
          imagePrice: imagePrice,
          imageType: imageType,
          imageUsername: imageUsername,
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
      const message = `Report: Under the image "${imageName}" by ${imageUsername}, a comment saying "${comment.comment}" was reported. The owner of the comment is ${comment.commentedBy} and it was reported by ${reporterUsername}.`;
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

      const imageDocRef = doc(db, 'images', docId);
      const imageDocSnap = await getDoc(imageDocRef);

      if (imageDocSnap.exists()) {
        const data = imageDocSnap.data();
        const imagesArray = data.images;
        const currentImage = imagesArray[index];

        const updatedComments = currentImage.comments.map((c, idx) =>
          idx === commentIdx ? { ...c, reportedBy: [...c.reportedBy, user.uid] } : c
        );

        imagesArray[index] = {
          ...currentImage,
          comments: updatedComments,
        };

        await updateDoc(imageDocRef, {
          images: imagesArray,
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
      const imageDocRef = doc(db, 'images', docId);
      const imageDocSnap = await getDoc(imageDocRef);

      if (imageDocSnap.exists()) {
        const data = imageDocSnap.data();
        const imagesArray = data.images;
        const currentImage = imagesArray[index];

        const updatedComments = currentImage.comments.filter((_, idx) => idx !== commentIdx);

        imagesArray[index] = {
          ...currentImage,
          comments: updatedComments,
        };

        await updateDoc(imageDocRef, {
          images: imagesArray,
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

  const handleImageClick = async () => {
    setIsDialogVisible(true); 
    const user = auth.currentUser;
  
    if (!user) {
      alert("You must be signed in to view images!");
      return;
    }
  
    try {
      const imageDocRef = doc(db, 'images', docId);
      const imageDocSnap = await getDoc(imageDocRef);
  
      if (imageDocSnap.exists()) {
        const imageData = imageDocSnap.data();
        const imagesArray = imageData.images;
        const currentImage = imagesArray[index];
        const viewedBy = currentImage.viewedBy || [];
  
        if (viewedBy.includes(user.uid)) {
          if (imagePrice === 0) {
            setDialogMessage('');
            setShowImage(true); // Show image
            setIsDialogVisible(true);
            setTimeout(() => {
              setIsDialogVisible(false);
            }, 5000); // 5 seconds timer for free images
          } else if (isNaN(imagePrice)) {
            setDialogMessage('...Image is Loading...');
            setShowImage(false); // Hide image
            setTimeout(() => {
              setIsDialogVisible(false);
            }, 2000); // 2 seconds timer for paid images
          } else {
            setDialogMessage('Image is For Sale, You have already viewed it');
            setShowImage(false); // Hide image
            setTimeout(() => {
              setIsDialogVisible(false);
            }, 2000); // 2 seconds timer for paid images
          }
        } else {
          const updatedImages = [...imagesArray];
          updatedImages[index] = {
            ...updatedImages[index],
            views: (currentImage.views || 0) + 1,
            viewedBy: [...viewedBy, user.uid], // Update viewedBy array manually
          };
          // Update view count and viewedBy array
          await updateDoc(imageDocRef, {
            images: updatedImages,
          });

          if (imagePrice === 0) {
            setDialogMessage('');
            setShowImage(true); // Show image
            setIsDialogVisible(true);
            setTimeout(() => {
              setIsDialogVisible(false);
            }, 5000); // 5 seconds timer for free images
          } else {
            setDialogMessage('');
            setShowImage(true); // Show image
          }
          setIsDialogVisible(true);

          // Hide the dialog box after 2.5 seconds
          setTimeout(() => {
            setIsDialogVisible(false);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error updating view count:', error);
      setDialogMessage('Error updating view count');
      setShowImage(false); // Hide image
      setIsDialogVisible(true);

      // Hide the dialog box after 2.5 seconds
      setTimeout(() => {
        setIsDialogVisible(false);
      }, 500);
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

  return (
    <>
    <div className="view-image-containerr">
      <div className="image-details">
        <img src={imageUrl} alt={imageName} className="view-image" />
        <div className="view-image-blocker">Click View to View Image</div>
        <button className="pre-view-image" onClick={handleImageClick} >View</button>
        {isDialogVisible && (
        <div className="viewing-image-dialog-box">
          {showImage ? (
            <img src={imageUrl} alt={imageName} className="viewed-image" />
          ) : (
            <p>{dialogMessage}</p>
          )}
        </div>
      )}
      
      <div className="details-section">
          <h2 onClick={handleBackClick}>{imageName}</h2>
          <p><strong>Uploaded by:</strong> {imageUsername}</p>
          <p><strong>Type:</strong> {imageType}</p>
          <p><strong>Price:</strong> ${imagePrice}</p>
          <p><strong>Likes:</strong> {likeCount}</p>
          <p><strong>Views:</strong> {views}</p> {/* Display view count */}
          <p><strong>Date:</strong> {formattedDate}</p>
          <p><strong>Creator Status:</strong> {creatorStatus}</p>
        </div>
        </div>
      </div>

      <div className="comments-section jpl">
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
          <button onClick={handleCommentSubmit}>Comment</button>
        </div>
      </>
  );
};

export default ViewImage;

