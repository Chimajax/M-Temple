import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Home from './components/Home';
import Footer from './components/Footer';
import SignIn from './components/SignIn';
import Register from './components/Register';
import EditProfile from './components/EditProfile';
import Profile from './components/Profile';
import Plan from './components/Plan';
import Quote from './components/Quote';
import Notification from './components/Notification';
import ViewEbook from './components/ViewEbook';
import ViewPost from './components/ViewPost';
import ViewImage from './components/ViewImage';
import ViewVideo from './components/viewVideo';
import Image from './components/Image';
import Video from './components/Video';
import ImageSection from './components/ImageSection';
import VideoSection1 from './components/VideoSection1';
import Ebook from './components/Ebook';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import useRemainingTime from './hooks/useRemainingTime'; // Import the custom hook
import MyQuotes from './components/MyQuotes';
import MyImages from './components/MyImages';
import MyVideos from './components/MyVideos';
import MyEbooks from './components/MyEbooks';
import Bookmark from './components/Bookmark';
import Pin from './components/Pin';
import ViewProfile from './components/ViewProfile';
import Support from './components/Support';
import CartPage from './components/CartPage';
import Withdraw from './components/Withdraw';
import About from './components/About';

// Firebase imports
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const App = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [initialRemainingTime, setInitialRemainingTime] = useState(0);
  const [remainingTime, setRemainingTime] = useRemainingTime(initialRemainingTime);

  const auth = getAuth();
  const db = getFirestore();

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsSignedIn(true);

        // Fetch user data and initialize remaining time
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fetchedRemainingTime = userData.remainingTime || 0;
          setInitialRemainingTime(fetchedRemainingTime);
          setRemainingTime(fetchedRemainingTime);
        }
      } else {
        setIsSignedIn(false);
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={isSignedIn ? <Navigate to="/profile" /> : <SignIn />} />
          <Route path="/register" element={<Register />} />
          <Route path="/editprofile" element={<EditProfile />} />
          <Route path="/profile" element={isSignedIn ? <Profile /> : <Navigate to="/signin" />} />
          <Route path="/plan" element={<Plan remainingTime={remainingTime} setRemainingTime={setRemainingTime} />} />
          <Route path="/quote" element={isSignedIn ? <Quote /> : <Navigate to="/signin" />} />
          <Route path="/image" element={isSignedIn ? <Image /> : <Navigate to="/signin" />} />
          <Route path="/imagesection" element={isSignedIn ? <ImageSection /> : <Navigate to="/signin" />} />
          <Route path="/notification" element={isSignedIn ? <Notification /> : <Navigate to="/signin" />} />
          <Route path="/viewimage" element={isSignedIn ? <ViewImage /> : <Navigate to="/signin" />} />
          <Route path="/viewpost" element={<ViewPost />} />
          <Route path="/video" element={isSignedIn ? <Video /> : <Navigate to="/signin" />} />
          <Route path="/videosection1" element={<VideoSection1 />} />
          <Route path="/viewVideo" element={isSignedIn ? <ViewVideo /> : <Navigate to="/signin" />} />
          <Route path="/ebook" element={isSignedIn ? <Ebook /> : <Navigate to="/signin" />} />
          <Route path="/viewebook" element={isSignedIn ? <ViewEbook /> : <Navigate to="/signin" />} />
          <Route path="/myquotes" element={isSignedIn ? <MyQuotes /> : <Navigate to="/signin" />} />
          <Route path="/myimages" element={isSignedIn ? <MyImages /> : <Navigate to="/signin" />} />
          <Route path="/myvideos" element={isSignedIn ? <MyVideos /> : <Navigate to="/signin" />} />
          <Route path="/myebooks" element={isSignedIn ? <MyEbooks /> : <Navigate to="/signin" />} />
          <Route path="/bookmark" element={<Bookmark />} />
          <Route path="/pin" element={isSignedIn ? <Pin /> : <Navigate to="/signin" />} />
          <Route path="/viewprofile" element={isSignedIn ? <ViewProfile /> : <Navigate to="/signin" />} />
          <Route path="/support" element={<Support />} />
          <Route path="/cartpage" element={isSignedIn ? <CartPage /> : <Navigate to="/signin" />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/about" element={<About />} />
          {/* Add more routes here as needed */}
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
