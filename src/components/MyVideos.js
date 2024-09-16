import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import likeIcon from '../assets/icons/like-icon.png';
import likedIcon from '../assets/icons/liked-icon.png';
import downloadIcon from '../assets/icons/download-icon.png';
import dotsIcon from '../assets/icons/dots-icon.png';
import './VideoSection1.css';

const MyVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(null);
  const [userUid, setUserUid] = useState(null);

  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserVideos = async (user) => {
      if (user) {
        try {
          setUserUid(user.uid);

          // Fetch the user's videos document
          const videoRef = doc(db, 'videos', user.uid);
          const videoDoc = await getDoc(videoRef);

          if (videoDoc.exists()) {
            const videoData = videoDoc.data();
            const allVideos = [];
            if (videoData.videos && Array.isArray(videoData.videos)) {
              videoData.videos.forEach((video, idx) => {
                const uniqueId = user.uid + '-' + idx;
                const isLiked = video.likedBy?.includes(user.uid) || false;
                allVideos.push({
                    id: uniqueId,
                    docId: videoRef.id,
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
                  ownerId: video.ownerId || null,
                });
              });

              // Sort videos by timestamp, most recent first
              allVideos.sort((a, b) => {
                const dateA = a.timestamp ? a.timestamp.getTime() : 0;
                const dateB = b.timestamp ? b.timestamp.getTime() : 0;
                return dateB - dateA;
              });

              setVideos(allVideos);
            } else {
              setVideos([]);
            }
          } else {
            setVideos([]);
          }
        } catch (error) {
          console.error("Error fetching videos:", error);
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
        fetchUserVideos(user);
      } else {
        setLoading(false);
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, db, navigate]);

  const handleLike = async (video, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to like videos!");
      return;
    }

    try {
      const videoDocRef = doc(db, 'videos', user.uid);
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

          // Fetch the post owner's user ID
          const postOwnerUid = video.ownerId;

          const content = currentVideo.videoUrl;

          // Create notification object with docId and index
          const notification = {
            video: content,
            timestamp: new Date(),
            username: username,
            likecount: updatedLikeCount,
            note: `${username} liked your video"${content}"`,
            docId: user.uid,
            index: video.index,
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
          prevVideos.map((i) => (i.id === video.id ? { ...i, likeCount: updatedLikeCount, isLiked: likedBy.includes(user.uid) } : i))
        );
      }
    } catch (error) {
      console.error('Error updating like count:', error);
    }
  };

  const handleDelete = async (video, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to delete videos!");
      return;
    }

    try {
      const videoDocRef = doc(db, 'videos', user.uid);
      const videoDocSnap = await getDoc(videoDocRef);

      if (videoDocSnap.exists()) {
        const docData = videoDocSnap.data();
        const videosArray = docData.videos;
        // Remove the video from the array
        videosArray.splice(video.index, 1);

        await updateDoc(videoDocRef, {
          videos: videosArray,
        });

        // Update the state with the new videos
        setVideos((prevVideos) => prevVideos.filter((i) => i.id !== video.id));

        // Get the current user document
        const userDoc = await getDoc(doc(db, 'users', userUid));
        const userData = userDoc.data();

        // decrement the value by 1
        const newVideosValue = (userData.videos || 0) - 1;

        // Update the user document with the new value
        await updateDoc(doc(db, 'users', userUid), { videos: newVideosValue });

        // Delete the video from Firebase Storage
      const storage = getStorage();

      const thumbnailRef = ref(storage, `${user.email}/thumbnails/${video.videoName}`);
      await deleteObject(thumbnailRef).then(() => {
        console.log('thumbnail deleted from Firebase Storage');
      }).catch((error) => {
        console.error('Error deleting thumbnail from Firebase Storage:', error);
      });

      const videoRef = ref(storage, `${user.email}/videos/${video.videoName}`);
            await deleteObject(videoRef).then(() => {
              console.log('video deleted from Firebase Storage');
            }).catch((error) => {
              console.error('Error deleting video from Firebase Storage:', error);
            });

        // finished
      }
    } catch (error) {
      console.error('Error deleting video:', error);
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
        await setDoc(cartRef, {
          videos: [video],
        });
      } else {
        const cartData = cartDocSnap.data();
        const videosArray = cartData.videos || [];
        videosArray.push(video);
        await updateDoc(cartRef, {
          videos: videosArray,
        });
      }

      alert('Video added to cart successfully!');
    } catch (error) {
      console.error('Error adding video to cart:', error);
      alert('Video added to cart failed!');
    }
  };

  const handleMenuClick = (videoId, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    setMenuVisible(menuVisible === videoId ? null : videoId);
  };

  const handleVideoClick = (video) => {
    console.log('Video clicked');
    const videoUsername = video.videoUsername

    navigate('/viewvideo', {
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

  return (
    <div className="my-video-section push-down">
      {videos.length > 0 ? (
        videos.map((video, index) => (
          <div key={index} className="video-card" onClick={() => handleVideoClick(video)}>

            <div className="video-actions">
            <div>-{video.videoUsername}</div>
              <div className="dots-menu">
                <img
                  src={dotsIcon}
                  alt="More options"
                  className="r-action-icon"
                  onClick={(e) => handleMenuClick(video.id, e)}
                />
                {menuVisible === video.id && (
                  <div className="menu">
                    <button className="menu-item" onClick={(e) => handleDelete(video, e)}>Delete</button>
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
            <div className="video-name-t"><strong>Type:</strong> {video.videoType}</div>
            <div className="video-name-t"><strong>Price:</strong> ${video.videoPrice}</div>
            <div className="video-name-t"><strong>Note:</strong> {video.creatorStatus}</div>
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
          <div>No Videos available, Try Uploading</div>
        </div>
      )}
    </div>
  );
};

export default MyVideos;