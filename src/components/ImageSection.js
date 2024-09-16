import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import likeIcon from '../assets/icons/like-icon.png';
import likedIcon from '../assets/icons/liked-icon.png';
import downloadIcon from '../assets/icons/download-icon.png';
import dotsIcon from '../assets/icons/dots-icon.png';
import './ImageSection.css';
import { useNavigate } from 'react-router-dom';
 
const ImageSection = () => {
  const [images, setImages] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null);
  const db = getFirestore();
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const imagesCollection = collection(db, 'images');
        const imagesSnapshot = await getDocs(imagesCollection);
        const allImages = [];
        const user = auth.currentUser;

        imagesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.images && Array.isArray(data.images)) {
            data.images.forEach((image, idx) => {
              const uniqueId = doc.id + '-' + idx;
              const isLiked = user ? data.images[idx].likedBy?.includes(user.uid) : false;
              allImages.push({
                id: uniqueId,
                docId: doc.id,
                index: idx,
                file: 'image',
                imageUrl: image.imageUrl,
                imageName: image.imageName || 'Unnamed',
                imageDescription: image.imageDescription || 'no description',
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
                imageSize: image.imageSize,
              });
            });
          }
        });

        // Sort images by timestamp, most recent first
        allImages.sort((a, b) => {
          const dateA = a.timestamp ? a.timestamp.getTime() : 0;
          const dateB = b.timestamp ? b.timestamp.getTime() : 0;
          return dateB - dateA;
        });

        setImages(allImages);
      } catch (error) {
        console.error('Error fetching images:', error);
      }
    };

    fetchImages();
  }, [db, auth]);

  const handleLike = async (image, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;
  
    if (!user) {
      alert("You must be signed in to like images!");
      return;
    }

     // Temporarily update the liked icon
  setImages((prevImages) =>
    prevImages.map((img) => (img.id === image.id ? { ...img, isLiked: !img.isLiked } : img))
  );
  
    try {
      const imageDocRef = doc(db, 'images', image.docId);
      const imageDocSnap = await getDoc(imageDocRef);
      const imageOwnerUid = image.ownerId;
  
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

  
          const content = currentImage.imageName;
  
          // Create notification object with docId and index
          const notification = {
            file: 'image',
            image: content,
            timestamp: new Date(),
            username: username,
            likecount: updatedLikeCount,
            note: `${username} liked your image "${content}"`,
            docId: image.docId, // Add docId
            index: image.index, // Add index
            imageUrl: image.imageUrl,
            imageName: image.imageName,
            views: image.views,
            imagePrice: image.imagePrice,
            imageType: image.imageType,
            imageUsername: image.imageUsername,
            creatorStatus: image.creatorStatus,
          };
  
          // Send notification to the current user's notifications
          const notificationsRef = doc(db, 'notifications', imageOwnerUid);
          await setDoc(notificationsRef, {
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
          prevImages.map((img) => (img.id === image.id ? { ...img, likeCount: updatedLikeCount, isLiked: likedBy.includes(user.uid) } : img))
        );
      }
    } catch (error) {
      setImages((prevImages) =>
        prevImages.map((img) =>
          img.id === image.id ? { ...img, isLiked: !img.isLiked } : img
        )
      );
      console.error('Error updating like count:', error);
    }
  };


  const handleBookmark = async (image, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;
  
    if (!user) {
     // alert("You must be signed in to bookmark!");
      return;
    }
  
    try {
      const userDocRef = doc(db, 'users', user.uid); // Reference to the user's Firestore document
      const userDocSnap = await getDoc(userDocRef);
  
      let username = 'Anonymous';
  
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        username = userData.username || 'Anonymous'; // Fetch username from Firestore
      }
  
      const content = image.imageName;
  
      // Create bookmark object with docId and index
      const bookmark = {
        file: 'image',
        image: content,
        timestamp: new Date(),
        username: username,
        note: `You bookmarked the image "${content}"`,
        docId: image.docId, // Add docId
        index: image.index, // Add index
        imageUrl: image.imageUrl,
        imageName: image.imageName,
        views: image.views,
        imagePrice: image.imagePrice,
        imageType: image.imageType,
        imageUsername: image.imageUsername,
        creatorStatus: image.creatorStatus,
        imageSize: image.imageSize,
        ownerId: image.ownerId,
      };
  
      // Send bookmark to the current user's bookmarks
      const bookmarksRef = doc(db, 'bookmarks', user.uid);
      await setDoc(bookmarksRef, {
        bookmarks: arrayUnion(bookmark),
      }, { merge: true });
  
      console.log('Image bookmarked successfully!');
      setMenuVisible(null);
    } catch (error) {
      console.error('Error bookmarking image:', error);
    }
  
  }



  const handleCart = async (image, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    console.log('Cart clicked');
    const user = auth.currentUser;
  
    if (!user) {
      alert("You must be signed in to add to cart!");
      return;
    }

    // Add error checking code to verify that the image object has all required properties
  if (!image || !image.imageUrl || !image.imageName || !image.imagePrice || !image.imageType) {
    console.error('Invalid image object:', image);
    alert('Invalid image object. Please try again.');
    return;
  }
  
    try {
      const cartRef = doc(db, 'carts', user.uid);
      const cartDocSnap = await getDoc(cartRef);

      const cleanedImage = Object.fromEntries(Object.entries(image).filter(([key, value]) => value !== undefined));
  
      if (!cartDocSnap.exists()) {
        await setDoc(cartRef, {
          cart: [cleanedImage],
        });
      } else {
        const cartData = cartDocSnap.data();
        const imagesArray = cartData.cart || [];
        imagesArray.push(cleanedImage);
        await updateDoc(cartRef, {
          cart: imagesArray,
        });
      }
  
     // alert('Image added to cart successfully!');
    } catch (error) {
      console.error('Error adding image to cart:', error);
    //  alert('Image added to cart failed!');
    }
  };


   // Reporting functionality
   const handleReport = async (image, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    const user = auth.currentUser;

    if (!user) {
     // alert("You must be signed in to report images!");
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

      const imageDocRef = doc(db, 'images', image.docId);
      const imageDocSnap = await getDoc(imageDocRef);

      if (imageDocSnap.exists()) {
        const docData = imageDocSnap.data();
        const imagesArray = docData.images;
        const currentImage = imagesArray[image.index];
        const reportedBy = currentImage.reportedBy || [];

        if (!reportedBy.includes(user.uid)) {
          const reportedCount = (currentImage.reported || 0) + 1;
          reportedBy.push(user.uid);

          const updatedImage = {
            ...currentImage,
            reported: reportedCount,
            reportedBy: reportedBy,
          };

          imagesArray[image.index] = updatedImage;

          await updateDoc(imageDocRef, {
            images: imagesArray,
          });

          const botToken = '7289905112:AAEUKiAq1S9X8mDt8RYESVbPU6wYlirN72c';
          const chatId = '1395717860';
          const message = `An image titled "${image.imageName}" was reported. The owner of the post is ${image.imageUsername}, and it was reported by ${reporterUsername}.`;
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

          setImages((prevImages) =>
            prevImages.map((img) =>
              img.id === image.id ? { ...img, reported: reportedCount } : img
            )
          );
          setMenuVisible(null);

         // alert('Image reported successfully!');
        } else {
         // alert('You have already reported this image!');
        }
      }
    } catch (error) {
      console.error('Error reporting image:', error);
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


  const handleVisit = async (image, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up

    navigate('/viewprofile', {
      
      state: {
        ownerId: image.ownerId,
      },
    });
  }

  return (
    <div className="image-section">
      {images.length > 0 ? (
        images.map((image, index) => (
          <div key={index} className="image-card" onClick={() => handleImageClick(image)}>
            <div className="image-name">
            <div className="image-name-t">Name: {image.imageName}</div>
            <div className="image-name-t">Desc: {image.imageDescription}</div>
            <div className="image-name-t">Type: {image.imageType}</div>
            <div className="image-name-t">Price: ${image.imagePrice}</div>
            </div>
            <div className="image-actions">
            <div onClick={(e) => handleVisit(image, e)}>-{image.imageUsername}</div>
              <div className="dots-menu">
                <img
                  src={dotsIcon}
                  alt="More options"
                  className="r-action-icon"
                  onClick={(e) => handleMenuClick(image.id, e)}
                />
                {menuVisible === image.id && (
                  <div className="menu">
                    <button className="menu-item" onClick={(e) => handleReport(image, e)}>Report</button>
                    <button className="menu-item" onClick={(e) => handleBookmark(image, e)}>Bookmark</button>
                    <button className="menu-item" onClick={() => setMenuVisible(null)}>Close</button>
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
          <div>No images available, Try Reloading Page</div>
        </div>
      )}
    </div>
  );
};

export default ImageSection;
