import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import './Support.css'; // Optional CSS for styling
import sendIcon from '../assets/icons/send-icon.png';
import unreadIcon from '../assets/icons/unread-icon.png';
import readIcon from '../assets/icons/read-icon.png';
import Footer from './Footer';
import Header from './Header';

const Support = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Fetch messages from the Firestore "supports" collection
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser) {
        return null;
      }

      try {
        if (currentUser) {
          const supportsDocRef = doc(db, 'supports', currentUser.uid);
          const docSnapshot = await getDoc(supportsDocRef);

          if (docSnapshot.exists()) {
            // Retrieve messages array from the document data
            const data = docSnapshot.data();
          const messages = data.messages || [];

          // Update !sender messages with "read: true"
          const updatedMessages = messages.map((msg) => {
            if (!msg.sender || msg.sender !== true) {
              if (!msg.timestamp) {
                msg.timestamp = new Date(); // Add current timestamp if missing
              }
              return { ...msg, read: true };
            }
            return msg;
          });

          // Update the Firestore document with the updated messages array
          await updateDoc(supportsDocRef, {
            messages: updatedMessages,
          });

          setMessages(updatedMessages);
          } else {
            // Document doesn't exist, create a new one with a welcome message
            const welcomeMessage = {
              note: "Welcome to customer support, how can i help you?",
              timestamp: new Date(),
              sender: false, // false means the message is from the support team
              read: true,
            };

            await setDoc(supportsDocRef, {
              messages: [welcomeMessage],
            });

            // Set the messages array to include the welcome message
            setMessages([welcomeMessage]);

            console.log('New document created with a welcome message');
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [db, currentUser]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return; // Prevent sending empty messages

    const message = {
      sender: true, // true means the current user sent the message
      read: false,
      note: newMessage,
      timestamp: new Date(),
    };

    try {
      if (currentUser) {
        const supportsDocRef = doc(db, 'supports', currentUser.uid);

        // Send the new message by adding it to the "messages" array in the "supports" document
        await updateDoc(supportsDocRef, {
          messages: arrayUnion(message),
        });

        // Update the state to include the new message
        setMessages((prevMessages) => [...prevMessages, message]);

        // Clear the input after sending
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <>
    <Header />
    <div className="support-container">
    <div className="small-height"></div>
      <div className="messages-container">
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`message-box ${msg.sender ? 'sent' : 'received'}`}
            >
              {msg.note}
              <p className="timestamp">
                  {msg.timestamp instanceof Date
                    ? 'Just now - Today'
                    : `${new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() || 'just now'} -
                      ${new Date(msg.timestamp.seconds * 1000).toLocaleDateString() || 'Today'}`}
                </p>
               {msg.sender && <div className="read-icon"><img src={msg.read ? readIcon : unreadIcon} alt="read Icon" /></div>}
               
            </div>
            
          ))
        ) : (
          <p>No messages yet</p>
        )}
        <div className="small-height"></div> {/*i got this from Editprofile,js*/}
        <div className="small-height"></div>
      </div>

      <div className="message-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="message-input"
        />
        <button onClick={handleSendMessage} className="send-button">
          <div className="send-pic">
        <img src={sendIcon} alt="Send Icon" /></div>
        </button>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default Support;
