import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import likeIcon from '../assets/icons/like-icon.png';
import likedIcon from '../assets/icons/liked-icon.png';
import downloadIcon from '../assets/icons/download-icon.png';
import dotsIcon from '../assets/icons/dots-icon.png';
import './BookSlider.css';
import { useNavigate } from 'react-router-dom';

const BookSlider = () => {
  const [ebooks, setEbooks] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null);
  const db = getFirestore();
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEbooks = async () => {
      try {
        const ebooksCollection = collection(db, 'ebooks');
        const ebooksSnapshot = await getDocs(ebooksCollection);
        const allEbooks = [];
        const user = auth.currentUser;

        ebooksSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.ebooks && Array.isArray(data.ebooks)) {
            data.ebooks.forEach((ebook, idx) => {
              const uniqueId = doc.id + '-' + idx;
              const isLiked = user ? data.ebooks[idx].likedBy?.includes(user.uid) : false;
              allEbooks.push({
                id: uniqueId,
                docId: doc.id,
                index: idx,
                coverUrl: ebook.coverUrl,
                ebookUrl: ebook.ebookUrl,
                ebookName: ebook.ebookName || 'Unnamed',
                ebookPrice: ebook.ebookPrice || '',
                ebookType: ebook.ebookType,
                ebookUsername: ebook.username || '(name)',
                likeCount: ebook.likeCount || 0,
                creatorStatus: ebook.creatorStatus,
                ebookDescription: ebook.ebookDescription,
                file: ebook.file || 'ebook',
                views: ebook.views,
                isLiked: isLiked,
                likedBy: ebook.likedBy || [],
                timestamp: ebook.timestamp ? new Date(ebook.timestamp) : null,
                ownerid: ebook.ownerid,
                ebookSize: ebook.ebookSize,
              });
            });
          }
        });

        // Sort videos by timestamp, most recent first
        allEbooks.sort((a, b) => {
          const dateA = a.timestamp ? a.timestamp.getTime() : 0;
          const dateB = b.timestamp ? b.timestamp.getTime() : 0;
          return dateB - dateA;
        });

        setEbooks(allEbooks);
      } catch (error) {
        console.error('Error fetching ebooks:', error);
      }
    };

    fetchEbooks();
  }, [db, auth]);

  const handleLike = async (ebook, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;
  
    if (!user) {
     // alert("You must be signed in to like ebooks!");
      return;
    }

     // Temporarily update the like icon
  setEbooks((prevEbooks) =>
    prevEbooks.map((eid) =>
      eid.id === ebook.id ? { ...eid, isLiked: !eid.isLiked } : eid
    )
  );
  
    try {
      const ebookDocRef = doc(db, 'ebooks', ebook.docId);
      const ebookDocSnap = await getDoc(ebookDocRef);
      const bookOwnerUid = ebook.ownerid; 
  
      if (ebookDocSnap.exists()) {
        const docData = ebookDocSnap.data();
        const ebooksArray = docData.ebooks;
        const currentEbook = ebooksArray[ebook.index];
        const likedBy = currentEbook.likedBy || [];
        const userIdIndex = likedBy ? likedBy.indexOf(user.uid) : -1;
        let updatedLikeCount = ebook.likeCount;
  
        if (userIdIndex === -1) { 
          likedBy.push(user.uid);
          updatedLikeCount += 1;
  
          // Fetch the username of the current user
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          const username = userDocSnap.exists() ? userDocSnap.data().username || 'Anonymous' : 'Anonymous';
  
          const content = currentEbook.ebookName;
  
          // Create notification object with docId and index
          const notification = {
            file: 'ebook',
            ebook: content,
            timestamp: new Date(),
            username: username,
            elikecount: updatedLikeCount,
            note: `${username} liked your ebook "${content}"`,
            docId: ebook.docId, // Add docId
            index: ebook.index, // Add index
            coverUrl: ebook.coverUrl, 
            ebookName: ebook.ebookName,
            views: ebook.views,
            ebookPrice: ebook.ebookPrice,
            ebookType: ebook.ebookType,
            ebookUsername: ebook.ebookUsername,
            creatorStatus: ebook.creatorStatus,
            ebookUrl: ebook.ebookUrl
          };
  
          // Send notification to the owner user's notifications
          const notificationsRef = doc(db, 'notifications', bookOwnerUid);
          await setDoc(notificationsRef, {
            notifications: arrayUnion(notification),
          }, { merge: true });
        } else {
          likedBy.splice(userIdIndex, 1);
          updatedLikeCount -= 1;
        }
  
        const updatedEbook = {
          ...currentEbook,
          likedBy: likedBy,
          likeCount: updatedLikeCount,
        };
  
        ebooksArray[ebook.index] = updatedEbook;
  
        await updateDoc(ebookDocRef, {
          ebooks: ebooksArray,
        });
  
        setEbooks((prevEbooks) =>
          prevEbooks.map((eid) => (eid.id === ebook.id ? { ...eid, likeCount: updatedLikeCount, isLiked: likedBy.includes(user.uid) } : eid))
        );
      }
    } catch (error) {
      setEbooks((prevEbooks) =>
        prevEbooks.map((eid) =>
          eid.id === ebook.id ? { ...eid, isLiked: !eid.isLiked } : eid
        )
      );
      console.error('Error updating like count:', error);
    }
  };


  const handleBookmark = async (ebook, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;
  
    if (!user) {
     // alert("You must be signed in to bookmark ebooks!");
      return;
    }
  
    try {
      const bookmarksRef = doc(db, 'bookmarks', user.uid);
      const bookmarksDocSnap = await getDoc(bookmarksRef);
  
      if (!bookmarksDocSnap.exists()) {
       // const cleanedEbook = Object.fromEntries(Object.entries(ebook).filter(([key, value]) => value !== undefined));
        await setDoc(bookmarksRef, {
          bookmarks: [],
        });
      } 
  
      // Create a notification object with docId and index
      const content = ebook.ebookName;
      
      const notification = {
        file: 'ebook',
        ebook: content,
        timestamp: new Date(),
        username: user.displayName || 'Anonymous',
        note: `You Bookmarked the ebook "${content}"`,
        docId: ebook.docId, // Add docId
        index: ebook.index, // Add index
        coverUrl: ebook.coverUrl,
        ebookName: ebook.ebookName,
        views: ebook.views,
        ebookPrice: ebook.ebookPrice,
        ebookType: ebook.ebookType,
        ebookUsername: ebook.ebookUsername,
        creatorStatus: ebook.creatorStatus,
        ebookUrl: ebook.ebookUrl,
        ownerid: ebook.ownerid,
        ebookSize: ebook.ebookSize,
      };
  
      // Send notification to the user's bookmarks
      await setDoc(bookmarksRef, {
        bookmarks: arrayUnion(notification),
      }, { merge: true });
      
      setMenuVisible(null);
      console.log('ebook bookmarked successfully!');
    } catch (error) {
      console.error('Error bookmarking ebook:', error);
    }
  };

  const handleCart = async (ebook, e) => {
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
        const cleanedEbook = Object.fromEntries(Object.entries(ebook).filter(([key, value]) => value !== undefined));
        await setDoc(cartRef, {
          cart: [cleanedEbook],
        });
      } else {
        const cartData = cartDocSnap.data();
        const ebooksArray = cartData.cart || [];
        // Remove any undefined values from the video object
        const cleanedEbook = Object.fromEntries(Object.entries(ebook).filter(([key, value]) => value !== undefined));
        ebooksArray.push(cleanedEbook);
        await updateDoc(cartRef, {
          cart: ebooksArray,
        });
      }
  
     // alert('ebook added to cart successfully!');
     console.log('added to cart')
    } catch (error) {
      console.error('Error adding ebook to cart:', error);
    //  alert('ebook added to cart failed!');
    }
  };

   // Reporting functionality
   const handleReport = async (ebook, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
     // alert("You must be signed in to report ebooks!");
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

      const ebookDocRef = doc(db, 'ebooks', ebook.docId);
      const ebookDocSnap = await getDoc(ebookDocRef);

      if (ebookDocSnap.exists()) {
        const docData = ebookDocSnap.data();
        const ebooksArray = docData.ebooks;
        const currentEbook = ebooksArray[ebook.index];
        const reportedBy = currentEbook.reportedBy || [];

        if (!reportedBy.includes(user.uid)) {
          const reportedCount = (currentEbook.reported || 0) + 1;
          reportedBy.push(user.uid);

          const updatedEbook = {
            ...currentEbook,
            reported: reportedCount,
            reportedBy: reportedBy,
          };

          ebooksArray[ebook.index] = updatedEbook;

          await updateDoc(ebookDocRef, {
            ebooks: ebooksArray,
          });

          const botToken = '7289905112:AAEUKiAq1S9X8mDt8RYESVbPU6wYlirN72c';
          const chatId = '1395717860';
          const message = `An ebook titled "${ebook.ebookName}" was reported. The owner of the post is ${ebook.ebookUsername}, and it was reported by ${reporterUsername}.`;
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

          setEbooks((prevEbooks) =>
            prevEbooks.map((eid) =>
              eid.id === ebook.id ? { ...eid, reported: reportedCount } : eid
            )
          );
          setMenuVisible(null);

          console.log('ebook reported successfully!');
        } else {
          console.log('You have already reported this ebook!');
        }
      }
    
    
    } catch (error) {
    console.error('Error reporting ebook:', error);
  }
};

const handleMenuClick = (ebookId, e) => {
  e.stopPropagation(); // Prevent the click event from bubbling up
  setMenuVisible(menuVisible === ebookId ? null : ebookId);
};

const handleEbookClick = (ebook) => {
    console.log('ebook clicked');
    const ebookUsername = ebook.ebookUsername
    

    navigate('/viewEbook', {
      state: {
        coverUrl: ebook.coverUrl,
        ebookName: ebook.ebookName,
        ebooklikeCount: ebook.likeCount,
        timestamp: ebook.timestamp,
        views: ebook.views,
        docId: ebook.docId,
        index: ebook.index,
        ebookPrice: ebook.ebookPrice,
        ebookType: ebook.ebookType,
        ebookUsername: ebookUsername,
        creatorStatus: ebook.creatorStatus,
        ebookDescription: ebook.ebookDescription,
        ebookUrl: ebook.ebookUrl
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


  const handleVisit = async (ebook, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up

    navigate('/viewprofile', {
      
      state: {
        ownerId: ebook.ownerId,
      },
    });
  }

  return (
    <div className="book-slider">
      {ebooks.length > 0 ? (
        ebooks.map((ebook, index) => (
          <div key={index} className="book-placeholder" onClick={() => handleEbookClick(ebook)}>

            <div className="ebook-actions">
            <div onClick={(e) => handleVisit(ebook, e)}>-{ebook.ebookUsername}</div>
              <div className="dots-menu">
                <img
                  src={dotsIcon}
                  alt="More options"
                  className="r-action-icon"
                  onClick={(e) => handleMenuClick(ebook.id, e)}
                />
                {menuVisible === ebook.id && (
                  <div className="menu">
                    <button className="menu-item" onClick={(e) => handleReport(ebook, e)}>Report</button>
                    <button className="menu-item" onClick={(e) => handleBookmark(ebook, e)}>Bookmark</button>
                    <button className="menu-item" onClick={() => setMenuVisible(null)}>Skip</button>
                  </div>
                )}
              </div>
            </div>
            <div className="v-ebook-container-main">
            <div className="v-ebook-container">
              <img
                src={ebook.coverUrl}
                alt={ebook.ebookName}
                className="v-cover-display"
              />
            </div>
            <div className="ebook-name">
            <div className="ebook-name-t"><strong>Name:</strong> {ebook.ebookName}</div>
            <div className="ebook-name-t"><strong>Decs:</strong> {ebook.ebookDescription}</div>
            <div className="ebook-name-t"><strong>Type:</strong> {ebook.ebookType}</div>
            <div className="ebook-name-t"><strong>Price:</strong> ${ebook.ebookPrice}</div>
            </div>
            </div>
            <div className="image-actions">
              <div className="like-count" onClick={(e) => handleLike(ebook, e)}>
                <img
                  src={ebook.isLiked ? likedIcon : likeIcon}
                  alt={ebook.isLiked ? "Liked" : "Like"}
                  className="action-icon"
                />
                <span className="like-number">{formatLikeCount(ebook.likeCount)}</span>
              </div>
              <div className="i-download-button" onClick={(e) => handleCart(ebook, e)}>
                <img src={downloadIcon} alt="Download" className="action-icon" />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="e-loading-page">
          <div>No Ebook Yet, Try Reloading Page</div>
        </div>
      )}
    </div>
  );
};

export default BookSlider;
