import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Video.css'; // Create a CSS file similar to Image.css

const Video = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoName, setVideoName] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [creatorStatus, setCreatorStatus] = useState('');
  const [videoType, setVideoType] = useState('');
  const [videoPrice, setVideoPrice] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState(null);
  const [priceLimit] = useState(0);
  const [errors, setErrors] = useState({});
  const [showDialogue, setShowDialogue] = useState(false);
  const [dialogueMessage, setDialogueMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [videoFileSize, setVideoFileSize] = useState(''); 

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

  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailUrl(previewUrl);
    } 
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {

      let errorMessages = {};

      const fileSizeInMB = file.size / (1024 * 1024);
      setVideoFileSize(`${fileSizeInMB.toFixed(2)} MB`);
      if (plan === 'FREE' && fileSizeInMB > 30) {
        errorMessages.videoFile = 'Video file size exceeds 30MB limit for FREE plan';
        return;
      } else if (plan === 'PRO' && fileSizeInMB > 100) {
        errorMessages.videoFile = 'Video file size exceeds 100MB limit for PRO plan';
        return;
      } else if (plan === 'PRO+' && fileSizeInMB > 300) {
        errorMessages.videoFile = 'Video file size exceeds 300MB limit for PRO+ plan';
        return;
      }

      setVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setVideoUrl(previewUrl);
    }
  };

  const handlePostVideo = async () => {
    setIsPosting(true); // Set isPosting to true when the post button is clicked
  try {
    let errorMessages = {};

    if (!thumbnailFile) errorMessages.thumbnailFile = 'Please upload a thumbnail.';
    if (!videoFile) errorMessages.videoFile = 'Please upload a video.';
    if (videoName.trim() === '') errorMessages.videoName = 'Video name is required.';
    if (creatorStatus === '') errorMessages.creatorStatus = 'Please select creator status.';
    if (videoType === '') errorMessages.videoType = 'Is it Free or For Sale?';

    let priceLimit = 0;
    if (plan === 'FREE') {
      priceLimit = 7;
    } else if (plan === 'PRO') {
      priceLimit = 15;
    } else {
      priceLimit = 100;
    }

    if (videoType === 'On Sale Video') {
      if (isNaN(parseFloat(videoPrice)) || parseFloat(videoPrice) <= 0.01) {
        errorMessages.videoPrice = 'Please enter a valid price';
      } else if (parseFloat(videoPrice) > priceLimit) {
        errorMessages.videoPrice = `Your Plan is ${plan} and has a limit of setting max ${priceLimit} USD per Video`;
      }
    }

    if (Object.keys(errorMessages).length > 0) {
      setErrors(errorMessages);
      setIsPosting(false); // Set isPosting to true when the post button is clicked
      return;
    }

    // try {                Just know i used this to test the try
      const user = auth.currentUser;
      const newThumbnailName = `${videoName}`; //(thumbnail-${thumbnailFile.name})`;
      const newVideoName = `${videoName}`; //(${videoFile.name})`;
      const thumbnailRef = ref(storage, `${user.email}/thumbnails/${newThumbnailName}`);
      const videoRef = ref(storage, `${user.email}/videos/${newVideoName}`);

      await uploadBytes(thumbnailRef, thumbnailFile);
      await uploadBytes(videoRef, videoFile);

      const uploadedThumbnailUrl = await getDownloadURL(thumbnailRef);
      const uploadedVideoUrl = await getDownloadURL(videoRef);

      setThumbnailUrl(uploadedThumbnailUrl);
      setVideoUrl(uploadedVideoUrl);

      const videoRefDoc = doc(db, 'videos', userUid);
      const videoData = {
        file: 'video',
        views: 0,
        likeCount: 0,
        email: email,
        username: username,
        videoName,
        videoDescription,
        creatorStatus,
        videoType,
        videoPrice: videoType === 'On Sale Video' ? parseFloat(videoPrice) : 0,
        thumbnailUrl: uploadedThumbnailUrl,
        videoUrl: uploadedVideoUrl,
        timestamp: new Date().toISOString(),
        ownerId: userUid,
        videoSize: (videoFile.size / (1024 * 1024)).toFixed(2),
      };

      const existingVideoDoc = await getDoc(videoRefDoc);

      if (existingVideoDoc.exists() && Array.isArray(existingVideoDoc.data().videos)) {
        const existingVideos = existingVideoDoc.data().videos || [];
        const newVideos = [...existingVideos, videoData];
        await setDoc(videoRefDoc, { videos: newVideos }, { merge: true });
        setIsPosting(false); // Reset isPosting to false when the video is successfully posted
      } else {
        await setDoc(videoRefDoc, { videos: [videoData] });
      }


      // updating videos in user document
      // Get the current user document
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      // Increment the profilepic value by 1
      const newVideosValue = (userData.videos || 0) + 1;

      // Update the user document with the new profilepic value
      await updateDoc(doc(db, 'users', user.uid), { videos: newVideosValue });

      // finished

      setDialogueMessage('Video posted successfully!');
      setShowDialogue(true);
      navigate('/');
    } catch (error) {
        setIsPosting(false); // Reset isPosting to false when an error occurs
      console.error('Error posting video:', error);
      setDialogueMessage(`Failed to post video: ${error.message}`);
      setShowDialogue(true);
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
        <div className="video-container">
          <div className="video-profile-info-container">
            <div className="video-profile-pic-container">
              <img src={profilePic} alt="Profile" className="profile-pic" />
            </div>
            <div className="video-username-container">
              <div className="username">Username: {username}</div>
              <div className="plan">Plan: {plan}</div>
            </div>
          </div>
          <div className="video-upload-container">
          <div className="video-upload-container-1">
            <div className="video-thumbnail-placeholder" onClick={() => document.getElementById('thumbnail-upload-input').click()}>
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="Thumbnail" className="selected-thumbnail" />
              ) : (
                <span>Upload Your Thumbnail</span>
              )}
            </div>
            <input
              id="thumbnail-upload-input"
              type="file"
              accept="image/*"
              onChange={handleThumbnailUpload}
              style={{ display: 'none' }}
            />
            {errors.thumbnailFile && (
              <div className="video-error-message">
                {errors.thumbnailFile}
              </div>
            )}

            <div className="video-upload-placeholder" onClick={() => document.getElementById('video-upload-input').click()}>
              {videoUrl ? (
                <video src={videoUrl} className="selected-video" controls />
              ) : (
                <span>Upload Video Here</span>
              )}
            </div>
            <input
              id="video-upload-input"
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              style={{ display: 'none' }}
            />
            {errors.videoFile ? (
              <div className="video-error-message">
                {errors.videoFile}
              </div>
            ) : <div style={{color: 'white'}}>{videoFileSize}</div>}
            </div>


            <div  className="video-info-body">
             <input
              type="text" maxLength="15"
              value={videoName}
              onChange={(e) => {
                setVideoName(e.target.value);
                clearError('videoName');
            }}
            placeholder="Enter video name"
            className="video-name-input"
          />
          {errors.videoName && (
            <div className="video-error-message">
              {errors.videoName}
            </div>
          )}

          <textarea
            value={videoDescription}
            onChange={(e) => setVideoDescription(e.target.value)}
            placeholder="Enter video description"
            className="video-textarea"
          ></textarea>

          <div className="v-creator-status-container">
            <label>Creator Status:</label>
            <select
              value={creatorStatus}
              onChange={(e) => {
                setCreatorStatus(e.target.value);
                clearError('creatorStatus');
              }}
              className="creator-status-select"
            >
              <option value="">Select</option>
              <option value="I Am The Owner">I Own This Video</option>
              <option value="I Am Not The Owner">I Do Not Own This Video</option>
              <option value="It May Be Subjected to Copyright">It May be Subjected To Copyright</option>
            </select>
            {errors.creatorStatus && (
              <div className="video-error-message">
                {errors.creatorStatus}
              </div>
            )}
          </div>

          <div className="video-type-container">
            <label>Video Type:</label>
            <select
              value={videoType}
              onChange={(e) => {
                setVideoType(e.target.value);
                clearError('videoType');
              }}
              className="video-type-select"
            >
              <option value="">Select</option>
              <option value="Free Video">Free Video</option>
              <option value="On Sale Video">On Sale Video</option>
            </select>
            {errors.videoType && (
              <div className="video-error-message">
                {errors.videoType}
              </div>
            )}
          </div>

          {videoType === 'On Sale Video' && (
            <div className="video-price-container">
              <label>Video Price (USD):</label>
              <input
                type="text"
                value={videoPrice}
                onChange={(e) => {
                  setVideoPrice(e.target.value);
                  clearError('videoPrice');
                }}
                className="video-price-input"
                placeholder={`Max price: ${priceLimit} USD`}
              />
              {errors.videoPrice && (
                <div className="video-error-message">
                  {errors.videoPrice}
                </div>
              )}
            </div>
          )}

          <button onClick={handlePostVideo} className="video-post-button">
            Post Video
          </button>
          </div>

          {isPosting && (
            <div className="loading-circlee"></div>
            )}

          {showDialogue && (
            <div className="dialogue-box">
              <div className="dialogue-message">
                {dialogueMessage}
              </div>
              <button onClick={() => setShowDialogue(false)} className="dialogue-ok-button">
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    <Footer />
  </>
);
};

export default Video;

