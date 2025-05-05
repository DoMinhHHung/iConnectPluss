import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config/constants";

// Define types for the context
type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
  profilePicture?: string;
  avt?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: {
    emailOrPhone: string;
    password: string;
  }) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
};

// Create the context
export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: async () => {},
  isAuthenticated: false,
});

// Create the provider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if the user is logged in (on app start)
  useEffect(() => {
    loadStoredAuthData();
  }, []);

  // Configure axios with the token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  const loadStoredAuthData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading stored auth data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (credentials: {
    emailOrPhone: string;
    password: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        credentials
      );
      const { user, token } = response.data;

      // Store user and token
      await AsyncStorage.setItem("user", JSON.stringify(user));
      await AsyncStorage.setItem("token", token);

      setUser(user);
      setToken(token);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_URL}/api/auth/register`,
        userData
      );
      const { user, token } = response.data;

      // Store user and token
      await AsyncStorage.setItem("user", JSON.stringify(user));
      await AsyncStorage.setItem("token", token);

      setUser(user);
      setToken(token);
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("token");

      // Reset state
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user data
  const updateUser = async (userData: Partial<User>) => {
    try {
      if (!user || !user._id) throw new Error("User not authenticated");

      const response = await axios.put(
        `${API_URL}/api/user/update/${user._id}`,
        userData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const updatedUser = response.data.user;

      // Update stored user data
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
