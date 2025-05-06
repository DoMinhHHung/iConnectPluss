import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAppSelector } from "../redux/hooks";
import { useNavigate } from "react-router-dom";
import "../scss/FriendList.scss";

interface Friend {
  _id: string;
  name: string;
  avt?: string;
  isOnline?: boolean;
  lastActive?: string;
}

const FriendList: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user?._id) return;

      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `http://localhost:3005/api/friendship`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Friendship data received:", response.data);

        // API trả về danh sách friendships, cần chuyển đổi thành danh sách bạn bè
        const friendshipList = response.data;
        if (!Array.isArray(friendshipList)) {
          console.error("Expected array but got:", typeof friendshipList);
          setError("Dữ liệu bạn bè không hợp lệ");
          setLoading(false);
          return;
        }

        // Filter out friendships that don't have the accepted status
        const acceptedFriendships = friendshipList.filter(
          (friendship) => friendship.status === "accepted"
        );

        console.log(
          `Found ${acceptedFriendships.length} accepted friendships out of ${friendshipList.length} total`
        );

        // Tạo mảng bạn bè với kiểu Friend[] chính xác
        const validFriends: Friend[] = [];

        acceptedFriendships.forEach((friendship: any) => {
          // Kiểm tra cả requester và recipient
          if (!friendship.requester || !friendship.recipient) {
            console.warn(
              "Friendship missing requester or recipient:",
              friendship
            );
            return; // Skip this friendship
          }

          // Xác định người bạn (nếu người dùng hiện tại là requester, thì bạn bè là recipient và ngược lại)
          let friend;
          try {
            friend =
              friendship.requester._id === user._id
                ? friendship.recipient
                : friendship.requester;

            if (!friend || !friend._id) {
              console.warn("Invalid friend object:", friend);
              return; // Skip this friendship
            }

            // Tạo đối tượng Friend hợp lệ và thêm vào mảng
            validFriends.push({
              _id: friend._id,
              name: friend.name || "Người dùng",
              isOnline: false, // Mặc định là offline, có thể cập nhật qua socket
              ...(friend.avt && { avt: friend.avt }), // Chỉ thêm avt nếu nó tồn tại
            });
          } catch (err) {
            console.error("Error extracting friend data:", err);
            // Skip this friendship
          }
        });

        console.log("Processed friend list:", validFriends);
        setFriends(validFriends);
        setLoading(false);
      } catch (err: any) {
        console.error("Lỗi khi lấy danh sách bạn bè:", err);
        setError(
          err.response?.data?.message || "Không thể lấy danh sách bạn bè"
        );
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  const startChat = (friendId: string) => {
    navigate(`/chat/${friendId}`);
  };

  const renderAvatar = (friend: Friend) => {
    if (friend.avt) {
      return (
        <img src={friend.avt} alt={friend.name} className="friend-avatar" />
      );
    }

    return (
      <div className="avatar-placeholder">
        {friend.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="friend-list-loading">Đang tải danh sách bạn bè...</div>
    );
  }

  if (error) {
    return <div className="friend-list-error">{error}</div>;
  }

  if (friends.length === 0) {
    return (
      <div className="friend-list-empty">
        <p>Bạn chưa kết bạn với ai.</p>
        <button className="btn btn-primary" onClick={() => navigate("/search")}>
          Tìm bạn mới
        </button>
      </div>
    );
  }

  return (
    <div className="friend-list-container">
      <h3 className="friend-list-header">Bạn bè ({friends.length})</h3>
      <div className="friend-list">
        {friends.map((friend) => (
          <div
            key={friend._id}
            className="friend-item"
            onClick={() => startChat(friend._id)}
          >
            <div className="friend-avatar-container">
              {renderAvatar(friend)}
              <span
                className={`online-status ${
                  friend.isOnline ? "online" : "offline"
                }`}
              ></span>
            </div>
            <div className="friend-info">
              <div className="friend-name">{friend.name}</div>
              <div className="friend-status">
                {friend.isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendList;
