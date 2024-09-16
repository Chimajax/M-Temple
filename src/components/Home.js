// src/components/Home.js
import React, { useState, useEffect  } from 'react';
import Header from './Header';
import BookSlider from './BookSlider';
import VideoSection from './VideoSection';
import VideoSection1 from './VideoSection1';
import './Home.css';
import { useNavigate } from 'react-router-dom';


const Home = () => {
  const [loading, setLoading] = useState(true); 


const navigate = useNavigate();

  useEffect(() => {
    // Add your condition here to set loading to false
    // For example, after 2 seconds
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (

    loading ? (
      <div className="loading-page">
        <div className="loading-circle"></div>
      </div>
    ) : (
    <div className="home">
      <Header />
      <div className="home-content">
        <h2>What's New?</h2>
        <BookSlider />
        <div className="dd-images-link" onClick={() => navigate('/imagesection')}>
          Click Here To See New Images
        </div>
        <VideoSection />
        <VideoSection1 />
      </div>
    </div>
   )
  );
};

export default Home;
