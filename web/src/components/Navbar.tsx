import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { logout } from "../redux/slices/authSlice";
import { io, Socket } from "socket.io-client";
import "../scss/Navbar.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";

const Navbar: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<string[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { unreadMessagesCount, unreadGroupMessagesCount } = useAppSelector(
    (state) => state.message
  );

  // Tổng số thông báo
  const totalNotifications = unreadMessagesCount + unreadGroupMessagesCount;

  // Debug - Kiểm tra trạng thái thông báo
  useEffect(() => {
    console.log("Tin nhắn chưa đọc:", unreadMessagesCount);
    console.log("Tin nhắn nhóm chưa đọc:", unreadGroupMessagesCount);
    console.log("Tổng số thông báo:", totalNotifications);
  }, [unreadMessagesCount, unreadGroupMessagesCount, totalNotifications]);

  useEffect(() => {
    setIsMounted(true);

    // Kết nối WebSocket khi component mount và đã xác thực
    if (isAuthenticated) {
      // Chỉ tạo socket nếu chưa tồn tại
      if (!socket) {
        console.log("Tạo kết nối socket mới");
        const newSocket = io("http://localhost:3005", {
          query: { token: localStorage.getItem("token") },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          transports: ["websocket", "polling"],
        });

        setSocket(newSocket);

        // Lắng nghe sự kiện thông báo
        newSocket.on("friendRequestReceived", (data: { message: string }) => {
          setNotifications((prev) => [...prev, data.message]);
        });

        // Lắng nghe thông báo tin nhắn mới
        newSocket.on("newMessageNotification", (data: any) => {
          console.log("Nhận thông báo tin nhắn mới:", data);
          // Redux dispatch sẽ xử lý trong ChatInterface
        });

        // Debug events
        newSocket.on("connect", () => {
          console.log("Socket connected", newSocket.id);
        });

        newSocket.on("disconnect", () => {
          console.log("Socket disconnected");
        });

        newSocket.on("error", (error) => {
          console.error("Socket error:", error);
        });
      }

      // Cleanup function
      return () => {
        // Chỉ ngắt kết nối khi component thực sự unmount
        // KHÔNG ngắt kết nối khi component re-render
      };
    } else if (socket) {
      // Ngắt kết nối khi người dùng đăng xuất
      console.log("Ngắt kết nối socket khi đăng xuất");
      socket.disconnect();
      setSocket(null);
      setNotifications([]);
    }
  }, [isAuthenticated]); // Loại bỏ socket khỏi dependencies để tránh reconnect khi re-render

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const toggleNotificationDropdown = () => {
    // Bạn có thể thêm logic để đánh dấu thông báo là đã đọc khi dropdown mở
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div className="container">
        <Link to="/" className="navbar-brand">
          <span className="font-weight-bold text-primary">iConnect↵</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${isMenuOpen ? "show" : ""}`}>
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {isMounted ? (
              <>
                {isAuthenticated && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link" to="/dashboard">
                        Trang chủ
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link message-link" to="/chat">
                        Tin nhắn
                        {unreadMessagesCount > 0 && (
                          <span className="notification-badge message-notification">
                            {unreadMessagesCount}
                          </span>
                        )}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link group-link" to="/groups">
                        Nhóm
                        {unreadGroupMessagesCount > 0 && (
                          <span className="notification-badge group-notification">
                            {unreadGroupMessagesCount}
                          </span>
                        )}
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link friends-link" to="/friends">
                        Bạn bè
                      </Link>
                    </li>
                    {user && user.role === "admin" && (
                      <li className="nav-item">
                        <Link className="nav-link" to="/admin">
                          Quản trị
                        </Link>
                      </li>
                    )}
                  </>
                )}
              </>
            ) : null}
          </ul>

          {isAuthenticated && isMounted && (
            <form className="d-flex me-2" onSubmit={handleSearch}>
              <input
                className="form-control me-2"
                type="search"
                placeholder="Tìm kiếm người dùng..."
                aria-label="Tìm kiếm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn btn-outline-primary" type="submit">
                Tìm
              </button>
            </form>
          )}

          <div className="d-flex align-items-center">
            {isAuthenticated && isMounted && (
              <div className="notification-bell me-2">
                <button
                  className="btn btn-light position-relative"
                  onClick={toggleNotificationDropdown}
                >
                  <FontAwesomeIcon icon={faBell} />
                  {notifications.length > 0 && (
                    <span className="notification-badge">
                      {notifications.length}
                    </span>
                  )}
                </button>
                {notifications.length > 0 && (
                  <div className="notification-dropdown shadow rounded bg-white">
                    <h6 className="p-2 mb-0 bg-light text-center">Thông báo</h6>
                    {notifications.map((notification, index) => (
                      <div
                        key={index}
                        className="notification-item p-2 border-bottom"
                      >
                        {notification}
                      </div>
                    ))}
                    <Link
                      to="/notifications"
                      className="dropdown-item text-center p-2"
                    >
                      Xem tất cả
                    </Link>
                  </div>
                )}
              </div>
            )}

            {isMounted ? (
              isAuthenticated ? (
                <div className="dropdown">
                  <button
                    className="btn btn-light dropdown-toggle"
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  >
                    {user?.name || "Tài khoản"}
                  </button>
                  {isUserMenuOpen && (
                    <div className="dropdown-menu show">
                      <Link className="dropdown-item" to="/profile">
                        Hồ sơ
                      </Link>
                      <Link className="dropdown-item" to="/settings">
                        Cài đặt
                      </Link>
                      <hr className="dropdown-divider" />
                      <button className="dropdown-item" onClick={handleLogout}>
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Link to="/login" className="btn btn-outline-primary me-2">
                    Đăng nhập
                  </Link>
                  <Link to="/register" className="btn btn-primary">
                    Đăng ký
                  </Link>
                </div>
              )
            ) : (
              <div style={{ minWidth: "180px" }}></div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
