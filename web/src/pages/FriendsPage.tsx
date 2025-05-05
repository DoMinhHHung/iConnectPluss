import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../redux/hooks";
import axios from "axios";
import "../scss/FriendsPage.scss";

// Định nghĩa kiểu dữ liệu cho bạn bè và yêu cầu kết bạn
interface User {
  _id: string;
  name: string;
  avt?: string;
  email?: string;
  status?: "online" | "offline";
  lastActive?: string;
}

interface Friend {
  _id: string;
  requester: User;
  recipient: User;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

interface FriendRequest {
  _id: string;
  requester: User;
  recipient: User;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

const FriendsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<"friends" | "sent" | "received">(
    "friends"
  );
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    // Kiểm tra xác thực người dùng
    if (!isAuthenticated) {
      console.log("Người dùng chưa xác thực, chuyển hướng đến trang đăng nhập");
      navigate("/login");
      return;
    }

    console.log("Người dùng đã xác thực, bắt đầu tải dữ liệu bạn bè");
    fetchFriendsData();
  }, [isAuthenticated, navigate]);

  const fetchFriendsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("Không tìm thấy token xác thực");
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        setLoading(false);
        return;
      }

      console.log("Đang tải danh sách bạn bè...");
      // Lấy danh sách bạn bè
      try {
        const friendsResponse = await axios.get(
          "http://localhost:3005/api/friendship",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("Dữ liệu bạn bè:", friendsResponse.data);
        setFriends(friendsResponse.data || []);
      } catch (friendsErr: any) {
        console.error("Lỗi khi tải danh sách bạn bè:", friendsErr);
        setError(
          friendsErr.response?.data?.message ||
            "Không thể tải danh sách bạn bè. Vui lòng thử lại sau."
        );
      }

      console.log("Đang tải tất cả yêu cầu kết bạn...");
      // Lấy tất cả yêu cầu kết bạn (thay vì gọi riêng lẻ)
      try {
        const requestsResponse = await axios.get(
          "http://localhost:3005/api/friendship/requests",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("Dữ liệu yêu cầu kết bạn:", requestsResponse.data);

        // Phân tách dữ liệu thành yêu cầu đã gửi và đã nhận
        if (requestsResponse.data) {
          setSentRequests(requestsResponse.data.sent || []);
          setReceivedRequests(requestsResponse.data.received || []);
        }
      } catch (requestsErr: any) {
        console.error("Lỗi khi tải yêu cầu kết bạn:", requestsErr);
        // Tiếp tục xử lý mà không dừng luồng
      }
    } catch (err: any) {
      console.error("Lỗi tổng thể khi tải dữ liệu bạn bè:", err);
      setError(
        err.response?.data?.message ||
          "Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:3005/api/search/users?q=${encodeURIComponent(
          searchQuery
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Kết quả tìm kiếm:", response.data);
      setSearchResults(response.data || []);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3005/api/friendship/send-request",
        { recipientId: userId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Cập nhật lại danh sách yêu cầu đã gửi
      fetchFriendsData();
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3005/api/friendship/accept-request",
        { friendshipId: requestId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Cập nhật lại danh sách bạn bè và yêu cầu
      fetchFriendsData();
    } catch (err) {
      console.error("Error accepting friend request:", err);
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3005/api/friendship/reject-request",
        { friendshipId: requestId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Cập nhật lại danh sách yêu cầu
      fetchFriendsData();
    } catch (err) {
      console.error("Error rejecting friend request:", err);
    }
  };

  const cancelFriendRequest = async (requestId: string) => {
    try {
      const token = localStorage.getItem("token");
      // Đơn giản là gọi API từ chối, vì không có API hủy riêng
      await axios.post(
        "http://localhost:3005/api/friendship/reject-request",
        { friendshipId: requestId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Cập nhật lại danh sách yêu cầu đã gửi
      fetchFriendsData();
    } catch (err) {
      console.error("Error canceling friend request:", err);
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:3005/api/friendship/unfriend/${friendId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Cập nhật lại danh sách bạn bè
      fetchFriendsData();
    } catch (err) {
      console.error("Error removing friend:", err);
    }
  };

  const renderFriendsList = () => {
    if (friends.length === 0) {
      return (
        <div className="empty-state">
          <p>
            Bạn chưa có người bạn nào. Hãy tìm kiếm và kết bạn với mọi người!
          </p>
        </div>
      );
    }

    return (
      <div className="friends-list">
        {friends.map((friendship: Friend) => {
          // Xác định thông tin người bạn (có thể là requester hoặc recipient)
          const currentUserId = user?._id;
          const friend =
            friendship.requester._id === currentUserId
              ? friendship.recipient
              : friendship.requester;

          return (
            <div key={friendship._id} className="friend-item">
              <div className="friend-avatar">
                {friend.avt ? (
                  <img src={friend.avt} alt={friend.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {friend.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className={`status-indicator ${friend.status || "offline"}`}
                ></span>
              </div>
              <div className="friend-info">
                <h3 className="friend-name">{friend.name}</h3>
                <p className="friend-status">
                  {friend.status === "online"
                    ? "Đang hoạt động"
                    : "Ngoại tuyến"}
                </p>
              </div>
              <div className="friend-actions">
                <button
                  className="chat-button"
                  onClick={() => navigate(`/chat/${friend._id}`)}
                >
                  Nhắn tin
                </button>
                <button
                  className="remove-button"
                  onClick={() => removeFriend(friend._id)}
                >
                  Hủy kết bạn
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSentRequests = () => {
    if (sentRequests.length === 0) {
      return (
        <div className="empty-state">
          <p>Bạn chưa gửi lời mời kết bạn nào.</p>
        </div>
      );
    }

    return (
      <div className="requests-list">
        {sentRequests.map((request) => (
          <div key={request._id} className="request-item">
            <div className="request-avatar">
              {request.recipient.avt ? (
                <img src={request.recipient.avt} alt={request.recipient.name} />
              ) : (
                <div className="avatar-placeholder">
                  {request.recipient.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="request-info">
              <h3 className="request-name">{request.recipient.name}</h3>
              <p className="request-date">
                Đã gửi lời mời:{" "}
                {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="request-actions">
              <button
                className="cancel-button"
                onClick={() => cancelFriendRequest(request._id)}
              >
                Hủy lời mời
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderReceivedRequests = () => {
    if (receivedRequests.length === 0) {
      return (
        <div className="empty-state">
          <p>Bạn không có lời mời kết bạn nào.</p>
        </div>
      );
    }

    return (
      <div className="requests-list">
        {receivedRequests.map((request) => (
          <div key={request._id} className="request-item">
            <div className="request-avatar">
              {request.requester.avt ? (
                <img src={request.requester.avt} alt={request.requester.name} />
              ) : (
                <div className="avatar-placeholder">
                  {request.requester.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="request-info">
              <h3 className="request-name">{request.requester.name}</h3>
              <p className="request-date">
                Nhận lời mời: {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="request-actions">
              <button
                className="accept-button"
                onClick={() => acceptFriendRequest(request._id)}
              >
                Đồng ý
              </button>
              <button
                className="reject-button"
                onClick={() => rejectFriendRequest(request._id)}
              >
                Từ chối
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSearchResults = () => {
    if (searchResults.length === 0 && searchQuery.trim()) {
      return (
        <div className="empty-state">
          <p>Không tìm thấy người dùng nào phù hợp.</p>
        </div>
      );
    }

    return (
      <div className="search-results">
        {searchResults.map((result) => {
          // Kiểm tra xem đã là bạn bè chưa
          const isFriend = friends.some((friendship) => {
            const friend =
              friendship.requester._id === user?._id
                ? friendship.recipient._id
                : friendship.requester._id;
            return friend === result._id;
          });

          // Kiểm tra xem đã gửi lời mời chưa
          const hasSentRequest = sentRequests.some(
            (request) => request.recipient._id === result._id
          );

          // Kiểm tra xem đã nhận lời mời chưa
          const hasReceivedRequest = receivedRequests.some(
            (request) => request.requester._id === result._id
          );

          return (
            <div key={result._id} className="search-result-item">
              <div className="result-avatar">
                {result.avt ? (
                  <img src={result.avt} alt={result.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {result.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="result-info">
                <h3 className="result-name">{result.name}</h3>
                <p className="result-email">{result.email}</p>
              </div>
              <div className="result-actions">
                {isFriend ? (
                  <button
                    className="chat-button"
                    onClick={() => navigate(`/chat/${result._id}`)}
                  >
                    Nhắn tin
                  </button>
                ) : hasSentRequest ? (
                  <button className="pending-button" disabled>
                    Đã gửi lời mời
                  </button>
                ) : hasReceivedRequest ? (
                  <button
                    className="accept-button"
                    onClick={() => {
                      const request = receivedRequests.find(
                        (req) => req.requester._id === result._id
                      );
                      if (request) {
                        acceptFriendRequest(request._id);
                      }
                    }}
                  >
                    Đồng ý kết bạn
                  </button>
                ) : (
                  <button
                    className="add-button"
                    onClick={() => sendFriendRequest(result._id)}
                  >
                    Kết bạn
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading && !isSearching) {
    return <div className="loading">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="friends-page">
      <div className="friends-header">
        <h1>Bạn bè</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
          <button className="search-button" onClick={handleSearch}>
            Tìm kiếm
          </button>
        </div>
      </div>

      {searchQuery.trim() && (
        <div className="search-section">
          <h2>Kết quả tìm kiếm</h2>
          {isSearching ? (
            <div className="loading-search">Đang tìm kiếm...</div>
          ) : (
            renderSearchResults()
          )}
          <button
            className="close-search-button"
            onClick={() => {
              setSearchQuery("");
              setSearchResults([]);
            }}
          >
            Đóng tìm kiếm
          </button>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "friends" ? "active" : ""}`}
          onClick={() => setActiveTab("friends")}
        >
          Bạn bè ({friends.length})
        </button>
        <button
          className={`tab-button ${activeTab === "received" ? "active" : ""}`}
          onClick={() => setActiveTab("received")}
        >
          Lời mời đã nhận ({receivedRequests.length})
        </button>
        <button
          className={`tab-button ${activeTab === "sent" ? "active" : ""}`}
          onClick={() => setActiveTab("sent")}
        >
          Lời mời đã gửi ({sentRequests.length})
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="tab-content">
        {activeTab === "friends" && renderFriendsList()}
        {activeTab === "sent" && renderSentRequests()}
        {activeTab === "received" && renderReceivedRequests()}
      </div>
    </div>
  );
};

export default FriendsPage;
