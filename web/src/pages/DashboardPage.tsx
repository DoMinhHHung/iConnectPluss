import React, { useEffect, useState, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { getUser } from "../api/auth";
import { getUserSuccess, authError } from "../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAppSelector(
    (state) => state.auth
  );
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true when component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      const userData = await getUser();
      dispatch(getUserSuccess(userData));
    } catch (err: any) {
      dispatch(
        authError(
          err.response?.data?.message || "Không thể lấy thông tin người dùng"
        )
      );
    }
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && !user && isMounted) {
      fetchUserData();
    }
  }, [isAuthenticated, user, isMounted, fetchUserData]);

  // Render loading state or nothing at all during SSR
  if (!isMounted) {
    return <div className="text-center my-5">Đang tải...</div>;
  }

  if (isLoading) {
    return <div className="text-center my-5">Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <h2>Vui lòng đăng nhập</h2>
            <p>Bạn cần đăng nhập để xem trang bảng điều khiển</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/login")}
            >
              Đến trang đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-md-12">
          <div className="card my-5">
            <h2 className="text-center mb-4">Trang chủ</h2>
            {user && (
              <div className="text-center">
                <h3>Xin chào, {user.name}!</h3>
                <p>Chào mừng bạn đến với hệ thống iConnect</p>
              </div>
            )}
            <div className="row mt-5">
              <div className="col-md-4">
                <div className="card shadow-sm">
                  <div className="card-body text-center">
                    <h5 className="card-title">Hồ sơ cá nhân</h5>
                    <p className="card-text">
                      Xem và cập nhật thông tin cá nhân của bạn
                    </p>
                    <Link to="/profile" className="btn btn-primary">
                      Xem hồ sơ
                    </Link>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm">
                  <div className="card-body text-center">
                    <h5 className="card-title">Tin nhắn</h5>
                    <p className="card-text">
                      Trò chuyện với bạn bè và nhóm của bạn
                    </p>
                    <Link to="/chat" className="btn btn-primary">
                      Đến trang chat
                    </Link>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm">
                  <div className="card-body text-center">
                    <h5 className="card-title">Quản lý nhóm</h5>
                    <p className="card-text">
                      Tạo và quản lý các nhóm chat của bạn
                    </p>
                    <Link to="/groups" className="btn btn-primary">
                      Quản lý nhóm
                    </Link>
                  </div>
                </div>
              </div>
              {user && user.role === "admin" && (
                <div className="col-md-4 mt-4">
                  <div className="card shadow-sm">
                    <div className="card-body text-center">
                      <h5 className="card-title">Quản lý người dùng</h5>
                      <p className="card-text">
                        Quản lý tất cả người dùng trong hệ thống
                      </p>
                      <Link to="/admin/users" className="btn btn-primary">
                        Quản lý
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              <div className="col-md-4 mt-4">
                <div className="card shadow-sm">
                  <div className="card-body text-center">
                    <h5 className="card-title">Trợ giúp</h5>
                    <p className="card-text">Xem hướng dẫn sử dụng hệ thống</p>
                    <Link to="/help" className="btn btn-primary">
                      Xem hướng dẫn
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
