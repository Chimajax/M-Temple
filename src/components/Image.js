import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Image.css'; // Create a CSS file similar to Quote.css

const Image = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(''); // Will hold preview or actual image URL
  const [imageName, setImageName] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [creatorStatus, setCreatorStatus] = useState('');
  const [imageType, setImageType] = useState('');
  const [imagePrice, setImagePrice] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState(null);
  const [priceLimit] = useState(0);
  const [errors, setErrors] = useState({});
  const [showDialogue, setShowDialogue] = useState(false);
  const [dialogueMessage, setDialogueMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [imageFileSize, setImageFileSize] = useState('');

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.username || '');
            setPlan(userData.plan || '');
            setEmail(userData.email || '');

            const profilePicRef = ref(storage, `${user.email}/profilepic`);
            const profilePicUrl = await getDownloadURL(profilePicRef);
            setProfilePic(profilePicUrl);
          }
          setUserUid(user.uid);
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, db, storage]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const fileSizeInMB = file.size / (1024 * 1024);
      setImageFileSize(`${fileSizeInMB.toFixed(2)} MB`);

      let errorMessages = {};

      if (plan === 'FREE' && fileSizeInMB > 5) {
        errorMessages.imageFile = 'Please upload an image less than 5MB.';
        return;
      } else if (plan === 'PRO' && fileSizeInMB > 20) {
        errorMessages.imageFile = 'Please upload an image less than 20MB.';
        return;
      } else if (plan === 'PRO+' && fileSizeInMB > 50) {
        errorMessages.imageFile = 'Please upload an image less than 50MB.';
        return;
      }
      // Show the selected image in the placeholder
      const previewUrl = URL.createObjectURL(file);
      setImageUrl(previewUrl);
    }
  };

  const handlePostImage = async () => {
    setIsPosting(true); // Set isPosting to true when the post button is clicked
  try {
    let errorMessages = {};

    if (!imageFile) errorMessages.imageFile = 'Please upload an image.';
    if (imageName.trim() === '') errorMessages.imageName = 'Image name is required.';
    if (creatorStatus === '') errorMessages.creatorStatus = 'Please select creator status.';
    if (imageType === '') errorMessages.imageType = 'Is it Free or For Sale?';

    let priceLimit = 0;
    if (plan === 'FREE') {
      priceLimit = 5;
    } else if (plan === 'PRO') {
      priceLimit = 15;
    } else {
      priceLimit = 100;
    }

    if (imageType === 'On Sale Image') {
      if (isNaN(parseFloat(imagePrice)) || parseFloat(imagePrice) <= 0.01) {
        errorMessages.imagePrice = 'Please enter a valid price';
      } else if (parseFloat(imagePrice) > priceLimit) {
        errorMessages.imagePrice = `Your Plan is ${plan} and has a limit of setting max ${priceLimit} USD per Image`;
      }
    }

    if (Object.keys(errorMessages).length > 0) {
      setErrors(errorMessages);
      setIsPosting(false); // Reset isPosting to false when the image has error
      return;
    }

   // try {
      // Naming the file with the inputted name and original name
      const user = auth.currentUser;
      const newFileName = `${imageName}`;
      const storageRef = ref(storage, `${user.email}/images/${newFileName}`);
  
      await uploadBytes(storageRef, imageFile);
      const uploadedImageUrl = await getDownloadURL(storageRef);
  
      // Update the state with the actual image URL from Firebase Storage
      setImageUrl(uploadedImageUrl);
  
      const imageRef = doc(db, 'images', userUid);
      const imageData = {
        file: 'image',
        ownerId: user.uid,
        views: 0,
        likeCount: 0,
        email: email,
        username: username,
        imageName,
        imageDescription,
        creatorStatus,
        imageType,
        imagePrice: imageType === 'On Sale Image' ? parseFloat(imagePrice) : 0,
        imageUrl: uploadedImageUrl,
        timestamp: new Date().toISOString(),
        imageSize: (imageFile.size / (1024 * 1024)).toFixed(2),
      };
  
      // Fetch the current document
      const existingImageDoc = await getDoc(imageRef);
      
      if (existingImageDoc.exists() && Array.isArray(existingImageDoc.data().images)) {
        // Document exists, append to the array
        const existingImages = existingImageDoc.data().images || [];
        const newImages = [...existingImages, imageData];
        await setDoc(imageRef, { images: newImages }, { merge: true });
        setIsPosting(false); // Reset isPosting to false when the video is successfully posted
      } else {
        // Document does not exist, create a new array
        await setDoc(imageRef, { images: [imageData] });
        setIsPosting(false); // Reset isPosting to false when the video is successfully posted
      }

      // updating image in user document
      // Get the current user document
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      // Increment the profilepic value by 1
      const newImagesValue = (userData.images || 0) + 1;

      // Update the user document with the new profilepic value
      await updateDoc(doc(db, 'users', user.uid), { images: newImagesValue });

      // finished
  
      setDialogueMessage('Image posted successfully!');
      setShowDialogue(true); // Display the success message
      navigate('/');
    } catch (error) {
      setIsPosting(false); // Reset isPosting to false when the video has error
      console.error('Error posting image:', error);
      setDialogueMessage(`Failed to post image: ${error.message}`);
      setShowDialogue(true); // Display the error message
    }
  };

  const clearError = (field) => {
    setErrors((prevErrors) => ({ ...prevErrors, [field]: '' }));
  };

  return (
    <>
      <Header />
      {loading ? (
        <div className="loading-page">
          <div className="loading-circle"></div>
        </div>
      ) : (
        <div className="image-container">
          <div className="image-profile-info-container"> 
            <div className="image-profile-pic-container">
              <img src={profilePic} alt="Profile" className="profile-pic" />
            </div>
            <div className="image-username-container">
              <div className="username">Username: {username}</div>
              <div className="plan">Plan: {plan}</div>
            </div>
          </div>
          <div className="image-upload-container">
            <div className="image-placeholder" onClick={() => document.getElementById('image-upload-input').click()}>
              {imageUrl ? (
                <img src={imageUrl} alt="Selected" className="selected-image" />
              ) : (
                <span>+</span>
              )}
            </div>
            <div className="image-pc-right">
              <input
                id="image-upload-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              {errors.imageFile ? (
                <div className="image-error-message" id="image-file-error">
                  {errors.imageFile}
                </div>
              ): <div style={{color: 'white'}}>{imageFileSize}</div>}

              <input
                type="text"
                value={imageName} maxLength="12"
                onChange={(e) => {
                  setImageName(e.target.value);
                  clearError('imageName');
                }}
                placeholder="Image Name"
                className="image-input"
              />
              {errors.imageName && <div className="image-error-message">{errors.imageName}</div>}

              <input
                type="text"
                value={imageDescription}
                onChange={(e) => {
                  setImageDescription(e.target.value);
                  clearError('imageDescription');
                }}
                placeholder="Image Description"
                className="image-input"
              />
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="creatorStatus"
                    value="I am the Creator"
                    onChange={(e) => {
                      setCreatorStatus(e.target.value);
                      clearError('creatorStatus');
                    }}
                  />
                  I am the Creator
                </label>
                <label>
                  <input
                    type="radio"
                    name="creatorStatus"
                    value="I am not the Creator"
                    onChange={(e) => {
                      setCreatorStatus(e.target.value);
                      clearError('creatorStatus');
                    }}
                  />
                  I am not the Creator
                </label>
                <label>
                  <input
                    type="radio"
                    name="creatorStatus"
                    value="It may be subjected to copyrights"
                    onChange={(e) => {
                      setCreatorStatus(e.target.value);
                      clearError('creatorStatus');
                    }}
                  />
                  It may be subjected to copyrights
                </label>
              </div>
              {errors.creatorStatus && <div className="image-error-message">{errors.creatorStatus}</div>}

              <select
                value={imageType}
                onChange={(e) => {
                  setImageType(e.target.value);
                  clearError('imageType');
                }}
                className="image-select"
              >
                <option value="">Free or Paid?</option>
                <option value="Free Image">Free Image</option>
                <option value="On Sale Image">On Sale Image</option>
              </select>
              {errors.imageType && <div className="image-error-message">{errors.imageType}</div>}
              {imageType === 'On Sale Image' && (
                <input
                  type="number"
                  value={imagePrice}
                  onChange={(e) => {
                    setImagePrice(e.target.value);
                    clearError('imagePrice');
                  }}
                  placeholder="Image Price in $USD"
                  max={priceLimit}
                  className="image-input"
                />
              )}
              {errors.imagePrice && <div className="image-error-message">{errors.imagePrice}</div>}

              <button className="post-button" onClick={handlePostImage}>
                Post
              </button>

              {isPosting && (
                <div className="loading-circlee"></div>
              )}

              {showDialogue && (
        <div className="dialogue-box">
          <p>{dialogueMessage}</p>
          <button onClick={() => setShowDialogue(false)}>OK</button>
        </div>
      )}

            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
};

export default Image;
