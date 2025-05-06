"use client";

import api from "./index";
import axios from "axios";
import { User } from "../types";

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  gender: "male" | "female";
  birthDate: string;
  address: string;
  otp: string;
}

export interface LoginData {
  emailOrPhone: string;
  password: string;
}

export interface OtpRequest {
  email?: string;
  newEmail?: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  newPassword: string;
}

export interface UserData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  birthDate: string;
  address: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export const registerUser = async (data: RegisterData) => {
  const response = await api.post("/auth/register", data);
  return response.data;
};

export const loginUser = async (data: LoginData) => {
  const response = await api.post("/auth/login", data);
  return response.data;
};

export const requestOtp = async (data: OtpRequest) => {
  try {
    const response = await api.post("/auth/request-otp", data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error requesting OTP:", error);
    throw error;
  }
};

export const resetPassword = async (data: ResetPasswordData) => {
  const response = await api.post("/auth/reset-password", data);
  return response.data;
};

export const getUser = async () => {
  const response = await api.get("/auth");
  return response.data;
};

export const updateUser = async (userId: string, userData: any) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const response = await axios.put(
      `http://localhost:3005/api/auth/update/${userId}`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.user;
  } catch (error) {
    console.error("Error in updateUser API call:", error);
    throw error;
  }
};

export const deleteUser = async () => {
  const response = await api.delete("/auth/delete");
  return response.data;
};

export const sendRegistrationOtp = async (data: OtpRequest) => {
  try {
    console.log("Sending registration OTP to:", data.email);
    const response = await api.post("/auth/send-registration-otp", data);
    return response.data;
  } catch (error) {
    console.error("Error sending registration OTP:", error);
    throw error;
  }
};

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  otp: string;
}

export const requestPasswordChangeOtp = async (data: OtpRequest) => {
  try {
    const response = await api.post("/auth/request-password-change-otp", data);
    return response.data;
  } catch (error) {
    console.error("Error requesting password change OTP:", error);
    throw error;
  }
};

export const changePassword = async (data: ChangePasswordData) => {
  try {
    const response = await api.post("/auth/change-password", data);
    return response.data;
  } catch (error) {
    console.error("Error changing password:", error);
    throw error;
  }
};

export const uploadAvatar = async (userId: string, avatarUrl: string) => {
  try {
    if (!userId || userId === "undefined") {
      throw new Error("User ID không hợp lệ hoặc không xác định");
    }

    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const response = await axios.put(
      `http://localhost:3005/api/auth/upload-avatar/${userId}`,
      { avatarUrl },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.user;
  } catch (error) {
    throw error;
  }
};

export const requestEmailChangeOtp = async (data: { newEmail: string }) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const response = await api.post("/user/request-email-change-otp", data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Email OTP response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error requesting email change OTP:", error);
    if (axios.isAxiosError(error)) {
      console.error("Error details:", error.response?.data);
    }
    throw error;
  }
};

export const verifyEmailChange = async (data: { otp: string }) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const response = await api.post("/user/verify-email-change", data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Raw verify email response:", response);

    // Đảm bảo trả về đúng cấu trúc dữ liệu
    if (
      response.data &&
      !response.data.user &&
      response.data.data &&
      response.data.data.user
    ) {
      response.data.user = response.data.data.user;
    }

    return response.data;
  } catch (error) {
    console.error("Error verifying email change:", error);
    if (axios.isAxiosError(error)) {
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
    }
    throw error;
  }
};
