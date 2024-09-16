import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import likeIcon from '../assets/icons/like-icon.png';
import likedIcon from '../assets/icons/liked-icon.png';
import downloadIcon from '../assets/icons/download-icon.png';
import dotsIcon from '../assets/icons/dots-icon.png';
import './ImageSection.css';

const MyImages = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(null);
  const [userUid, setUserUid] = useState(null);

  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserImages = async (user) => {
      if (user) {
        try {
          setUserUid(user.uid);

          // Fetch the user's images document
          const imageRef = doc(db, 'images', user.uid);
          const imageDoc = await getDoc(imageRef);

          if (imageDoc.exists()) {
            const imageData = imageDoc.data();
            const allImages = [];
            if (imageData.images && Array.isArray(imageData.images)) {
              imageData.images.forEach((image, idx) => {
                const uniqueId = user.uid + '-' + idx;
                const isLiked = image.likedBy?.includes(user.uid) || false;
                allImages.push({
                  id: uniqueId,
                  docId: imageRef.id,
                  index: idx,
                  imageUrl: image.imageUrl,
                  imageName: image.imageName || 'Unnamed',
                  imagePrice: image.imagePrice || 0,
                  imageType: image.imageType,
                  imageUsername: image.username,
                  likeCount: image.likeCount || 0,
                  creatorStatus: image.creatorStatus,
                  views: image.views,
                  isLiked: isLiked,
                  likedBy: image.likedBy || [],
                  timestamp: image.timestamp ? new Date(image.timestamp) : null,
                  ownerId: image.ownerId,
                });
              });

              // Sort images by timestamp, most recent first
              allImages.sort((a, b) => {
                const dateA = a.timestamp ? a.timestamp.getTime() : 0;
                const dateB = b.timestamp ? b.timestamp.getTime() : 0;
                return dateB - dateA;
              });

              setImages(allImages);
            } else {
              setImages([]);
            }
          } else {
            setImages([]);
          }
        } catch (error) {
          console.error("Error fetching images:", error);
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
        fetchUserImages(user);
      } else {
        setLoading(false);
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, db, navigate]);

  const handleLike = async (image, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to like images!");
      return;
    }

    try {
      const imageDocRef = doc(db, 'images', user.uid);
      const imageDocSnap = await getDoc(imageDocRef);

      if (imageDocSnap.exists()) {
        const docData = imageDocSnap.data();
        const imagesArray = docData.images;
        const currentImage = imagesArray[image.index];
        const likedBy = currentImage.likedBy || [];
        const userIdIndex = likedBy.indexOf(user.uid);
        let updatedLikeCount = image.likeCount;

        if (userIdIndex === -1) {
          likedBy.push(user.uid);
          updatedLikeCount += 1;

          // Fetch the username of the current user
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          const username = userDocSnap.exists() ? userDocSnap.data().username || 'Anonymous' : 'Anonymous';

          // Fetch the post owner's user ID
          const postOwnerUid = user.uid;

          const content = currentImage.imageUrl;

          // Create notification object with docId and index
          const notification = {
            image: content,
            timestamp: new Date(),
            username: username,
            likecount: updatedLikeCount,
            note: `${username} liked your post "${content}"`,
            docId: user.uid,
            index: image.index,
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

        const updatedImage = {
          ...currentImage,
          likedBy: likedBy,
          likeCount: updatedLikeCount,
        };

        imagesArray[image.index] = updatedImage;

        await updateDoc(imageDocRef, {
          images: imagesArray,
        });

        setImages((prevImages) =>
          prevImages.map((i) => (i.id === image.id ? { ...i, likeCount: updatedLikeCount, isLiked: likedBy.includes(user.uid) } : i))
        );
      }
    } catch (error) {
      console.error('Error updating like count:', error);
    }
  };

  const handleDelete = async (image, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
      alert("You must be signed in to delete images!");
      return;
    }

    try {
      const imageDocRef = doc(db, 'images', user.uid);
      const imageDocSnap = await getDoc(imageDocRef);

      if (imageDocSnap.exists()) {
        const docData = imageDocSnap.data();
        const imagesArray = docData.images;
        // Remove the image from the array
        imagesArray.splice(image.index, 1);

        await updateDoc(imageDocRef, {
          images: imagesArray,
        });

        // Update the state with the new images
        setImages((prevImages) => prevImages.filter((i) => i.id !== image.id));

        // Get the current user document
      const userDoc = await getDoc(doc(db, 'users', userUid));
      const userData = userDoc.data();

      // decrement the value by 1
      const newImagesValue = (userData.images || 0) - 1;

      // Update the user document with the new value
      await updateDoc(doc(db, 'users', userUid), { images: newImagesValue });
      

            // Delete the image from Firebase Storage
            const storage = getStorage();
            const imageRef = ref(storage, `${user.email}/images/${image.imageName}`);
            await deleteObject(imageRef).then(() => {
              console.log('Image deleted from Firebase Storage');
            }).catch((error) => {
              console.error('Error deleting image from Firebase Storage:', error);
            });

      // finished
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const handleCart = async (image, e) => {
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
          images: [image],
        });
      } else {
        const cartData = cartDocSnap.data();
        const imagesArray = cartData.images || [];
        imagesArray.push(image);
        await updateDoc(cartRef, {
          images: imagesArray,
        });
      }
  
      alert('Image added to cart successfully!');
    } catch (error) {
      console.error('Error adding image to cart:', error);
      alert('Image added to cart failed!');
    }
  };

  const handleMenuClick = (imageId, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    setMenuVisible(menuVisible === imageId ? null : imageId);
  };

  const handleImageClick = (image) => {
    console.log('Image clicked');
    const imageUsername = image.imageUsername
    

    navigate('/viewimage', {
      state: {
        imageUrl: image.imageUrl,
        imageName: image.imageName,
        likeCount: image.likeCount,
        timestamp: image.timestamp,
        views: image.views,
        docId: image.docId,
        index: image.index,
        imagePrice: image.imagePrice,
        imageType: image.imageType,
        imageUsername: imageUsername,
        creatorStatus: image.creatorStatus,
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
    <div className="image-section">
      {images.length > 0 ? (
        images.map((image, index) => (
          <div key={index} className="image-card" onClick={() => handleImageClick(image)}>
            <div className="image-name">
            <div className="image-name-t">Name: {image.imageName}</div>
            <div className="image-name-t">Type: {image.imageType}</div>
            <div className="image-name-t">Price: ${image.imagePrice}</div>
            <div className="image-name-t">Note: {image.creatorStatus}</div>
            </div>
            <div className="image-actions">
            <div>-{image.imageUsername}</div>
              <div className="dots-menu">
                <img
                  src={dotsIcon}
                  alt="More options"
                  className="r-action-icon"
                  onClick={(e) => handleMenuClick(image.id, e)}
                />
                {menuVisible === image.id && (
                  <div className="menu">
                    <button className="menu-item" onClick={(e) => handleDelete(image, e)}>Delete</button>
                    <button className="menu-item" onClick={() => setMenuVisible(null)}>Skip</button>
                  </div>
                )}
              </div>
            </div>
            <div className="v-image-container">
              <div className="v-image-container-b">Set To Image View</div>
              <img
                src={image.imageUrl}
                alt={image.imageName}
                className="image-display"
              />
            </div>
            <div className="image-actions">
              <div className="like-count" onClick={(e) => handleLike(image, e)}>
                <img
                  src={image.isLiked ? likedIcon : likeIcon}
                  alt={image.isLiked ? "Liked" : "Like"}
                  className="action-icon"
                />
                <span className="like-number">{formatLikeCount(image.likeCount)}</span>
              </div>
              <div className="i-download-button" onClick={(e) => handleCart(image, e)}>
                <img src={downloadIcon} alt="Download" className="action-icon" />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="i-loading-page">
          <div>No images available, Post an Image</div>
        </div>
      )}
    </div>
  );
};

export default MyImages;
