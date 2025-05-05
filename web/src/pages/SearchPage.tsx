import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../scss/SearchPage.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faCommentDots } from "@fortawesome/free-solid-svg-icons";
import { Socket } from "socket.io-client";
import * as io from "socket.io-client";
interface SearchResult {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  avt?: string;
  message?: string;
  type: "user" | "group" | "message";
  createdAt?: string;
}

interface FriendRequestData {
  friendshipId: string;
  requesterId: string;
  recipientId: string;
  requesterName?: string;
}

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryFromUrl = queryParams.get("q") || "";

  const [query, setQuery] = useState<string>(queryFromUrl);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<"all" | "users" | "groups" | "messages">(
    "all"
  );
  const [friendRequestsSent, setFriendRequestsSent] = useState<Set<string>>(
    new Set()
  );
  const [friendStatuses, setFriendStatuses] = useState<{
    [userId: string]:
      | "pending"
      | "accepted"
      | "rejected"
      | "friends"
      | "requested"
      | null
      | "error";
  }>({});
  const [friendRequests, setFriendRequests] = useState<FriendRequestData[]>([]);

  const [socket, setSocket] = useState<Socket | null>(null);
  const currentUserId = localStorage.getItem("userId");

  // Connect user to socket with userId for private messages
  useEffect(() => {
    const socketInstance = io.connect("http://localhost:3005");
    setSocket(socketInstance);
    if (currentUserId) {
      socketInstance.emit("joinUser", currentUserId);
      console.log("Connected to socket with userId:", currentUserId);
    }

    return () => {
      socketInstance.disconnect();
    };
  }, [currentUserId]);

  // --- Helper Functions ---
  const updateFriendStatus = useCallback(
    (
      userId: string,
      status:
        | "pending"
        | "accepted"
        | "rejected"
        | "friends"
        | "requested"
        | null
        | "error"
    ) => {
      setFriendStatuses((prev) => ({ ...prev, [userId]: status }));
    },
    []
  );

  // --- Fetch Status for a Single User ---
  const fetchFriendStatus = useCallback(
    async (userId: string) => {
      // Skip if userId is undefined or not valid
      if (!userId || userId === "undefined" || userId === "null") {
        console.log("Skipping friend status check for invalid userId:", userId);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `http://localhost:3005/api/friendship/status/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log(
          `Status for ${userId}:`,
          response.data,
          "Current user is:",
          currentUserId
        );
        updateFriendStatus(userId, response.data.status);
      } catch (error) {
        console.error("Error fetching friend status:", error);
        updateFriendStatus(userId, "error");
      }
    },
    [updateFriendStatus]
  );

  // --- Initial Status Fetch (on results change) ---
  useEffect(() => {
    results
      .filter((r) => r.type === "user")
      .forEach((user) => fetchFriendStatus(user._id));
  }, [results, fetchFriendStatus]);

  // --- Search Function ---
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) return;

      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `http://localhost:3005/api/search?q=${encodeURIComponent(
            searchQuery
          )}&filter=${filter}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("Search results:", response.data);
        setResults(response.data);
      } catch (error) {
        console.error("Lỗi tìm kiếm:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    if (queryFromUrl) {
      performSearch(queryFromUrl);
    }
  }, [queryFromUrl, filter, performSearch]);

  // --- Socket Listeners ---
  useEffect(() => {
    if (!socket || !currentUserId) return;

    // Lắng nghe sự kiện nhận yêu cầu kết bạn mới
    socket.on(
      "friendRequestReceived",
      (data: FriendRequestData & { requesterName: string }) => {
        console.log("Received friend request via socket:", data);

        // Kiểm tra nếu currentUserId là người nhận
        if (currentUserId === data.recipientId) {
          // Thêm vào danh sách yêu cầu kết bạn và cập nhật giao diện
          setFriendRequests((prev) => {
            // Kiểm tra trùng lặp
            if (prev.some((req) => req.friendshipId === data.friendshipId)) {
              return prev;
            }
            return [...prev, { ...data }];
          });

          // Đánh dấu trạng thái của người gửi là "requested" để hiển thị đúng UI
          updateFriendStatus(data.requesterId, "requested");

          // Hiển thị thông báo cho người dùng
          alert(
            `${
              data.requesterName || "Có người"
            } đã gửi lời mời kết bạn cho bạn!`
          );
        }
      }
    );

    // Lắng nghe sự kiện yêu cầu kết bạn được chấp nhận
    socket.on(
      "friendRequestAccepted",
      (data: {
        requesterId: string;
        recipientId: string;
        friendshipId: string;
      }) => {
        console.log("Friend request accepted via socket:", data);

        // Cập nhật trạng thái khi là người gửi hoặc người nhận
        if (data.requesterId === currentUserId) {
          updateFriendStatus(data.recipientId, "friends");
        }
        if (data.recipientId === currentUserId) {
          updateFriendStatus(data.requesterId, "friends");
        }
      }
    );

    // Lắng nghe sự kiện yêu cầu kết bạn bị từ chối
    socket.on(
      "friendRequestRejected",
      (data: {
        requesterId: string;
        recipientId: string;
        friendshipId: string;
      }) => {
        console.log("Friend request rejected via socket:", data);

        // Nếu là người gửi, thì cập nhật trạng thái thành null (không có mối quan hệ)
        if (data.requesterId === currentUserId) {
          updateFriendStatus(data.recipientId, null);
        }
      }
    );

    // Cleanup khi component unmount
    return () => {
      socket.off("friendRequestReceived");
      socket.off("friendRequestAccepted");
      socket.off("friendRequestRejected");
    };
  }, [socket, currentUserId, updateFriendStatus]);

  // --- Handlers ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query)}&filter=${filter}`);
    performSearch(query);
  };

  const navigateToResult = (result: SearchResult) => {
    switch (result.type) {
      case "user":
        navigate(`/profile/${result._id}`);
        break;
      case "group":
        navigate(`/groups/${result._id}`);
        break;
      case "message":
        navigate(`/chat?messageId=${result._id}`);
        break;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  const handleAddFriend = async (recipientId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:3005/api/friendship/send-request",
        { recipientId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Add Friend Response:", response.data);

      if (response.status === 200 || response.status === 201) {
        // Cập nhật trạng thái ngay lập tức
        setFriendRequestsSent((prev) => new Set(prev).add(recipientId));
        updateFriendStatus(recipientId, "pending");

        // Gửi sự kiện socket cho người nhận
        const userName = localStorage.getItem("userName") || "Một người dùng";
        socket?.emit("friendRequest", {
          requesterId: currentUserId,
          recipientId: recipientId,
          requesterName: userName,
          friendshipId: response.data.friendshipId || "pending",
        });
      }
    } catch (error) {
      console.error("Lỗi khi gửi yêu cầu kết bạn:", error);
    }
  };

  const handleCancelFriendRequest = async (recipientId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:3005/api/friendship/request/${recipientId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFriendRequestsSent((prev) => {
        const newSet = new Set(prev);
        newSet.delete(recipientId);
        return newSet;
      });
      updateFriendStatus(recipientId, null);
    } catch (error) {
      console.error("Error cancelling friend request:", error);
    }
  };

  const handleUnfriend = async (friendId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:3005/api/friendship/unfriend/${friendId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      updateFriendStatus(friendId, null);
    } catch (error) {
      console.error("Error unfriending:", error);
    }
  };

  const handleAcceptFriendRequest = async (
    friendshipId: string,
    requesterId: string
  ) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:3005/api/friendship/accept-request",
        { friendshipId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        // Emit to socket that request was accepted
        socket?.emit("friendRequestAccepted", {
          requesterId: requesterId,
          recipientId: currentUserId,
          friendshipId: friendshipId,
        });

        // Update local state
        setFriendRequests((prev) =>
          prev.filter((req) => req.friendshipId !== friendshipId)
        );

        // Update status to friends
        updateFriendStatus(requesterId, "friends");

        console.log("Friend request accepted:", friendshipId);
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleRejectFriendRequest = async (
    friendshipId: string,
    requesterId: string
  ) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:3005/api/friendship/reject-request",
        { friendshipId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        // Emit to socket that request was rejected
        socket?.emit("friendRequestRejected", {
          requesterId: requesterId,
          recipientId: currentUserId,
          friendshipId: friendshipId,
        });

        // Cập nhật trạng thái local
        setFriendRequests((prev) =>
          prev.filter((req) => req.friendshipId !== friendshipId)
        );

        // Xóa trạng thái khỏi friendStatuses
        updateFriendStatus(requesterId, null);

        console.log("Friend request rejected:", friendshipId);
      }
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  const handleStartChat = (userId: string) => {
    navigate(`/chat/${userId}`);
  };

  const renderActionButton = (user: SearchResult) => {
    if (user.type === "user") {
      const status = friendStatuses[user._id];

      // Kiểm tra nếu người dùng hiện tại nhận được yêu cầu kết bạn từ người này
      const isRequestReceived = friendRequests.some(
        (req) =>
          req.requesterId === user._id && currentUserId === req.recipientId
      );

      // Hoặc kiểm tra trạng thái "requested" cho request đã nhận
      if (isRequestReceived || status === "requested") {
        const friendship = friendRequests.find(
          (req) =>
            req.requesterId === user._id && currentUserId === req.recipientId
        );
        if (!friendship) return null;
        return (
          <>
            <button
              className="accept-request-button"
              onClick={() =>
                handleAcceptFriendRequest(friendship.friendshipId, user._id)
              }
            >
              Chấp nhận
            </button>
            <button
              className="reject-request-button"
              onClick={() =>
                handleRejectFriendRequest(friendship.friendshipId, user._id)
              }
            >
              Từ chối
            </button>
          </>
        );
      }

      if (status === "friends" || status === "accepted") {
        return (
          <>
            <span className="friend-status">Bạn bè</span>
            <div className="friend-actions">
              <button
                className="chat-button"
                onClick={() => handleStartChat(user._id)}
              >
                <FontAwesomeIcon icon={faCommentDots} /> Nhắn tin
              </button>
              <button
                className="unfriend-button"
                onClick={() => handleUnfriend(user._id)}
              >
                Hủy bạn bè
              </button>
            </div>
          </>
        );
      } else if (status === "pending") {
        return (
          <>
            <span className="friend-status">Đã gửi lời mời</span>
            <button
              className="cancel-request-button"
              onClick={() => handleCancelFriendRequest(user._id)}
            >
              Hủy yêu cầu
            </button>
          </>
        );
      } else if (friendRequestsSent.has(user._id)) {
        return (
          <>
            <span className="friend-status">Đã gửi lời mời</span>
            <button
              className="cancel-request-button"
              onClick={() => handleCancelFriendRequest(user._id)}
            >
              Hủy yêu cầu
            </button>
          </>
        );
      } else if (status === "error") {
        return <span className="friend-status">Lỗi</span>;
      } else {
        return (
          <button
            className="add-friend-button"
            onClick={() => handleAddFriend(user._id)}
          >
            <FontAwesomeIcon icon={faUserPlus} /> Kết bạn
          </button>
        );
      }
    }
    return null;
  };

  // Thêm function để lấy các yêu cầu kết bạn đang chờ
  const fetchPendingFriendRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3005/api/friendship/pending-requests",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Pending friend requests:", response.data);

      // Cập nhật state với các yêu cầu kết bạn đang chờ
      if (response.data && response.data.length > 0) {
        setFriendRequests(
          response.data.map((req) => ({
            friendshipId: req._id,
            requesterId: req.requester._id,
            recipientId: req.recipient,
            requesterName: req.requester.name || "Người dùng",
          }))
        );

        // Cập nhật trạng thái cho các người gửi yêu cầu
        response.data.forEach((req) => {
          updateFriendStatus(req.requester._id, "requested");
        });
      }
    } catch (error) {
      console.error("Error fetching pending friend requests:", error);
    }
  }, [updateFriendStatus]);

  // Gọi function khi component được mount
  useEffect(() => {
    if (currentUserId) {
      fetchPendingFriendRequests();
    }
  }, [currentUserId, fetchPendingFriendRequests]);

  return (
    <div className="search-page">
      <h1>Tìm kiếm</h1>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-container">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập từ khóa tìm kiếm..."
            className="search-input"
          />
          <button type="submit" className="search-button">
            Tìm
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="search-filters">
          <button
            type="button"
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === "users" ? "active" : ""}`}
            onClick={() => setFilter("users")}
          >
            Người dùng
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === "groups" ? "active" : ""}`}
            onClick={() => setFilter("groups")}
          >
            Nhóm
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === "messages" ? "active" : ""}`}
            onClick={() => setFilter("messages")}
          >
            Tin nhắn
          </button>
        </div>
      </form>

      {/* Search Results */}
      <div className="search-results">
        {loading ? (
          <div className="loading">Đang tìm kiếm...</div>
        ) : results.length > 0 ? (
          <>
            <h2>Kết quả tìm kiếm</h2>
            <div className="results-list">
              {results.map((result) => (
                <div
                  key={result._id}
                  className={`result-item result-${result.type}`}
                >
                  <div
                    className="result-content-wrapper"
                    onClick={() => navigateToResult(result)}
                  >
                    <div className="result-icon">
                      {result.type === "user" &&
                        (result.avt ? (
                          <img
                            src={result.avt}
                            alt={result.name || "User"}
                            className="user-avatar"
                          />
                        ) : (
                          <FontAwesomeIcon icon={faUserPlus} />
                        ))}
                      {result.type === "group" && (
                        <FontAwesomeIcon icon={faUserPlus} />
                      )}
                      {result.type === "message" && (
                        <FontAwesomeIcon icon={faUserPlus} />
                      )}
                    </div>
                    <div className="result-content">
                      {result.type === "user" && (
                        <>
                          <h3>{result.name || result.username}</h3>
                          {result.phone && (
                            <p className="user-info">SĐT: {result.phone}</p>
                          )}
                          {result.birthDate && (
                            <p className="user-info">
                              Ngày sinh: {formatDate(result.birthDate)}
                            </p>
                          )}
                          {result.gender && (
                            <p className="user-info">
                              Giới tính:{" "}
                              {result.gender === "male" ? "Nam" : "Nữ"}
                            </p>
                          )}
                        </>
                      )}
                      {result.type === "group" && <h3>{result.name}</h3>}
                      {result.type === "message" && (
                        <>
                          <h3>Tin nhắn</h3>
                          <p>{result.message}</p>
                        </>
                      )}
                      {result.createdAt && (
                        <small>
                          Tham gia vào:{" "}
                          {new Date(result.createdAt).toLocaleDateString(
                            "vi-VN"
                          )}
                        </small>
                      )}
                    </div>
                  </div>
                  {result.type === "user" && (
                    <div className="result-actions">
                      {renderActionButton(result)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : query && !loading ? (
          <div className="no-results">Không tìm thấy kết quả phù hợp</div>
        ) : null}
      </div>
    </div>
  );
};

export default SearchPage;
