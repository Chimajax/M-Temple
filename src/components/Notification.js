import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import './Notification.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const user = auth.currentUser;
  
        if (!user) {
          return;
        }
  
        const notificationsDocRef = doc(db, 'notifications', user.uid);
        const notificationsDocSnap = await getDoc(notificationsDocRef);
  
        if (!notificationsDocSnap.exists()) {
          alert('No notifications found in Firestore.');
          return;
        }
  
        const notificationsData = notificationsDocSnap.data().notifications || [];
  
        const userNotifications = await Promise.all(
          notificationsData.map(async (notification, index) => {
            if (!notification || !notification.docId || notification.index === NaN ) {
              console.error(`Notification data is missing required fields: ${JSON.stringify(notification)}`);
              return null;
            }
  
            const postDocRef = doc(db, 'quotes', notification.docId);
            const postDocSnap = await getDoc(postDocRef);
  
            if (postDocSnap.exists()) {
              const postData = postDocSnap.data();
              const quotesArray = postData.quotes || [];
          
  
              return {
                id: index.toString(),
                senderUsername: notification.senderUsername || 'Anonymous',
                content: notification.content || 'No content',
                timestamp: notification.timestamp ? new Date(notification.timestamp.toDate()) : new Date(),
                note: notification.note,
                docId: notification.docId,
                index: notification.index, // Keep this field, but don't check for validity
                quote: quotesArray[notification.index] ? quotesArray[notification.index].quote || '' : '',
                username: quotesArray[notification.index] ? quotesArray[notification.index].username || 'Anonymous' : '',
                likeCount: quotesArray[notification.index] ? quotesArray[notification.index].likeCount || notification.likeCount || '(...Loading...)' : '(...Loading...)',
                file: notification.file || 'post', // Assume 'post' if not specified
                imageUrl: notification.imageUrl,
                imageName: notification.imageName || '...Loading...',
                views: notification.views || '...Loading...',
                imagePrice: notification.imagePrice || '(...Loading...)',
                imageType: notification.imageType || '...Loading...',
                imageUsername: notification.imageUsername || '...Loading....',
                creatorStatus: notification.creatorStatus || '...Loading...',
                // this is for video
                  video: notification.videoUrl,
                  videoName: notification.videoName,
                  videoPrice: notification.videoPrice,
                  videoType: notification.videoType,
                  videoUsername: notification.videoUsername,
                //this is for ebook
                  ebook: notification.ebookUrl,
                  elikeCount: notification.elikecount,
                  ebookName: notification.ebookName,
                  ebookPrice: notification.ebookPrice,
                  ebookType: notification.ebookType,
                  ebookUsername: notification.ebookUsername,
                  // for follower
                  ownerId: notification.followerId

              };
            } else {
              console.error(`Post document not found for docId ${notification.docId}`);
            }
  
            return null;
          })
        );
  
        const validNotifications = userNotifications.filter((n) => n !== null);
        validNotifications.sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(validNotifications);
      } catch (error) {
        alert(`Error fetching notifications: ${error.message}`);
      }
    };
  
    fetchNotifications();
  }, [auth, db]);
  
  const handleNotificationClick = (notification) => {
    const { docId, index, quote, username, likeCount, timestamp, file, imageUrl, imageName, views, imagePrice, imageType, imageUsername, creatorStatus,
      video, videoName, videoPrice, videoType, videoUsername,
      ebook, ebookName, ebookPrice, ebookType, ebookUsername, elikeCount, ownerId
      } = notification;

    if (file === 'image') {
      navigate('/viewimage', {
        state: {
          docId: docId,
          index: index,
          quote: quote,
          timestamp: timestamp,
          username: username,
          likeCount: likeCount,
          imageUrl: imageUrl,
          imageName: imageName,
          views: views,
          imagePrice: imagePrice,
          imageType: imageType,
          imageUsername: imageUsername,
          creatorStatus: creatorStatus,
        },
      });
    } else if (file === 'video') {
      navigate('/viewvideo', {
        state: {
          docId: docId,
          index: index,
          quote: quote,
          timestamp: timestamp,
          username: username,
          videolikeCount: likeCount,
          videoUrl: video,
          videoName: videoName,
          views: views,
          videoPrice: videoPrice,
          videoType: videoType,
          videoUsername: videoUsername,
          creatorStatus: creatorStatus,
        },
      }); }else if (file === 'ebook') {
      navigate('/viewebook', {
        state: {
          docId: docId,
          index: index,
          quote: quote,
          timestamp: timestamp,
          username: username,
          ebooklikeCount: elikeCount,
          ebookUrl: ebook,
          ebookName: ebookName,
          views: views,
          ebookPrice: ebookPrice,
          ebookType: ebookType,
          ebookUsername: ebookUsername,
          creatorStatus: creatorStatus,
        },
      }); } else if (file === 'follower') {
        navigate('/viewprofile', {
          state: {
        ownerId: notification.ownerId
          },
        }); } else {
      navigate('/viewpost', {
        state: {
          docId: docId,
          index: index,
          quote: quote,
          timestamp: timestamp,
          username: username,
          likeCount: likeCount,
        },
      });
    }
  };

  return (
    <>
      <Header />
      <div className="notification-content">
        <div className="notification-section">
          {notifications.length > 0 ? (
            notifications.map((notification, idx) => (
              <div
                key={idx}
                onClick={() => handleNotificationClick(notification)}
                className="notification-card"
              >
                <p>
                  <strong>{notification.note}</strong>
                </p>
                <span className="notification-timestamp">
                  Time: {notification.timestamp ? notification.timestamp.toLocaleString() : 'Just now'}
                </span>
              </div>
            ))
          ) : (
            <div className="notification-loading">
              No notifications available now
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Notification;
