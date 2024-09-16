import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Ebook.css'; // Create a CSS file similar to Video.css

const Ebook = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [ebookFile, setEbookFile] = useState(null);
  const [coverUrl, setCoverUrl] = useState('');
  const [ebookUrl, setEbookUrl] = useState('');
  const [ebookName, setEbookName] = useState('');
  const [ebookDescription, setEbookDescription] = useState('');
  const [creatorStatus, setCreatorStatus] = useState('');
  const [ebookType, setEbookType] = useState('');
  const [ebookPrice, setEbookPrice] = useState('');
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState(null);
  const [priceLimit] = useState(0);
  const [errors, setErrors] = useState({});
  const [showDialogue, setShowDialogue] = useState(false);
  const [dialogueMessage, setDialogueMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);

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

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      const previewUrl = URL.createObjectURL(file);
      setCoverUrl(previewUrl);
      clearError('coverFile');
    }
  };

  const handleEbookUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEbookFile(file);
      const previewUrl = URL.createObjectURL(file);
      setEbookUrl(previewUrl);
      clearError('ebookFile'); // Clear error message for ebook file
    }
  };

  const handlePostEbook = async () => {
    setIsPosting(true); // Set isPosting to true when the post button is clicked
    try {
      let errorMessages = {};


      const fileSizeLimit = plan === 'FREE' ? 15 * 1024 * 1024 : plan === 'PRO' ? 50 * 1024 * 1024 : 500;

      if (ebookFile && ebookFile.size > fileSizeLimit) {
        errorMessages.ebookFile = `File size exceeds limit for ${plan} plan (${fileSizeLimit / 1024 / 1024} MB)`;
      }


      if (!coverFile) errorMessages.coverFile = 'Please upload a cover image.';
      if (!ebookFile) errorMessages.ebookFile = 'Please upload an ebook file.';
      if (ebookName.trim() === '') errorMessages.ebookName = 'Ebook name is required.';
      if (creatorStatus === '') errorMessages.creatorStatus = 'Please select creator status.';
      if (ebookType === '') errorMessages.ebookType = 'Is it Free or For Sale?';

      let priceLimit = 0;
      if (plan === 'FREE') {
        priceLimit = 7;
      } else if (plan === 'PRO') {
        priceLimit = 15;
      } else {
        priceLimit = 100;
      }

      if (ebookType === 'On Sale Ebook') {
        if (isNaN(parseFloat(ebookPrice)) || parseFloat(ebookPrice) <= 0.01) {
          errorMessages.ebookPrice = 'Please enter a valid price';
        } else if (parseFloat(ebookPrice) > priceLimit) {
          errorMessages.ebookPrice = `Your Plan is ${plan} and has a limit of setting max ${priceLimit} USD per Ebook`;
        }
      }

      if (Object.keys(errorMessages).length > 0) {
        setErrors(errorMessages);
        setIsPosting(false);
        return;
      }

      const user = auth.currentUser;
      const newCoverName = `${ebookName}`; //(cover-${coverFile.name})`;
      const newEbookName = `${ebookName}`; //(${ebookFile.name})`;
      const coverRef = ref(storage, `${user.email}/covers/${newCoverName}`);
      const ebookRef = ref(storage, `${user.email}/ebooks/${newEbookName}`);

      await uploadBytes(coverRef, coverFile);
      await uploadBytes(ebookRef, ebookFile);

      const uploadedCoverUrl = await getDownloadURL(coverRef);
      const uploadedEbookUrl = await getDownloadURL(ebookRef);

      setCoverUrl(uploadedCoverUrl);
      setEbookUrl(uploadedEbookUrl);

      const ebookRefDoc = doc(db, 'ebooks', userUid);
      const ebookData = {
        file: 'ebook',
        views: 0,
        likeCount: 0,
        email: email,
        username: username,
        ebookName,
        ebookDescription,
        creatorStatus,
        ebookType,
        ebookPrice: ebookType === 'On Sale Ebook' ? parseFloat(ebookPrice) : 0,
        coverUrl: uploadedCoverUrl,
        ebookUrl: uploadedEbookUrl,
        timestamp: new Date().toISOString(),
        ownerId: user.uid,
        ebookSize: (ebookFile.size / (1024 * 1024)).toFixed(2),
      };

      const existingEbookDoc = await getDoc(ebookRefDoc);

      if (existingEbookDoc.exists() && Array.isArray(existingEbookDoc.data().ebooks)) {
        const existingEbooks = existingEbookDoc.data().ebooks || [];
        const newEbooks = [...existingEbooks, ebookData];
        await setDoc(ebookRefDoc, { ebooks: newEbooks }, { merge: true });
      } else {
        await setDoc(ebookRefDoc, { ebooks: [ebookData] });
      }

      // updating ebooks in user document
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      const newEbooksValue = (userData.ebooks || 0) + 1;

      await updateDoc(doc(db, 'users', user.uid), { ebooks: newEbooksValue });

      setDialogueMessage('Ebook posted successfully!');
      setShowDialogue(true);
      navigate('/');
    } catch (error) {
      setIsPosting(false);
      console.error('Error posting ebook:', error);
      setDialogueMessage(`Failed to post ebook: ${error.message}`);
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
        <div className="ebook-container">
          <div className="ebook-profile-info-container">
            <div className="ebook-profile-pic-container">
              <img src={profilePic} alt="Profile" className="profile-pic" />
            </div>
            <div className="ebook-username-container">
              <h3>{username}</h3>
              <p>Plan: {plan}</p>
            </div>
          </div>


          <div className="ebook-upload-container">
          <div className="ebook-upload-container-1">
          <div className="ebook-upload-input">
                <label>Cover Image:</label>
                <div className="ebook-cover-upload">
                    <div className="ebook-upload-cover-placeholder" onClick={() => document.getElementById('cover-input').click()}>
                    {coverUrl ? (
                        <img src={coverUrl} alt="Cover Preview" className="ebook-cover-preview" />
                    ) : (
                        <span>+ </span>
                    )}
                    </div>
                    <input type="file" id="cover-input" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
                    {errors.coverFile && <p className="ebook-error-message">{errors.coverFile}</p>}
                </div>
            </div>
            <div className="ebook-upload-input">
              <label>Upload Ebook File:</label>
              <div className="ebook-select">
              <input type="file" accept=".pdf,.epub" onChange={handleEbookUpload} />
              {ebookUrl && (
                    <p>
                      Ebook File Selected: {ebookFile && `${(ebookFile.size / (1024 * 1024)).toFixed(2)} MB`}
                    </p>
                  )}
              {errors.ebookFile && <p className="ebook-error-message">{errors.ebookFile}</p>}
              </div>
            </div>
            </div>

            <div className="ebook-upload-container-2">
            <div className="ebook-upload-input">
              <label>Ebook Name:</label>
              <div className="ebook-name-upload-input">
              <input
                type="text"
                value={ebookName} maxLength="20"
                onChange={(e) => {
                  setEbookName(e.target.value);
                  clearError('ebookName'); // Clear error on new input
                   }}
                    onBlur={() => clearError('ebookName')}
                    className={`ebook-input ${errors.ebookName ? 'input-error' : ''}`}
                    placeholder="Enter Ebook Name"
                    />
                    {errors.ebookName && <p className="ebook-error-message">{errors.ebookName}</p>}
                    </div>
                  </div>
                  <div className="ebook-upload-input">
                    <label>Ebook Description:</label>
                    <div className="ebook-description">
                    <textarea
                      value={ebookDescription} maxLength="100"
                      onChange={(e) => setEbookDescription(e.target.value)}
                      onBlur={() => clearError('ebookDescription')}
                      className={`ebook-input ${errors.ebookDescription ? 'input-error' : ''}`}
                      placeholder="Enter a brief description of your ebook"
                    ></textarea>
                    {errors.ebookDescription && <p className="ebook-error-message">{errors.ebookDescription}</p>}
                    </div>
                  </div>
                  <div className="ebook-upload-input">
                    <label>Creator Status:</label>
                    <div className="ebook-creator-status">
                    <select
                      value={creatorStatus}
                      onChange={(e) => setCreatorStatus(e.target.value)}
                      onBlur={() => clearError('creatorStatus')}
                      className={`ebook-input ${errors.creatorStatus ? 'input-error' : ''}`}
                    >
                      <option value="">Owner?</option>
                      <option value="I Am The Owner">Author</option>
                      <option value="I Am not The Owner">I am not The Owner</option>
                      <option value="It May Be Subjected to Copyrights">Possible-Copyright</option>
                    </select>
                    {errors.creatorStatus && <p className="ebook-error-message">{errors.creatorStatus}</p>}
                    </div>
                  </div>
                  <div className="ebook-upload-input">
                    <label>Is it Free or For Sale?:</label>
                    <div className="ebook-type">
                    <select
                      value={ebookType}
                      onChange={(e) => {setEbookType(e.target.value);
                        clearError('ebookType'); // Clear error on new input
                      }}
                      onBlur={() => clearError('ebookType')}
                      className={`ebook-input ${errors.ebookType ? 'input-error' : ''}`}
                    >
                      <option value="">Select ebook type</option>
                      <option value="Free Ebook">Free Ebook</option>
                      <option value="On Sale Ebook">On Sale Ebook</option>
                    </select>
                    {errors.ebookType && <p className="ebook-error-message">{errors.ebookType}</p>}
                  </div>
                  {ebookType === 'On Sale Ebook' && (
                    <div className="ebook-upload-input">
                      <label>Ebook Price (USD):</label>
                      <input
                        type="number"
                        value={ebookPrice}
                        onChange={(e) => {
                          setEbookPrice(e.target.value);
                          clearError('ebookPrice');
                        }}
                        onBlur={() => clearError('ebookPrice')}
                        className={`ebook-input ${errors.ebookPrice ? 'input-error' : ''}`}
                        placeholder="Set a price for your ebook"
                      />
                      {errors.ebookPrice && <p className="ebook-error-message">{errors.ebookPrice}</p>}
                    </div>
                  )}
                  </div>
                  <div className="ebook-upload-button">
                    <button onClick={handlePostEbook} disabled={isPosting}>
                      {isPosting ? 'Posting...' : 'Post Ebook'}
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {showDialogue && (
              <div className="dialogue-box">
                <p>{dialogueMessage}</p>
                <button onClick={() => setShowDialogue(false)}>OK</button>
              </div>
            )}
            <Footer />
          </>
        );
      };
      
      export default Ebook;
