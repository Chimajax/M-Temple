// javascript code
import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import './CartPage.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { redirect, useNavigate } from 'react-router-dom'
import dotsIcon from '../assets/icons/dots-icon.png'

const Cart = () => {
  const [carts, setCarts] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null);
  const [itemOwnerName, setItemOwnerName] = useState('');
  const [isPin, setIsPin] = useState(false); // Add this state
  const [message, setMessage] = useState(''); 
  const [pinInput, setPinInput] = useState('');
  const [isDone, setIsDone] = useState(false); // Add this state
  const [fileType, setFileType] = useState('');
  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();
  const storage = getStorage();


  const user = auth.currentUser;

  const cartsDocRef = doc(db, 'carts', auth.currentUser.uid); // Define cart doc ref  
  
  

  useEffect(() => {
    const fetchCarts = async () => {
      try {
        const user = auth.currentUser;
    
        if (!user) {
          console.error('No user logged in.');
          return;
        }
  
    
        // Reference to the user's carts document
        const cartDocRef = doc(db, 'carts', user.uid);
        const cartDocSnap = await getDoc(cartDocRef);
    
        if (!cartDocSnap.exists()) {
          console.error('No carts found in Firestore.');
          return;
        }
  
    
        // Extract the cart array from the document data
        const cartData = Object.values(cartDocSnap.data());
  
    
        // Assuming the cartData contains full details about each cart item.
        const userCarts = cartData.flat().map((cart, index) => ({
          id: index.toString(),
          senderUsername: cart.senderUsername || 'Anonymous',
          content: cart.content || 'No content',
          timestamp: cart.timestamp ? new Date(cart.timestamp.toDate()) : new Date(),
          note: cart.note,
          docId: cart.docId,
          index: cart.index,
          quote: cart.quote || 'Please Reload Page',
          username: cart.username || 'Anonymous',
          likeCount: cart.likeCount || '...Loading...',
          file: cart.file || 'post',
          imageUrl: cart.imageUrl,
          imageName: cart.imageName || '...Loading...',
          views: cart.views || '...Loading...',
          imagePrice: cart.imagePrice || '...Loading...',
          imageType: cart.imageType || '...Loading...',
          imageUsername: cart.imageUsername || '...Loading...',
          creatorStatus: cart.creatorStatus || '...Loading...',
          videoUrl: cart.videoUrl,
          videoName: cart.videoName,
          videoPrice: cart.videoPrice,
          videoType: cart.videoType,
          videoUsername: cart.videoUsername,
          ebook: cart.ebookUrl,
          elikeCount: cart.elikecount,
          ebookName: cart.ebookName,
          ebookPrice: cart.ebookPrice, 
          ebookType: cart.ebookType,
          ebookUsername: cart.ebookUsername,

          note: `You Bookmarked '${cart.imageName || cart.videoName || cart.ebookName}' from carts`,
          //original cart stuffs
          itemName: cart.itemName || cart.videoName || cart.ebookName || cart.imageName ,
          itemPrice: parseInt( cart.videoPrice || cart.ebookPrice || cart.itemPrice || cart.imagePrice  || 0),
          itemStatus: cart.creatorStatus || cart.itemStatus,
          itemUrl:  cart.itemUrl || cart.videoUrl || cart.ebookUrl || cart.imageUrl ,
          itemOwner: cart.ownerId || cart.itemOwner,
          itemSize: cart.itemSize || cart.videoSize || cart.ebookSize || cart.imageSize ||  'X',
        }));
  
        
        
        setCarts(userCarts); // Update the state with the fetched carts
      } catch (error) {
        console.error(`Error fetching carts: ${error.message}`);
      }
    };
  
    fetchCarts();
  }, [auth, db]);

  useEffect(() => {
    carts.forEach((cart) => handleOwnerName(cart));
  }, [carts]);

  
    
  const handleCartClick = (cart) => {
    const { docId, index, quote, username, likeCount, timestamp, file, imageUrl, imageName, views, imagePrice, imageType, imageUsername, creatorStatus,
      videoUrl, videoName, videoPrice, videoType, videoUsername,
      ebook, ebookName, ebookPrice, ebookType, ebookUsername, elikeCount
    } = cart;

    if (file === 'image') {
      navigate('/viewimage', {
        state: {
          docId: docId,
          index: index,
          quote: quote,
          timestamp: timestamp || new Date(),
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

        const videoPlay = cart.videoUrl || cart.itemUrl;

      navigate('/viewvideo', {
        state: {
          docId: docId,
          index: index,
          quote: quote,
          timestamp: timestamp || new Date(),
          username: username,
          videolikeCount: likeCount,
          videoUrl: videoUrl || videoPlay,
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
          timestamp: timestamp || new Date(),
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
          timestamp: timestamp || new Date(),
          username: username,
          likeCount: likeCount,
        },
      });
    }
  };


  const handleMenuClick = (cartId, e) => {
    e.stopPropagation(); // Prevent the click event from bubbling up
    setMenuVisible(menuVisible === cartId ? null : cartId);
  };


  const handleRemove = async (cart, e) => {
    e.stopPropagation(); // Prevent triggering the parent click event
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("User is not logged in");
        return;
      }

      // Reference to the carts document in Firestore
      const cartsDocRef = doc(db, 'carts', user.uid);
      const cartsDocSnap = await getDoc(cartsDocRef);

      if (cartsDocSnap.exists()) {
        const cartsData = cartsDocSnap.data().cart || [];
  
        // Find the index of the cart item to be removed
        const indexToRemove = cartsData.findIndex(
          (c) => c.docId === cart.docId && c.index === cart.index
        );
  
        if (indexToRemove !== -1) {
          // Remove the item from the cartsData array
          cartsData.splice(indexToRemove, 1);
  
          // Update Firestore with the updated cartsData array
          await updateDoc(cartsDocRef, {
            cart: cartsData,
          });
          
           // Create a new array with the updated cart objects
        const updatedCarts = cartsData.map((cartData) => ({
            ...cartData,
            // Make sure to update the cart object with the latest data
            itemName: cartData.imageName || cartData.videoName || cartData.ebookName,
            itemPrice: cartData.imagePrice || cartData.videoPrice || cartData.ebookPrice,
            itemStatus: cartData.creatorStatus,
            itemUrl: cartData.imageUrl || cartData.videoUrl || cartData.ebookUrl,
            itemOwner: cartData.ownerId,
            timestamp: cartData.timestamp ? new Date(cartData.timestamp.toDate()) : new Date(),
          }));
  
          // Update the local state with the new array
          setCarts(updatedCarts);

          console.log('Cart removed successfully');
        }
      }
    } catch (error) {
      console.error('Error removing cart:', error);
    }
  };
  
  const handleBookmark = async (cart, e) => {
    e.stopPropagation(); // Prevent triggering the parent click event
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("User is not logged in");
        return;
      }
  
      // Create a new document in the bookmarks collection with the cart data
      const bookmarkDocRef = doc(db, 'bookmarks', user.uid);
      const bookmarkDocSnap = await getDoc(bookmarkDocRef);
  
      let currentBookmarks = [];
      if (bookmarkDocSnap.exists()) {
        currentBookmarks = bookmarkDocSnap.data().bookmarks || [];
      }
  
      // Add the cart to the bookmarks
      const updatedBookmarks = Object.fromEntries(Object.entries(cart).filter(([key, value]) => value !== undefined));
  
      // Update Firestore with the new bookmarks
      await setDoc(bookmarkDocRef, { bookmarks: arrayUnion(updatedBookmarks) });
      handleRemove(cart, e)
      console.log('Cart added to bookmarks');
    } catch (error) {
      console.error('Error adding cart to bookmarks:', error);
    }
  };

  const handleOwnerName =  async (cart) => {
    const ownerUid = cart.itemOwner;
    const userDocRef = doc(db, 'users', ownerUid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const username = userDocSnap.data().username;
      setItemOwnerName(username);
    } else {
    setItemOwnerName('Loading');
    }
  }

  const handlePin =  async () => { //i meant to say handle proceed but continue
    const user = auth.currentUser;
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const Balance = userDocSnap.data().Balance;


      if (carts.reduce((acc, cart) => acc + cart.itemPrice, 0) > Balance) {
        setIsDone(true);
        setMessage(`You don't have enough balance, you plan to spend
             $${carts.reduce((acc, cart) => acc + cart.itemPrice, 0).toFixed(2)} and your balance is $${Balance.toFixed(2)}`);
        setIsPin(false)
      } else {
        setIsPin(true);

      }


    }
  }

  const handleConfirm =  async (cart, e) => {
    if (e) {
        e.stopPropagation();
      }
    const user = auth.currentUser;
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    const pinInput = document.querySelector('input[type="password"]').value;

    if (userDocSnap.exists()) {
      const Pin = userDocSnap.data().pin;


      if (!Pin) {
        setMessage(`You don't have a pin, Go to settings`);
         return null;
      }

      if (!pinInput || String(pinInput) !== String(Pin)) {
        setMessage('Incorrect Pin, try again')
        setPinInput('')
        return null;
      } else {
        console.log('correct pin')
        handleCloseDone()
        handleDownload(cart)
      }

    }
   }

   const handlePinType =  async (e) => {
    if (e) {
      e.stopPropagation();
    }
  }


   const handleCloseDone =  async (e) => {
    if (e) {
      e.stopPropagation();
    }
    setIsPin(false)
    setIsDone(false)
    setMessage('')
  }

  const handleDownload = async (cart) => {
    setIsDone(true)
    setMessage('Download Started: Do not leave page')
    try {
        const fetchFileURL = async (filePath) => {
            try {
              const storageRef = ref(storage, filePath); // Set filePath dynamically based on your cart data
              const url = await getDownloadURL(storageRef);
              return url; // Return the URL
            } catch (error) {
              console.error('Error fetching download URL:', error);
              return null;
            }
          };


        let fileRef;
      const user = auth.currentUser;
      if (!user) {
        console.error('No user logged in.');
        return;
      }
  
      // Reference to the user's document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
  
      if (!userDocSnap.exists()) {
        console.error('User document not found in Firestore.');
        return;
      }
  
      const buyerUsername = userDocSnap.data().username;
      const userBalance = userDocSnap.data().Balance;
  
      // Loop through each item in the cart
      for (const cart of carts) {
        const { itemName, itemPrice, itemUrl, itemOwner, file } = cart;
        const fileURL = await fetchFileURL(itemUrl);

        const storageRef = ref(storage, itemUrl); // cart.itemUrl contains the path to the file in storage
        const downloadURL = await getDownloadURL(storageRef);
  
        // Create an anchor tag to download the file
        const a = document.createElement('a');
        // a.href = fileURL;
       // a.href = downloadURL;
        
        a.type = getFileType(file); //
        a.style.display = 'none'; // Hide the link
        document.body.appendChild(a);
        a.download = itemName; // Download the file with its name
        a.target = '_blank'; // Open in new tab (optional)
        a.rel = 'noopener noreferrer'; // Security attributes (optional)
        a.download = 'attachment'; // Force download instead of opening in browser
        a.click(); // Trigger the download
        document.body.removeChild(a); // Remove the link after triggering download

        console.log(`Downloaded: ${itemName}`);
  
        if (userBalance >= itemPrice) {
          // Deduct the price from the user's balance
         const newUserBalance = userBalance - itemPrice;
  
          // Update the user's balance in Firestore
          await updateDoc(userDocRef, {
            Balance: parseInt(newUserBalance)
          });
  
          // Update the item owner's balance
          const ownerDocRef = doc(db, 'users', itemOwner);
          const ownerDocSnap = await getDoc(ownerDocRef);
  
          if (ownerDocSnap.exists()) {
            const ownerBalance = ownerDocSnap.data().Balance;
            const newOwnerBalance = ownerBalance + itemPrice;
  
            await updateDoc(ownerDocRef, {
              Balance: parseInt(newOwnerBalance)
            });
            console.log('paid to owner')

            
            const followId = user.uid;

            const notification = {
                docId: followId,
                index: 1,
                oldBuyerBalance: userBalance,
                newBuyerBalance: newUserBalance,
                oldBalance: ownerBalance,
                newBalance: newOwnerBalance,
                note: `${buyerUsername || 'A user'} just bought your ${cart.file} '${itemName}' @ $${itemPrice}`,
                file: 'follower',
                followerId: followId,
                timestamp: new Date(),
            }
        
            // Add a notification for the profile user
            const notificationsRef = doc(db, 'notifications', itemOwner );
            await setDoc(notificationsRef, {
                    notifications: arrayUnion(notification),
                },{ merge: true });

                console.log('notification sent to owner')

          } else {
            console.error(`Owner document not found for item owner: ${itemOwner}`);
          }

                
        } else {
          console.error(`Not enough balance for ${itemName}. Skipping this item.`);
        }
      }
      
      console.log('All downloads completed.');
      setCarts([]);
      setIsDone(true)
      setMessage('Download Complete Thank Yoo')
      // After all downloads are completed and the cart is cleared
    await updateDoc(cartsDocRef, { cart: [] });
    } catch (error) {
      console.error(`Error during download process: ${error.message}`);
      setIsDone(true)
      setMessage(`Error: ${error.message}`)
    }
  };

  // Helper function to get the file type based on the file extension
    const getFileType = (file) => {
    switch (file) {
      case 'image':
        return 'image/png'; // or 'image/png' depending on the image type
      case 'video':
        return 'video/mp4';
      case 'ebook':
        return 'application/pdf';
      default:
        return 'application/octet-stream'; // fallback to generic binary type
    }
  };
  


  

  return (
    <>
      <Header />
      <div className="notification-content">
        <div className="notification-section">
          {carts.length > 0 ? (
            carts.map((cart, idx) => (
              <div
                key={idx}
                onClick={() => handleCartClick(cart)}
                className="notification-card"
              >
                 <div className="ebook-actions">
            <div>carts</div>
              <div className="dots-menu">
                <img
                  src={dotsIcon}
                  alt="More options"
                  className="r-action-icon"
                  onClick={(e) => handleMenuClick(cart.id, e)}
                />
                {menuVisible === cart.id && (
                  <div className="menu">
                    <button className="menu-item" onClick={(e) => handleRemove(cart, e)}>Remove</button>
                    <button className="menu-item" onClick={(e) => handleBookmark(cart, e)}>Add to Bookmarks</button>
                    <button className="menu-item" onClick={() => setMenuVisible(null)}>Skip</button>
                  </div>
                )}
              </div>
            </div>
            <div>
                <div>
                 <p> <strong>{cart.file}</strong></p>
                  <p>Name: {cart.itemName}</p>
                  <p>Price: ${cart.itemPrice}</p>
                  <p>Owner: {itemOwnerName}</p>
                  <p>Creatorstatus: {cart.itemStatus}</p>
                  <p>Size: {cart.itemSize}MB</p>
                  
                    </div>
                <span className="notification-timestamp">
                  Time: {cart.timestamp ? cart.timestamp.toLocaleString() : 'Just now'}
                </span>
                </div>  
                {isPin && (
                            <div className="cart-fixed-password-box" onClick={(e) => handlePinType(e)}>
                        <div className="pin-dialogue-box">
                        <p>Confirm Pin to Proceed</p>
                        <input
                            type="password"
                            maxLength="4"
                            value={pinInput}
                            placeholder="Your Pin"
                            onChange={(e) => {
                                setMessage('');
                                setPinInput(e.target.value);}}

                        />
                        <p style={{color: 'red'}}>{message}</p>
                        <button onClick={(e) => handleConfirm(cart)}> Send </button>
                        <button onClick={(e) => handleCloseDone(e)}> Back </button>
                        </div>
                        </div>
                    )}


                    
              </div>
            ))
          ) : (
            <div className="notification-loading">
              No carts available now
            </div>
          )}

                {isDone && (
                            <div className="cart-fixed-password-box">
                         <div className="pin-dialogue-box">
                        
                        <p><div className="white-texttt">{message}</div></p>
                        <button onClick={(e) => handleCloseDone(e)}> Close </button>
                        </div>
                        </div>
                    )}

          <div className="buy-button" onClick={() => handlePin()}>
          <strong>Download:</strong> ${carts.reduce((acc, cart) => acc + cart.itemPrice, 0).toFixed(2)}
        </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Cart;