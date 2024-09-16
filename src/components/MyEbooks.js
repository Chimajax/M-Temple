import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import likeIcon from '../assets/icons/like-icon.png';
import likedIcon from '../assets/icons/liked-icon.png';
import downloadIcon from '../assets/icons/download-icon.png';
import dotsIcon from '../assets/icons/dots-icon.png';
import './BookSlider.css'

const MyEbooks = () => {
  const [ebooks, setEbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(null);
  const [userUid, setUserUid] = useState(null);

  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserEbooks = async (user) => {
      if (user) {
        try {
          setUserUid(user.uid);

          // Fetch the user's ebooks document
          const ebookRef = doc(db, 'ebooks', user.uid);
          const ebookDoc = await getDoc(ebookRef);

          if (ebookDoc.exists()) {
            const ebookData = ebookDoc.data();
            const allEbooks = [];
            if (ebookData.ebooks && Array.isArray(ebookData.ebooks)) {
              ebookData.ebooks.forEach((ebook, idx) => {
                const uniqueId = user.uid + '-' + idx;
                const isLiked = ebook.likedBy?.includes(user.uid) || false;
                allEbooks.push({
                  id: uniqueId,
                  docId: ebookRef.id,
                  index: idx,
                  coverUrl: ebook.coverUrl,
                  ebookUrl: ebook.ebookUrl,
                  ebookName: ebook.ebookName || 'Unnamed',
                  ebookPrice: ebook.ebookPrice || 0,
                  ebookType: ebook.ebookType,
                  ebookUsername: ebook.username,
                  likeCount: ebook.likeCount || 0,
                  creatorStatus: ebook.creatorStatus,
                  ebookDescription: ebook.ebookDescription,
                  file: ebook.file,
                  views: ebook.views,
                  isLiked: isLiked,
                  likedBy: ebook.likedBy || [],
                  timestamp: ebook.timestamp ? new Date(ebook.timestamp) : null,
                  ownerId: ebook.ownerId || null,
                });
              });

              // Sort ebooks by timestamp, most recent first
              allEbooks.sort((a, b) => {
                const dateA = a.timestamp ? a.timestamp.getTime() : 0;
                const dateB = b.timestamp ? b.timestamp.getTime() : 0;
                return dateB - dateA;
              });

              setEbooks(allEbooks);
            } else {
              setEbooks([]);
            }
          } else {
            setEbooks([]);
          }
        } catch (error) {
          console.error("Error fetching ebooks:", error);
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
        fetchUserEbooks(user);
      } else {
        setLoading(false);
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, db, navigate]);

  const handleLike = async (ebook, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to like ebooks!");
      return;
    }

    try {
      const ebookDocRef = doc(db, 'ebooks', user.uid);
      const ebookDocSnap = await getDoc(ebookDocRef);

      if (ebookDocSnap.exists()) {
        const docData = ebookDocSnap.data();
        const ebooksArray = docData.ebooks;
        const currentEbook = ebooksArray[ebook.index];
        const likedBy = currentEbook.likedBy || [];
        const userIdIndex = likedBy.indexOf(user.uid);
        let updatedLikeCount = ebook.likeCount;

        if (userIdIndex === -1) {
          likedBy.push(user.uid);
          updatedLikeCount += 1;

          // Fetch the username of the current user
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          const username = userDocSnap.exists() ? userDocSnap.data().username || 'Anonymous' : 'Anonymous';

          // Fetch the post owner's user ID
          const postOwnerUid = ebook.ownerId;

          const content = ebook.ebookUrl;

          // Create notification object with docId and index
          const notification = {
            ebook: content,
            timestamp: new Date(),
            username: username,
            likecount: updatedLikeCount,
            note: `${username} liked your ebook"${content}"`,
            docId: user.uid,
            index: ebook.index,
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
          prevEbooks.map((i) => (i.id === ebook.id ? { ...i, likeCount: updatedLikeCount, isLiked: likedBy.includes(user.uid) } : i))
        );
      }
    } catch (error) {
      console.error('Error updating like count:', error);
    }
  };

  const handleDelete = async (ebook, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to delete ebooks!");
      return;
    }

    try {
      const ebookDocRef = doc(db, 'ebooks', user.uid);
      const ebookDocSnap = await getDoc(ebookDocRef);

      if (ebookDocSnap.exists()) {
        const docData = ebookDocSnap.data();
        const ebooksArray = docData.ebooks;
        // Remove the ebook from the array
        ebooksArray.splice(ebook.index, 1);

        await updateDoc(ebookDocRef, {
          ebooks: ebooksArray,
        });

        // Update the state with the new ebooks
        setEbooks((prevEbooks) => prevEbooks.filter((i) => i.id !== ebook.id));

        // Get the current user document
        const userDoc = await getDoc(doc(db, 'users', userUid));
        const userData = userDoc.data();

        // decrement the value by 1
        const newEbooksValue = (userData.ebooks || 0) - 1;

        // Update the user document with the new value
        await updateDoc(doc(db, 'users', userUid), { ebooks: newEbooksValue });

        // Delete the ebook from Firebase Storage
        const storage = getStorage();

        const coverRef = ref(storage, `${user.email}/covers/${ebook.ebookName}`);
        await deleteObject(coverRef).then(() => {
          console.log('cover deleted from Firebase Storage');
        }).catch((error) => {
          console.error('Error deleting cover from Firebase Storage:', error);
        });

        const ebookRef = ref(storage, `${user.email}/ebooks/${ebook.ebookName}`);
        await deleteObject(ebookRef).then(() => {
          console.log('ebook deleted from Firebase Storage');
        }).catch((error) => {
          console.error('Error deleting ebook from Firebase Storage:', error);
        });
      }
    } catch (error) {
      console.error('Error deleting ebook:', error);
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
        await setDoc(cartRef, {
          ebooks: [ebook],
        });
      } else {
        const cartData = cartDocSnap.data();
        const ebooksArray = cartData.ebooks || [];
        ebooksArray.push(ebook);
        await updateDoc(cartRef, {
          ebooks: ebooksArray,
        });
      }

      alert('Ebook added to cart successfully!');
    } catch (error) {
      console.error('Error adding ebook to cart:', error);
      alert('Ebook added to cart failed!');
    }
  };

  const handleMenuClick = (ebookId, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    setMenuVisible(menuVisible === ebookId ? null : ebookId);
  };

  const handleEbookClick = (ebook) => {
    console.log('Ebook clicked');
    const ebookUsername = ebook.ebookUsername

    navigate('/viewebook', {
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

  return (
    <div className="my-quote-section push-down">  {/* i got push up from MyVideoSection.js*/}
      {ebooks.length > 0 ? (
        ebooks.map((ebook, index) => (
          <div key={index} className="book-placeholder" onClick={() => handleEbookClick(ebook)}>

            <div className="ebook-actions">
            <div>-{ebook.ebookUsername}</div>
              <div className="dots-menu">
                <img
                  src={dotsIcon}
                  alt="More options"
                  className="r-action-icon"
                  onClick={(e) => handleMenuClick(ebook.id, e)}
                />
                {menuVisible === ebook.id && (
                  <div className="menu">
                    <button className="menu-item" onClick={(e) => handleDelete(ebook, e)}>Delete</button>
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
          <div>No ebook available, Try Uploading</div>
        </div>
      )}
    </div>
  );
};

export default MyEbooks;