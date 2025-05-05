import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  loginSuccess,
  loginError,
  authLoading,
} from "../redux/slices/authSlice";
import "../scss/AuthPages.scss";

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    emailOrPhone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { error: reduxError } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (reduxError) {
      setError(reduxError);
    }
  }, [reduxError]);

  useEffect(() => {
    return () => {
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
    };
  }, [errorTimeout]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) {
      setError(null);
      setDebugInfo(null);
      dispatch(loginError(""));
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (errorTimeout) {
      clearTimeout(errorTimeout);
      setErrorTimeout(null);
    }

    if (!formData.emailOrPhone.trim()) {
      setError("Vui lòng nhập email hoặc số điện thoại");
      return;
    }

    if (!formData.password.trim()) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo(null);
    dispatch(authLoading());

    try {
      setDebugInfo(`Đang gửi request đăng nhập với: ${formData.emailOrPhone}`);

      const response = await loginUser(formData);

      if (!response || !response.token || !response.user) {
        throw new Error("Dữ liệu phản hồi không hợp lệ");
      }

      dispatch(
        loginSuccess({
          user: response.user,
          token: response.token,
        })
      );

      setDebugInfo("Đăng nhập thành công, đang chuyển hướng...");

      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (err: any) {
      let errorMessage = "Đăng nhập thất bại";
      let debugMessage = "Lỗi không xác định";

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
        debugMessage = `Server trả về lỗi: ${err.response.data.message} (Status: ${err.response.status})`;
      } else if (err.message) {
        errorMessage = err.message;
        debugMessage = `Lỗi client: ${err.message}`;
      }

      setError(errorMessage);
      setDebugInfo(debugMessage);
      dispatch(loginError(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>Đăng nhập</h2>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {debugInfo && (
          <div className="alert alert-info" role="alert">
            <small>{debugInfo}</small>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="emailOrPhone">Email hoặc Số điện thoại</label>
            <input
              type="text"
              className="form-control"
              id="emailOrPhone"
              name="emailOrPhone"
              value={formData.emailOrPhone}
              onChange={handleChange}
              required
              placeholder="Nhập email hoặc số điện thoại"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              className="form-control"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Nhập mật khẩu"
            />
          </div>
          <div className="form-group mt-4">
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </button>
          </div>
        </form>

        <div className="divider">
          <span className="divider-text">hoặc</span>
        </div>

        <div className="social-login">
          <button className="social-btn">
            <i className="fa fa-google"></i> Google
          </button>
          <button className="social-btn">
            <i className="fa fa-facebook"></i> Facebook
          </button>
        </div>

        <div className="auth-links">
          <p className="mb-2">
            Chưa có tài khoản?{" "}
            <button className="btn-link" onClick={() => navigate("/register")}>
              Đăng ký
            </button>
          </p>
          <p className="mb-0">
            <button
              className="btn-link"
              onClick={() => navigate("/forgot-password")}
            >
              Quên mật khẩu?
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
