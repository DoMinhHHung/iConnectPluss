// Đảm bảo import Platform
import { Platform } from 'react-native';

// API URLs
// Sử dụng 192.168.1.5 cho kết nối trong mạng LAN
// Sử dụng 10.0.2.2 cho Android emulator kết nối đến localhost của máy chủ
// Sử dụng localhost khi chạy trên web
const getHostAddress = () => {
  // Use the LAN IP directly for all platforms
  return '192.168.1.5';
  
  // Uncomment below for dynamic configuration if needed later
  /*
  if (Platform.OS === 'android') {
    return __DEV__ ? '10.0.2.2' : '192.168.1.5';
  }
  if (Platform.OS === 'ios') {
    return __DEV__ ? 'localhost' : '192.168.1.5';
  }
  return 'localhost'; // Fallback cho web
  */
};

// Cấu hình động dựa trên môi trường
export const API_URL = `http://${getHostAddress()}:3005`;
export const SOCKET_URL = `http://${getHostAddress()}:3005`;

// App constants
export const APP_NAME = "iTalk+";
export const APP_VERSION = "1.0.0";

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER: "user",
  THEME: "app_theme",
  LANGUAGE: "app_language",
};

// Default avatar
export const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=random";

// Cloudinary configuration
export const CLOUDINARY_CONFIG = {
  CLOUD_NAME: "dj5a0wx2n",
  API_KEY: "731712143896246",
  API_SECRET: "BPwn4ELB3UL0W4obHwW3Vjeoo1M",
  UPLOAD_PRESET: "italk_app_preset",
  FOLDER: "italk_app"
};
//BPwn4ELB3UL0W4obHwW3Vjeoo1M api secret key