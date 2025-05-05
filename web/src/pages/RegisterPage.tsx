import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, sendRegistrationOtp } from "../api/auth";
import { useAppDispatch } from "../redux/hooks";
import {
  registerSuccess,
  authError,
  authLoading,
} from "../redux/slices/authSlice";

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    gender: "male" as "male" | "female",
    birthDate: "",
    address: "",
    otp: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRequestOtp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!formData.email) {
      setError("Vui lòng nhập email");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Đang gửi registration OTP với email:", formData.email);
      await sendRegistrationOtp({ email: formData.email });
      setOtpSent(true);
      console.log("Gửi OTP thành công");
    } catch (err: any) {
      console.error("Lỗi khi gửi OTP:", err);
      console.error("Response data:", err.response?.data);
      console.error("Status code:", err.response?.status);
      setError(err.response?.data?.message || "Gửi mã OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu và xác nhận mật khẩu không khớp");
      return;
    }

    setLoading(true);
    setError(null);
    dispatch(authLoading());

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await registerUser({
        ...registerData,
        gender: registerData.gender as "male" | "female",
      });

      // Không tự động chuyển hướng nữa
      dispatch(
        registerSuccess({
          user: response.user,
          token: response.token,
        })
      );
      setSuccess("Đăng ký thành công!");
    } catch (err: any) {
      setError(err.response?.data?.message || "Đăng ký thất bại");
      dispatch(authError(err.response?.data?.message || "Đăng ký thất bại"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card my-5">
            <h2 className="text-center mb-4">Đăng ký tài khoản</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            {otpSent && (
              <div className="alert alert-success">
                Mã OTP đã được gửi đến email của bạn
              </div>
            )}
            {success && <div className="alert alert-success">{success}</div>}
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="name">Họ và tên</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <div className="input-group">
                      <input
                        type="email"
                        className="form-control"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={loading || !formData.email}
                      >
                        Gửi OTP
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="phone">Số điện thoại</label>
                    <input
                      type="tel"
                      className="form-control"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="otp">Mã OTP</label>
                    <input
                      type="text"
                      className="form-control"
                      id="otp"
                      name="otp"
                      value={formData.otp}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
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
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                    <input
                      type="password"
                      className="form-control"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="gender">Giới tính</label>
                    <select
                      className="form-control"
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      required
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="birthDate">Ngày sinh</label>
                    <input
                      type="date"
                      className="form-control"
                      id="birthDate"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Địa chỉ</label>
                <textarea
                  className="form-control"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  required
                ></textarea>
              </div>

              <div className="form-group mt-4">
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading || !otpSent}
                >
                  {loading ? "Đang xử lý..." : "Đăng ký"}
                </button>
              </div>
            </form>
            <div className="mt-3 text-center">
              <p>
                Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
