import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './About.css'; // You can create custom CSS for styling

const About = () => {
  return (
    <>
      <Header />
      <div className="small-height"></div>
      <div className="about-container">
        <h1>Welcome to M-Temple!</h1>
        <p>
          M-Temple is your go-to social platform for sharing exciting, educational, and inspirational content. Whether you're here to spread knowledge or share a laugh, M-Temple offers a space where everyone can connect, create, and enjoy valuable content. 
        </p>
        <p>
          Our mission is simple: create a positive, fun, and educational environment where users feel inspired to share their creativity and ideas. We believe in the power of community, so we encourage you to engage with others, learn new things, and have a great time!
        </p>

        <h2>What can you do on M-Temple?</h2>
        <ul>
          <li>Post quotes, funny moments, and educational content.</li>
          <li>Follow creators who inspire you and like the content you enjoy.</li>
          <li>Start discussions or comment on posts to connect with others.</li>
        </ul>

        <h2>Our Rules for a Great Community</h2>
        <p>To keep M-Temple an exciting and safe space for everyone, we have a few simple rules:</p>
        <ol>
          <li>
            <strong>Be Respectful:</strong> Treat everyone with kindness. No harassment, bullying, or offensive language will be tolerated.
          </li>
          <li>
            <strong>Share Positive Content:</strong> Share things that add value—whether it's educational, fun, or inspirational. Negative or harmful content will be removed.
          </li>
          <li>
            <strong>No Spamming:</strong> Please avoid posting repetitive or irrelevant content. We want to keep the feed meaningful and fun for everyone!
          </li>
          <li>
            <strong>Give Credit:</strong> If you're sharing someone else's work, make sure to give them the credit they deserve.
          </li>
          <li>
            <strong>Stay Safe:</strong> Don't share personal or sensitive information publicly. Your safety is our priority!
          </li>
        </ol>

        <h2>Join Us Today!</h2>
        <p>
          Ready to join the M-Temple? Sign up, start sharing, and become a part of our growing community. Let’s learn, laugh, and share fun together!
        </p>
      </div>
      <Footer />
    </>
  );
};

export default About;