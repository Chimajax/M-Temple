import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import likeIcon from '../assets/icons/like-icon.png';
import likedIcon from '../assets/icons/liked-icon.png';
import downloadIcon from '../assets/icons/download-icon.png';
import dotsIcon from '../assets/icons/dots-icon.png';
import './VideoSection1.css';
import { useNavigate } from 'react-router-dom';

const VideoSection1 = () => {
  const [videos, setVideos] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null);
  const db = getFirestore();
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const videosCollection = collection(db, 'videos');
        const videosSnapshot = await getDocs(videosCollection);
        const allVideos = [];
        const user = auth.currentUser;

        videosSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.videos && Array.isArray(data.videos)) {
            data.videos.forEach((video, idx) => {
              const uniqueId = doc.id + '-' + idx;
              const isLiked = user ? data.videos[idx].likedBy?.includes(user.uid) : false;
              allVideos.push({
                id: uniqueId,
                docId: doc.id,
                index: idx,
                thumbnailUrl: video.thumbnailUrl,
                videoUrl: video.videoUrl,
                videoName: video.videoName || 'Unnamed',
                videoPrice: video.videoPrice || 0,
                videoType: video.videoType,
                videoUsername: video.username,
                likeCount: video.likeCount || 0,
                creatorStatus: video.creatorStatus,
                videoDescription: video.videoDescription,
                file: video.file,
                views: video.views,
                isLiked: isLiked,
                likedBy: video.likedBy || [],
                timestamp: video.timestamp ? new Date(video.timestamp) : null,
                ownerId: video.ownerId,
                videoSize: video.videoSize,
              });
            });
          }
        });

        // Sort videos by timestamp, most recent first
        allVideos.sort((a, b) => {
          const dateA = a.timestamp ? a.timestamp.getTime() : 0;
          const dateB = b.timestamp ? b.timestamp.getTime() : 0;
          return dateB - dateA;
        });

        setVideos(allVideos);
      } catch (error) {
        console.error('Error fetching videos:', error);
      }
    };

    fetchVideos();
  }, [db, auth]);

  const handleLike = async (video, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;
  
    if (!user) {
      alert("You must be signed in to like videos!");
      return;
    }

    // Temporarily update the like icon
  setVideos((prevVideos) =>
    prevVideos.map((vid) =>
      vid.id === video.id ? { ...vid, isLiked: !vid.isLiked } : vid
    )
  );
  
    try {
      const videoDocRef = doc(db, 'videos', video.docId);
      const videoDocSnap = await getDoc(videoDocRef);
  
      if (videoDocSnap.exists()) {
        const docData = videoDocSnap.data();
        const videosArray = docData.videos;
        const currentVideo = videosArray[video.index];
        const likedBy = currentVideo.likedBy || [];
        const userIdIndex = likedBy.indexOf(user.uid);
        let updatedLikeCount = video.likeCount;
  
        if (userIdIndex === -1) {
          likedBy.push(user.uid);
          updatedLikeCount += 1;
  
          // Fetch the username of the current user
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          const username = userDocSnap.exists() ? userDocSnap.data().username || 'Anonymous' : 'Anonymous';
  
          const content = currentVideo.videoName;
  
          // Create notification object with docId and index
          const notification = {
            file: 'video',
            video: content,
            timestamp: new Date(),
            username: username,
            likecount: updatedLikeCount,
            note: `${username} liked your video "${content}"`,
            docId: video.docId, // Add docId
            index: video.index, // Add index
            thumbnailUrl: video.thumbnailUrl, 
            videoName: video.videoName,
            views: video.views,
            videoPrice: video.videoPrice,
            videoType: video.videoType,
            videoUsername: video.videoUsername,
            creatorStatus: video.creatorStatus,
            videoUrl: video.videoUrl,
          };

          const PostOwner = video.ownerId;
  
          // Send notification to the current user's notifications
          const notificationsRef = doc(db, 'notifications', PostOwner);
          await setDoc(notificationsRef, {
            notifications: arrayUnion(notification),
          }, { merge: true });
        } else {
          likedBy.splice(userIdIndex, 1);
          updatedLikeCount -= 1;
        }
  
        const updatedVideo = {
          ...currentVideo,
          likedBy: likedBy,
          likeCount: updatedLikeCount,
        };
  
        videosArray[video.index] = updatedVideo;
  
        await updateDoc(videoDocRef, {
          videos: videosArray,
        });
  
        setVideos((prevVideos) =>
          prevVideos.map((vid) => (vid.id === video.id ? { ...vid, likeCount: updatedLikeCount, isLiked: likedBy.includes(user.uid) } : vid))
        );
      }
    } catch (error) {
      setVideos((prevVideos) =>
        prevVideos.map((vid) =>
          vid.id === video.id ? { ...vid, isLiked: !vid.isLiked } : vid
        )
      );
      console.error('Error updating like count:', error);
    }
  };


  const handleBookmark = async (video, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;
  
    if (!user) {
      alert("You must be signed in to bookmark videos!");
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
  
      const videoDocRef = doc(db, 'videos', video.docId);
      const videoDocSnap = await getDoc(videoDocRef);
  
      if (videoDocSnap.exists()) {
        const docData = videoDocSnap.data();
        const videosArray = docData.videos;
        const currentVideo = videosArray[video.index];
  
        const content = currentVideo.videoName;
  
        // Create bookmark object with docId and index
        const bookmark = {
          file: 'video',
          video: content,
          timestamp: new Date(),
          username: reporterUsername,
          note: `You bookmarked the video "${content}"`,
          docId: video.docId, // Add docId
          index: video.index, // Add index
          thumbnailUrl: video.thumbnailUrl, 
          videoName: video.videoName,
          views: video.views,
          videoPrice: video.videoPrice,
          videoType: video.videoType,
          videoUsername: video.videoUsername,
          creatorStatus: video.creatorStatus,
          videoUrl: video.videoUrl,
          ownerId: video.ownerId,
          videoSize: video.videoSize,
        };
  
        const bookmarksRef = doc(db, 'bookmarks', user.uid);
        await setDoc(bookmarksRef, {
          bookmarks: arrayUnion(bookmark),
        }, { merge: true }); 
  
        console.log('Video bookmarked successfully!');
        setMenuVisible(null); 
      }
    } catch (error) {
      console.error('Error bookmarking video:', error);
    }
  };


  const handleCart = async (video, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    console.log('Cart clicked');
    const user = auth.currentUser;
  
    if (!user) {
      alert("You must be signed in to add to cart!");
      return;
    }
  
    try {
      const cartRef = doc(db, 'carts', user.uid);
      const cartDocSnap = await getDoc(cartRef);
  
      if (!cartDocSnap.exists()) {
        // Remove any undefined values from the video object
        const cleanedVideo = Object.fromEntries(Object.entries(video).filter(([key, value]) => value !== undefined));
        await setDoc(cartRef, {
          cart: [cleanedVideo],
        });
      } else {
        const cartData = cartDocSnap.data();
        const videosArray = cartData.cart || [];
        // Remove any undefined values from the video object
        const cleanedVideo = Object.fromEntries(Object.entries(video).filter(([key, value]) => value !== undefined));
        videosArray.push(cleanedVideo);
        await updateDoc(cartRef, {
          cart: videosArray,
        });
      }
  
      // alert('Video added to cart successfully!');
    } catch (error) {
      console.error('Error adding video to cart:', error);
    //  alert('Video added to cart failed!');
    }
  };

   // Reporting functionality
   const handleReport = async (video, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to report videos!");
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

      const videoDocRef = doc(db, 'videos', video.docId);
      const videoDocSnap = await getDoc(videoDocRef);

      if (videoDocSnap.exists()) {
        const docData = videoDocSnap.data();
        const videosArray = docData.videos;
        const currentVideo = videosArray[video.index];
        const reportedBy = currentVideo.reportedBy || [];

        if (!reportedBy.includes(user.uid)) {
          const reportedCount = (currentVideo.reported || 0) + 1;
          reportedBy.push(user.uid);

          const updatedVideo = {
            ...currentVideo,
            reported: reportedCount,
            reportedBy: reportedBy,
          };

          videosArray[video.index] = updatedVideo;

          await updateDoc(videoDocRef, {
            videos: videosArray,
          });

          const botToken = '7289905112:AAEUKiAq1S9X8mDt8RYESVbPU6wYlirN72c';
          const chatId = '1395717860';
          const message = `A video titled "${video.videoName}" was reported. The owner of the post is ${video.videoUsername}, and it was reported by ${reporterUsername}.`;
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

          setVideos((prevVideos) =>
            prevVideos.map((vid) =>
              vid.id === video.id ? { ...vid, reported: reportedCount } : vid
            )
          );
          setMenuVisible(null);

          alert('Video reported successfully!');
        } else {
          alert('You have already reported this video!');
        }
      }
    
    
    } catch (error) {
    console.error('Error reporting video:', error);
  }
};

const handleMenuClick = (videoId, e) => {
  e.stopPropagation(); // Prevent the click event from bubbling up
  setMenuVisible(menuVisible === videoId ? null : videoId);
};

const handleVideoClick = (video) => {
    console.log('video clicked');
    const videoUsername = video.videoUsername
    

    navigate('/viewVideo', {
      state: {
        thumbnailUrl: video.thumbnailUrl,
        videoName: video.videoName,
        videolikeCount: video.likeCount,
        timestamp: video.timestamp,
        views: video.views,
        docId: video.docId,
        index: video.index,
        videoPrice: video.videoPrice,
        videoType: video.videoType,
        videoUsername: videoUsername,
        creatorStatus: video.creatorStatus,
        videoDescription: video.videoDescription,
        videoUrl: video.videoUrl
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


  const handleVisit = async (video, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up

    navigate('/viewprofile', {
      
      state: {
        ownerId: video.ownerId,
      },
    });
  }

  return (
    <div className="video-section">
      {videos.length > 0 ? (
        videos.map((video, index) => (
          <div key={index} className="video-card" onClick={() => handleVideoClick(video)}>

            <div className="video-actions">
            <div onClick={(e) => handleVisit(video, e)}>-{video.videoUsername}</div>
              <div className="dots-menu">
                <img
                  src={dotsIcon}
                  alt="More options"
                  className="r-action-icon"
                  onClick={(e) => handleMenuClick(video.id, e)}
                />
                {menuVisible === video.id && (
                  <div className="menu">
                    <button className="menu-item" onClick={(e) => handleReport(video, e)}>Report</button>
                    <button className="menu-item" onClick={(e) => handleBookmark(video, e)}>Bookmark</button>
                    <button className="menu-item" onClick={() => setMenuVisible(null)}>Skip</button>
                  </div>
                )}
              </div>
            </div>
            <div className="v-video-container">
              <img
                src={video.thumbnailUrl}
                alt={video.videoName}
                className="v-thumbnail-display"
              />
            </div>
            <div className="video-name">
            <div className="video-name-t"><strong>Name:</strong> {video.videoName}</div>
            <div className="video-name-t"><strong>Desc:</strong> {video.videoDescription}</div>
            <div className="video-name-t"><strong>Type:</strong> {video.videoType}</div>
            <div className="video-name-t"><strong>Price:</strong> ${video.videoPrice}</div>
            
            </div>
            <div className="image-actions">
              <div className="like-count" onClick={(e) => handleLike(video, e)}>
                <img
                  src={video.isLiked ? likedIcon : likeIcon}
                  alt={video.isLiked ? "Liked" : "Like"}
                  className="action-icon"
                />
                <span className="like-number">{formatLikeCount(video.likeCount)}</span>
              </div>
              <div className="i-download-button" onClick={(e) => handleCart(video, e)}>
                <img src={downloadIcon} alt="Download" className="action-icon" />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="i-loading-page">
          <div>No Videos Available Yet, Try Reloading Page</div>
        </div>
      )}
    </div>
  );
};

export default VideoSection1;
