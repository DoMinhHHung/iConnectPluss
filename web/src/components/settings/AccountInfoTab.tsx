import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  updateUser,
  requestOtp,
  requestEmailChangeOtp,
  verifyEmailChange,
} from "../../api/auth";
import { useAppDispatch } from "../../redux/hooks";
import { updateUserSuccess } from "../../redux/slices/authSlice";
import { User } from "../../types";

// Định nghĩa kiểu dữ liệu chính xác cho các CSS properties
const modalStyles = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 9999,
  },
  container: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    maxWidth: "500px",
    width: "100%",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    position: "relative" as const,
  },
  header: {
    marginBottom: "15px",
    paddingBottom: "10px",
    borderBottom: "1px solid #eee",
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  title: {
    fontSize: "18px",
    fontWeight: "bold" as const,
    margin: 0,
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    padding: "0",
    lineHeight: "1",
  },
  body: {
    marginBottom: "20px",
  },
  footer: {
    display: "flex" as const,
    justifyContent: "flex-end" as const,
    gap: "8px",
    marginTop: "20px",
  },
};

interface AccountInfoTabProps {
  user: User;
}

const AccountInfoTab: React.FC<AccountInfoTabProps> = ({ user }) => {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
  });
  const [originalData, setOriginalData] = useState({
    email: "",
    phone: "",
  });
  const [otp, setOtp] = useState("");
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({});
  const [isEmailChange, setIsEmailChange] = useState(false);
  const [showEmailConfirmModal, setShowEmailConfirmModal] = useState(false);
  const [otpSectionVisible, setOtpSectionVisible] = useState(false);

  const dispatch = useAppDispatch();

  // Hàm test kết nối email server (chỉ dùng khi debug)
  const testEmailConnection = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      // Thay đổi endpoint để không va chạm với các route hiện tại
      const response = await axios.get(
        "http://localhost:3005/api/auth/test/email-config",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = response.data;
      console.log("Email config check:", data);
      alert("Email server connection: " + (data.success ? "OK" : "Failed"));
    } catch (error) {
      console.error("Connection test failed:", error);
      alert("Connection test failed. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || "",
        phone: user.phone || "",
      });
      setOriginalData({
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtp(e.target.value);
  };

  // Khi người dùng muốn thay đổi email
  const handleEmailChangeRequest = () => {
    if (!user) return;

    if (formData.email === originalData.email) {
      setError("Email mới không thay đổi so với email hiện tại");
      return;
    }

    // Hiển thị modal xác nhận
    setShowEmailConfirmModal(true);
  };

  // Xác nhận gửi OTP và hiện form nhập OTP
  const handleConfirmEmailChange = async () => {
    setShowEmailConfirmModal(false);
    setLoading(true);
    setError(null);

    try {
      // Gửi OTP đến email mới
      const response = await requestEmailChangeOtp({
        newEmail: formData.email,
      });
      console.log("OTP response:", response);

      // Hiển thị phần nhập OTP
      setOtpSectionVisible(true);
      setIsEmailChange(true);
      setSuccess(
        `Mã OTP đã được gửi đến email mới của bạn (${formData.email})`
      );
    } catch (err: any) {
      console.error("Error details:", err);
      let errorMessage = "Gửi mã OTP thất bại";

      if (err.response) {
        errorMessage = err.response.data?.message || errorMessage;
        console.error("Server error response:", err.response.data);
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Xác thực OTP và cập nhật email
  const handleVerifyEmailOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !otp) {
      setError("Vui lòng nhập mã OTP");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await verifyEmailChange({ otp });
      console.log("Verify response:", response);

      // Cập nhật thông tin người dùng trong Redux
      if (response.user) {
        dispatch(updateUserSuccess(response.user));
      } else if (response.data && response.data.user) {
        dispatch(updateUserSuccess(response.data.user));
      } else {
        const updatedUser = {
          ...user,
          email: formData.email,
        };
        dispatch(updateUserSuccess(updatedUser));
      }

      setSuccess("Cập nhật email thành công");

      setOriginalData({
        ...originalData,
        email: formData.email,
      });

      // Reset form OTP
      setOtpSectionVisible(false);
      setOtp("");
    } catch (err: any) {
      console.error("Error verifying email:", err);

      let errorMessage = "Xác thực OTP thất bại";
      if (err.response) {
        errorMessage = err.response.data?.message || errorMessage;
        console.error("Server error response:", err.response.data);
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý thay đổi số điện thoại
  const handlePhoneSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Kiểm tra phone có thay đổi không
    if (formData.phone !== originalData.phone) {
      try {
        // Sử dụng email hiện tại của người dùng cho thay đổi số điện thoại
        await requestOtp({ email: user.email });
        setShowOtpForm(true);
        setIsEmailChange(false);
        setSuccess(
          "Mã OTP đã được gửi đến email của bạn để xác nhận thay đổi số điện thoại"
        );
      } catch (err: any) {
        setError(err.response?.data?.message || "Gửi mã OTP thất bại");
      } finally {
        setLoading(false);
      }
      return;
    }

    setSuccess("Không có thông tin nào được thay đổi");
    setLoading(false);
  };

  // Xác thực OTP cho thay đổi số điện thoại
  const handleVerifyPhoneOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !otp) return;

    setLoading(true);
    setError(null);

    try {
      const dataWithOtp = {
        phone: formData.phone,
        otp,
      };

      const updatedUser = await updateUser(user._id, dataWithOtp);
      dispatch(updateUserSuccess(updatedUser));
      setSuccess("Cập nhật số điện thoại thành công");

      // Cập nhật originalData với số điện thoại mới
      setOriginalData({
        ...originalData,
        phone: formData.phone,
      });

      // Reset form
      setShowOtpForm(false);
      setOtp("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Xác thực OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="mb-4">Thông tin tài khoản</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Form Email */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Thay đổi email</h5>
        </div>
        <div className="card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEmailChangeRequest();
            }}
          >
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              {formData.email !== originalData.email && (
                <small className="text-info">
                  Thay đổi email sẽ cần xác thực OTP
                </small>
              )}
            </div>

            {otpSectionVisible && (
              <div className="mb-3 p-3 border rounded bg-light">
                <label htmlFor="email-otp" className="form-label fw-bold">
                  Nhập mã OTP
                </label>
                <p className="small text-muted">
                  Mã xác thực đã được gửi đến email mới ({formData.email}). Vui
                  lòng kiểm tra và nhập mã để xác thực.
                </p>
                <div className="input-group mb-3">
                  <input
                    type="text"
                    className="form-control"
                    id="email-otp"
                    value={otp}
                    onChange={handleOtpChange}
                    placeholder="Nhập mã OTP 6 số"
                    required
                  />
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={(e) => handleVerifyEmailOtp(e as any)}
                    disabled={loading || !otp}
                  >
                    {loading ? "Đang xác thực..." : "Xác thực"}
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={handleConfirmEmailChange}
                  disabled={loading}
                >
                  Gửi lại mã OTP
                </button>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || otpSectionVisible}
            >
              {loading ? "Đang xử lý..." : "Cập nhật email"}
            </button>
          </form>
        </div>
      </div>

      {/* Form Phone */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Thay đổi số điện thoại</h5>
        </div>
        <div className="card-body">
          {showOtpForm ? (
            <form onSubmit={handleVerifyPhoneOtp}>
              <div className="mb-3">
                <label htmlFor="phone-otp" className="form-label">
                  Mã OTP đã được gửi đến email hiện tại của bạn. Vui lòng kiểm
                  tra và nhập mã.
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="phone-otp"
                  value={otp}
                  onChange={handleOtpChange}
                  placeholder="Nhập mã OTP 6 số"
                  required
                />
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowOtpForm(false)}
                  disabled={loading}
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Đang xác thực..." : "Xác nhận"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePhoneSubmit}>
              <div className="mb-3">
                <label htmlFor="phone" className="form-label">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  className="form-control"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
                {formData.phone !== originalData.phone && (
                  <small className="text-info">
                    Thay đổi số điện thoại cần xác thực OTP gửi đến email hiện
                    tại
                  </small>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Cập nhật số điện thoại"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal xác nhận thay đổi email */}
      {showEmailConfirmModal && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.container}>
            <div style={modalStyles.header}>
              <h5 style={modalStyles.title}>Xác nhận thay đổi email</h5>
              <button
                type="button"
                style={modalStyles.closeButton}
                onClick={() => setShowEmailConfirmModal(false)}
              >
                &times;
              </button>
            </div>
            <div style={modalStyles.body}>
              <p>
                Bạn muốn thay đổi email từ "
                <strong>{originalData.email}</strong>" sang "
                <strong>{formData.email}</strong>".
                <br />
                Mã OTP sẽ được gửi về email mới (
                <strong>{formData.email}</strong>).
              </p>
            </div>
            <div style={modalStyles.footer}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowEmailConfirmModal(false)}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmEmailChange}
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountInfoTab;
