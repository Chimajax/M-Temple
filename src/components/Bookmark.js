// javascript code
import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import './Bookmark.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom'
import dotsIcon from '../assets/icons/dots-icon.png';

const Bookmark = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null);
  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          return;
        }

        const bookmarksDocRef = doc(db, 'bookmarks', user.uid);
        const bookmarksDocSnap = await getDoc(bookmarksDocRef);

        if (!bookmarksDocSnap.exists()) {
          alert('No bookmarks found in Firestore.');
          return;
        }

        const bookmarksData = bookmarksDocSnap.data().bookmarks || [];

        const userBookmarks = await Promise.all(
          bookmarksData.map(async (bookmark, index) => {
            if (!bookmark || !bookmark.docId || bookmark.index === undefined) {
              console.error(`Bookmark data is missing required fields: ${JSON.stringify(bookmark)}`);
              return null;
            }

            const postDocRef = doc(db, 'quotes', bookmark.docId);
            const postDocSnap = await getDoc(postDocRef);

            if (postDocSnap.exists()) {
              const postData = postDocSnap.data();
              const quotesArray = postData.quotes || [];
              const currentQuote = quotesArray[bookmark.index];

              if (!currentQuote) {
                console.error(`No quote found for index ${bookmark.index} in document ${bookmark.docId}`);
                return null;
              }

              return {
                id: `${bookmark.docId}-${bookmark.index}`,
                senderUsername: bookmark.senderUsername || 'Anonymous',
                content: bookmark.content || 'No content',
                timestamp: bookmark.timestamp ? new Date(bookmark.timestamp.toDate()) : new Date(),
                note: bookmark.note,
                docId: bookmark.docId,
                index: bookmark.index,
                quote: currentQuote.quote || '',
                username: currentQuote.username || 'Anonymous',
                likeCount: bookmark.likeCount || currentQuote.likeCount || '(...Loading...)',
                file: bookmark.file || 'post', // Assume 'post' if not specified
                imageUrl: bookmark.imageUrl,
                imageName: bookmark.imageName || '...Loading...',
                views: bookmark.views || '...Loading...',
                imagePrice: bookmark.imagePrice || '0(...Loading...)',
                imageType: bookmark.imageType || '...Loading...',
                imageUsername: bookmark.imageUsername || '...Loading....',
                creatorStatus: bookmark.creatorStatus || '...Loading...',
                // this is for video
                videoUrl: bookmark.videoUrl,
                videoName: bookmark.videoName,
                videoPrice: bookmark.videoPrice,
                videoType: bookmark.videoType,
                videoUsername: bookmark.videoUsername,
                //this is for ebook
                ebook: bookmark.ebookUrl,
                elikeCount: bookmark.elikecount,
                ebookName: bookmark.ebookName,
                ebookPrice: bookmark.ebookPrice,
                ebookType: bookmark.ebookType,
                ebookUsername: bookmark.ebookUsername,

                ownerId: bookmark.ownerId,

                      //original cart stuffs
                itemName: bookmark.itemName || bookmark.imageName || bookmark.videoName || bookmark.ebookName,
                itemPrice: parseInt(bookmark.itemPrice || bookmark.videoPrice || bookmark.ebookPrice || bookmark.imagePrice),
                itemStatus: bookmark.itemStatus || bookmark.creatorStatus,
                itemUrl: bookmark.itemUrl || bookmark.imageUrl || bookmark.videoUrl || bookmark.ebookUrl,
                itemOwner: bookmark.itemOwner || bookmark.ownerId,
                itemSize: bookmark.itemSize || bookmark.imageSize || bookmark.videoSize || bookmark.ebookSize,

              };
            } else {
              console.error(`Post document not found for docId ${bookmark.docId}`);
            }

            return null;
          })
        );

        const validBookmarks = userBookmarks.filter((b) => b !== null);
        validBookmarks.sort((a, b) => b.timestamp - a.timestamp);
        setBookmarks(validBookmarks);
      } catch (error) {
        alert(`Error fetching bookmarks: ${error.message}`);
      }
    };

    fetchBookmarks();
  }, [auth, db]);

  const handleBookmarkClick = (bookmark) => {
    const { docId, index, quote, username, likeCount, timestamp, file, imageUrl, imageName, views, imagePrice, imageType, imageUsername, creatorStatus,
      videoUrl, videoName, videoPrice, videoType, videoUsername,
      ebook, ebookName, ebookPrice, ebookType, ebookUsername, elikeCount
    } = bookmark;

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
          videoUrl: videoUrl,
          videoName: videoName,
          views: views,
          videoPrice: videoPrice,
          videoType: videoType,
          videoUsername: videoUsername,
          creatorStatus: creatorStatus,
        },
      });
    } else if (file === 'ebook') {
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
      });
    } else {
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


  const handleMenuClick = (bookmarkId, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    setMenuVisible(menuVisible === bookmarkId ? null : bookmarkId);
  };


  const handleRemove = async (bookmark, e) => {
    e.stopPropagation(); // Prevent triggering the parent click event
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("User is not logged in");
        return;
      }
  
      // Reference to the bookmarks document in Firestore
      const bookmarksDocRef = doc(db, 'bookmarks', user.uid);
      const bookmarksDocSnap = await getDoc(bookmarksDocRef);
  
      if (bookmarksDocSnap.exists()) {
        const bookmarksData = bookmarksDocSnap.data().bookmarks || [];
  
        // Filter out the bookmark that should be removed
        const updatedBookmarks = bookmarksData.filter(
          (b) => !(b.docId === bookmark.docId && b.index === bookmark.index)
        );
  
        // Update Firestore with the filtered bookmarks
        await updateDoc(bookmarksDocRef, { bookmarks: updatedBookmarks });
        setBookmarks(updatedBookmarks); // Update local state
        console.log('Bookmark removed successfully');
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };
  
  const handleCart = async (bookmark, e) => {
    e.stopPropagation(); // Prevent triggering the parent click event
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("User is not logged in");
        return;
      }
  
      // Create a new document in the carts collection with the bookmark data
      const cartDocRef = doc(db, 'carts', user.uid);
      const cartDocSnap = await getDoc(cartDocRef);
  
      let currentCartItems = [];
      if (cartDocSnap.exists()) {
        currentCartItems = cartDocSnap.data().cart || [];
      }
  
      // Add the cart to the bookmarks
      const updatedCartItems = Object.fromEntries(Object.entries(bookmark).filter(([key, value]) => value !== undefined));
  
      // Update Firestore with the new cart items
      await setDoc(cartDocRef, { cart: arrayUnion(updatedCartItems) });
      console.log('Bookmark added to cart');
      handleRemove(bookmark, e)
    } catch (error) {
      console.error('Error adding bookmark to cart:', error);
    }
  };
  

  return (
    <>
      <Header />
      <div className="notification-content">
        <div className="notification-section">
          {bookmarks.length > 0 ? (
            bookmarks.map((bookmark, idx) => (
              <div
                key={idx}
                onClick={() => handleBookmarkClick(bookmark)}
                className="notification-card"
              >
                 <div className="ebook-actions">
            <div>bookmarks</div>
              <div className="dots-menu">
                <img
                  src={dotsIcon}
                  alt="More options"
                  className="r-action-icon"
                  onClick={(e) => handleMenuClick(bookmark.id, e)}
                />
                {menuVisible === bookmark.id && (
                  <div className="menu">
                    <button className="menu-item" onClick={(e) => handleRemove(bookmark, e)}>Remove</button>
                    <button className="menu-item" onClick={(e) => handleCart(bookmark, e)}>Add to Cart</button> 
                    <button className="menu-item" onClick={() => setMenuVisible(null)}>Skip</button>
                  </div>
                )}
              </div>
            </div>
                <p>
                  <strong>{bookmark.note}</strong>
                </p>
                <span className="notification-timestamp">
                  Time: {bookmark.timestamp ? bookmark.timestamp.toLocaleString() : 'Just now'}
                </span>
              </div>
            ))
          ) : (
            <div className="notification-loading">
              No bookmarks available now
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Bookmark;