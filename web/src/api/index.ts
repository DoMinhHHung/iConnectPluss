"use client";

import axios from "axios";

// Đổi về port đúng 3005 như trong file .env của server
const API_URL = "http://localhost:3005/api";

console.log("API URL được cấu hình là:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Hiển thị chi tiết hơn nếu là request đăng nhập
    if (config.url?.includes("/login")) {
      console.log("Đang gửi request đăng nhập:");
      console.log("URL:", `${config.baseURL}${config.url}`);
      console.log("Method:", config.method?.toUpperCase());
      console.log("Data:", config.data);
    } else {
      console.log(
        `Đang gửi request đến: ${config.method?.toUpperCase()} ${
          config.baseURL
        }${config.url}`
      );
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("Token được thêm vào header");
      } else {
        console.log("Không có token trong localStorage");
      }
    }
    return config;
  },
  (error) => {
    console.error("Lỗi request interceptor:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    // Hiển thị chi tiết hơn nếu là response từ đăng nhập
    if (response.config.url?.includes("/login")) {
      console.log("Đăng nhập thành công:");
      console.log("Status:", response.status);
      console.log("Response data:", response.data);
    } else {
      console.log(`Nhận phản hồi thành công từ: ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Hiển thị chi tiết lỗi nếu liên quan đến đăng nhập
    if (error.config?.url?.includes("/login")) {
      console.error("=== LỖI ĐĂNG NHẬP ===");
      console.error("Status:", error.response?.status);
      console.error("Message:", error.message);
      console.error("Response data:", error.response?.data);
      console.error("Request data:", error.config?.data);
      console.error("URL:", error.config?.url);
    } else {
      console.error("Lỗi response:", error.message);
      console.error("Response status:", error.response?.status);
      console.error("Response data:", error.response?.data);
    }

    if (
      typeof window !== "undefined" &&
      error.response &&
      error.response.status === 401 &&
      !error.config.url.includes("/login")
    ) {
      console.log("Lỗi 401 - Token hết hạn hoặc không hợp lệ");
      localStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);

export default api;
