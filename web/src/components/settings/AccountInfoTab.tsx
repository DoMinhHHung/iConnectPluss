"use client";

import React, { useState, useEffect } from "react";
import { updateUser, requestOtp } from "../../api/auth";
import { useAppDispatch } from "../../redux/hooks";
import { updateUserSuccess } from "../../redux/slices/authSlice";
import { User } from "../../types";

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
  const dispatch = useAppDispatch();

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

  const handleRequestOtp = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Sử dụng email hiện tại của người dùng, không phải email mới
      await requestOtp({ email: user.email });
      setShowOtpForm(true);
      // Thay đổi thông báo tùy theo trường nào được cập nhật
      if (pendingUpdates.email && pendingUpdates.phone) {
        setSuccess(
          "Mã OTP đã được gửi đến email hiện tại của bạn để xác nhận thay đổi email và số điện thoại"
        );
      } else if (pendingUpdates.email) {
        setSuccess(
          "Mã OTP đã được gửi đến email hiện tại của bạn để xác nhận thay đổi email"
        );
      } else if (pendingUpdates.phone) {
        setSuccess(
          "Mã OTP đã được gửi đến email hiện tại của bạn để xác nhận thay đổi số điện thoại"
        );
      } else {
        setSuccess("Mã OTP đã được gửi đến email hiện tại của bạn");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Gửi mã OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Chỉ gửi các trường đã được thay đổi so với giá trị ban đầu
    const updatedFields: Record<string, any> = {};

    // Kiểm tra email có thay đổi không
    if (formData.email !== originalData.email) {
      updatedFields.email = formData.email;
    }

    // Kiểm tra phone có thay đổi không
    if (formData.phone !== originalData.phone) {
      updatedFields.phone = formData.phone;
    }

    // Kiểm tra xem có trường nào được thay đổi không
    if (Object.keys(updatedFields).length === 0) {
      setSuccess("Không có thông tin nào được thay đổi");
      setLoading(false);
      return;
    }

    // Nếu có thay đổi email hoặc số điện thoại, cần xác thực OTP
    if (updatedFields.email || updatedFields.phone) {
      // Lưu các trường cần cập nhật để sử dụng sau khi xác thực OTP
      setPendingUpdates(updatedFields);
      // Yêu cầu OTP
      await handleRequestOtp();
      setLoading(false);
      return;
    }

    // Nếu không cần xác thực OTP (trường hợp này không xảy ra vì đã xử lý email và phone ở trên)
    try {
      const updatedUser = await updateUser(user._id, updatedFields);
      dispatch(updateUserSuccess(updatedUser));
      setSuccess("Cập nhật thông tin thành công");
      setOriginalData({
        ...originalData,
        ...updatedFields,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Cập nhật thông tin thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !otp) return;

    setLoading(true);
    setError(null);

    try {
      // Thêm OTP vào dữ liệu cập nhật
      const dataWithOtp: Partial<User> & { otp: string } = {
        ...pendingUpdates,
        otp,
      };

      console.log("Sending update request with data:", dataWithOtp);

      const updatedUser = await updateUser(user._id, dataWithOtp);
      console.log("Update successful, response:", updatedUser);

      dispatch(updateUserSuccess(updatedUser));
      setSuccess("Cập nhật thông tin thành công");
      setShowOtpForm(false);
      setOtp("");
      setPendingUpdates({});
      setOriginalData({
        ...originalData,
        ...pendingUpdates,
      });
    } catch (err: any) {
      console.error("Error updating user:", err);
      console.error("Error response:", err.response?.data);
      setError(err.response?.data?.message || "Xác thực OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="mb-4">Thay đổi thông tin tài khoản</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showOtpForm ? (
        <form onSubmit={handleVerifyAndUpdate}>
          <div className="mb-3">
            <label htmlFor="otp" className="form-label">
              {pendingUpdates.email && pendingUpdates.phone
                ? "Mã OTP đã được gửi đến email hiện tại của bạn để xác nhận thay đổi email và số điện thoại"
                : pendingUpdates.email
                ? "Mã OTP đã được gửi đến email hiện tại của bạn để xác nhận thay đổi email"
                : "Mã OTP đã được gửi đến email hiện tại của bạn để xác nhận thay đổi số điện thoại"}
            </label>
            <input
              type="text"
              className="form-control"
              id="otp"
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
        <form onSubmit={handleSubmit}>
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
                Thay đổi email cần xác thực OTP
              </small>
            )}
          </div>

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
                Thay đổi số điện thoại cần xác thực OTP
              </small>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Đang cập nhật..." : "Lưu thay đổi"}
          </button>
        </form>
      )}
    </div>
  );
};

export default AccountInfoTab;
