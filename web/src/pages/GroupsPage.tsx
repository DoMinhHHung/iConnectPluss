import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GroupManagement from "../components/GroupManagement";
import "../scss/GroupsPage.scss";

const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  if (!isAuthenticated) {
    return <div className="loading">Đang kiểm tra xác thực...</div>;
  }

  return (
    <div className="groups-page">
      <h1>Quản lý nhóm</h1>
      <p className="page-description">
        Tạo và quản lý các nhóm chat của bạn. Bạn có thể thêm bạn bè vào nhóm để
        trò chuyện cùng nhau.
      </p>
      <GroupManagement />
    </div>
  );
};

export default GroupsPage;
