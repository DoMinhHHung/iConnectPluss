import React from "react";
import { useParams } from "react-router-dom";
import FriendList from "../components/FriendList";
import ChatInterface from "../components/ChatInterface";
import "../scss/ChatPage.scss";

const ChatPage: React.FC = () => {
  const { friendId } = useParams<{ friendId?: string }>();

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-sidebar">
          <FriendList />
        </div>
        <div className="chat-main">
          {friendId ? (
            <ChatInterface />
          ) : (
            <div className="welcome-container">
              <div className="welcome-icon">
                <i className="fas fa-comments"></i>
              </div>
              <h2>Chào mừng đến với iConnect Chat</h2>
              <p>Chọn một người bạn để bắt đầu trò chuyện</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
