import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  ToastAndroid,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { API_URL } from "../../config/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../context/AuthContext";

const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const { login } = useContext(AuthContext);

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [networkAvailable, setNetworkAvailable] = useState(true);

  // Check network connectivity on component mount
  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        // Try to connect to the server with multiple endpoints
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Longer timeout
        
        // First try the main API endpoint
        console.log(`Attempting to connect to: ${API_URL}`);
        
        // Try multiple endpoints (auth endpoint is more likely to exist than health)
        let connected = false;
        try {
          // Ping the server root first
          const rootResponse = await fetch(`${API_URL}`, {
            method: 'GET',
            signal: controller.signal
          });
          
          if (rootResponse.ok || rootResponse.status < 500) {
            connected = true;
          }
        } catch (e) {
          // Try next endpoint if root fails
          console.log("Root endpoint check failed, trying auth endpoint");
        }
        
        if (!connected) {
          try {
            // Try auth endpoint if root fails
            const authResponse = await fetch(`${API_URL}/api/auth`, {
              method: 'GET',
              signal: controller.signal
            });
            
            if (authResponse.ok || authResponse.status === 401 || authResponse.status === 403) {
              // Even a 401/403 means the server is responding
              connected = true;
            }
          } catch (e) {
            console.log("Auth endpoint check failed");
          }
        }
        
        clearTimeout(timeoutId);
        setNetworkAvailable(connected);
        
        if (!connected) {
          console.log(`Server connection failed: ${API_URL}`);
          setError(`Cannot connect to server at ${API_URL}. Please check network settings.`);
          if (Platform.OS === 'android') {
            ToastAndroid.show('Server connection unavailable', ToastAndroid.SHORT);
          }
        } else {
          console.log(`Server connection successful: ${API_URL}`);
          setError("");
        }
      } catch (error) {
        console.log("Network check error:", error);
        setNetworkAvailable(false);
        setError(`Server appears to be offline. Check that the server is running at ${API_URL}`);
      }
    };

    checkNetworkStatus();
  }, []);

  const handleLogin = async () => {
    if (!emailOrPhone.trim()) {
      setError("Please enter your email or phone number");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log(`Attempting to login with: ${API_URL}/api/auth/login`);

      // Call the login API
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        emailOrPhone,
        password,
      });

      console.log("Login response status:", response.status);

      // The response should contain user data and token
      const { user, token } = response.data;

      if (!user || !token) {
        setError("Invalid response from server");
        return;
      }

      // Store the token with the exact key the server expects
      await AsyncStorage.setItem("token", token);
      
      // Store user data
      await AsyncStorage.setItem("user", JSON.stringify(user));
      
      // Log the authentication result
      console.log("Authentication successful. Token stored.");

      // Use login function from AuthContext
      await login({ emailOrPhone, password });

      // Navigation will be handled automatically by AuthContext
      // Comment out the following navigation code:
      /*
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
      */
    } catch (error: any) {
      console.error("Login error details:", error.message, error.response?.data);
      
      // Handle different types of errors
      if (error.code === 'ECONNABORTED') {
        setError("Login failed: Request timed out. Server might be busy or unavailable.");
      } else if (!error.response) {
        setError("Login failed: No response from server. Please check your connection.");
      } else if (error.response?.status === 401) {
        setError("Login failed. Please check your credentials");
      } else if (error.response?.status === 404) {
        setError("Account does not exist. Please check your email or phone number.");
      } else if (error.response?.data?.message) {
        setError(`Login failed: ${error.response.data.message}`);
      } else {
        setError("Login failed. Please check your credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate("Register");
  };

  const navigateToForgotPassword = () => {
    navigation.navigate("ForgotPassword");
  };

  // Test server connection
  const testConnection = async () => {
    try {
      setLoading(true);
      setError("Testing connection...");
      
      // Try multiple endpoints
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      console.log(`Testing connection to: ${API_URL}`);
      
      // Try multiple endpoints
      let connected = false;
      let statusCode = 0;
      
      try {
        // Try root endpoint
        const rootResponse = await fetch(`${API_URL}`, {
          method: 'GET',
          signal: controller.signal
        });
        
        statusCode = rootResponse.status;
        if (rootResponse.ok || rootResponse.status < 500) {
          connected = true;
          setError(`Connected to server (status: ${rootResponse.status})`);
        }
      } catch (e) {
        console.log("Root endpoint test failed:", e);
      }
      
      if (!connected) {
        try {
          // Try auth endpoint
          const authResponse = await fetch(`${API_URL}/api/auth`, {
            method: 'GET',
            signal: controller.signal
          });
          
          statusCode = authResponse.status;
          if (authResponse.ok || authResponse.status === 401 || authResponse.status === 403) {
            connected = true;
            setError(`Connected to server (status: ${authResponse.status})`);
          }
        } catch (e) {
          console.log("Auth endpoint test failed:", e);
        }
      }
      
      clearTimeout(timeoutId);
      
      setNetworkAvailable(connected);
      
      if (!connected) {
        if (statusCode > 0) {
          setError(`Connection test failed with status: ${statusCode}`);
        } else {
          setError(`Connection failed: Cannot reach server at ${API_URL}. Check network settings and server status.`);
        }
      } else {
        setTimeout(() => setError(""), 5000);
      }
    } catch (error: any) {
      setNetworkAvailable(false);
      setError(`Connection test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>iTalk+</Text>
          <Text style={styles.tagline}>Connect with friends and family</Text>
          {!networkAvailable && (
            <Text style={styles.offlineNotice}>⚠️ Offline Mode</Text>
          )}
        </View>

        <View style={styles.formContainer}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#999"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email or Phone Number"
              value={emailOrPhone}
              onChangeText={(text) => {
                setEmailOrPhone(text);
                setError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#999"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError("");
              }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={navigateToForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.loginButton,
              (loading || !emailOrPhone || !password || !networkAvailable) &&
                styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading || !emailOrPhone || !password || !networkAvailable}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {!networkAvailable && (
            <TouchableOpacity
              style={styles.testConnectionButton}
              onPress={testConnection}
              disabled={loading}
            >
              <Text style={styles.testConnectionText}>Test Connection</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={navigateToRegister}>
            <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.apiInfo}>{`API: ${API_URL}`}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 30,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  logoText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#2196F3",
  },
  tagline: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  offlineNotice: {
    color: "#f44336",
    marginTop: 10,
    fontSize: 14,
    fontWeight: "bold",
  },
  formContainer: {
    marginBottom: 30,
  },
  errorText: {
    color: "#f44336",
    marginBottom: 15,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333",
  },
  passwordToggle: {
    padding: 5,
  },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: "#2196F3",
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  loginButtonDisabled: {
    backgroundColor: "#9fc5e8",
    elevation: 0,
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    color: "#666",
    fontSize: 14,
  },
  registerLink: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
  testConnectionButton: {
    marginTop: 15,
    padding: 10,
    alignItems: "center",
  },
  testConnectionText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
  apiInfo: {
    color: "#999",
    fontSize: 10,
    textAlign: "center",
    marginTop: 20,
  },
});

export default LoginScreen;
