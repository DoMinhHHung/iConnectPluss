import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { API_URL } from "../../config/constants";
import ImageUploader from "../../components/ImageUploader";

interface UserData {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  birthDate?: string;
  address?: string;
  avt?: string;
  [key: string]: any;
}

const EditProfileScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user: initialUser, updateUser, token } = useContext(AuthContext);

  // Nhận dữ liệu người dùng từ navigation params hoặc context
  const userFromParams = route.params?.user;
  const userToEdit = userFromParams || initialUser;

  // Form state
  const [userData, setUserData] = useState<UserData>({
    _id: userToEdit?._id || "",
    name: userToEdit?.name || "",
    email: userToEdit?.email || "",
    phone: userToEdit?.phone || "",
    gender: userToEdit?.gender || "",
    birthDate: userToEdit?.birthDate || "",
    address: userToEdit?.address || "",
    avt: userToEdit?.avt || "",
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  // Kiểm tra xem email có thay đổi không
  const isEmailChanged = userData.email !== userToEdit?.email;

  const handleInputChange = (field: string, value: string) => {
    setUserData({ ...userData, [field]: value });
  };

  const handleAvatarUploaded = (imageUrl: string) => {
    console.log("EditProfileScreen: Avatar uploaded, new URL:", imageUrl?.substring(0, 50));
    
    // Validate URL format
    if (!imageUrl || !imageUrl.startsWith('http')) {
      console.error("EditProfileScreen: Invalid image URL format:", imageUrl?.substring(0, 50));
      Alert.alert("Error", "Invalid image URL format");
      return;
    }
    
    // Cập nhật avatar URL trong form data
    setUserData({ ...userData, avt: imageUrl });
    // Không cần gọi API riêng, avatar sẽ được cập nhật khi submit form
    console.log("EditProfileScreen: Avatar updated locally:", imageUrl?.substring(0, 50));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setUserData({ ...userData, birthDate: selectedDate.toISOString() });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const requestOtp = async () => {
    if (!userData.email) {
      setError("Email is required");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/user/request-otp`, {
        email: userData.email,
      });

      if (response.status === 200) {
        setOtpSent(true);
        Alert.alert("OTP Sent", "Please check your email for the OTP code");
      }
    } catch (error) {
      console.error("Failed to request OTP:", error);
      setError("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (!userData.name) {
      setError("Name is required");
      return;
    }

    // If email changed but no OTP provided
    if (isEmailChanged && !otpSent) {
      requestOtp();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare update data
      const updateData: any = {
        name: userData.name,
        phone: userData.phone,
        gender: userData.gender,
        birthDate: userData.birthDate,
        address: userData.address,
      };

      // Thêm avatar URL nếu đã được thay đổi
      if (userData.avt && userData.avt !== userToEdit?.avt) {
        console.log("EditProfileScreen: Including avatar in update:", userData.avt?.substring(0, 50));
        updateData.avt = userData.avt;
      }

      // Add email and OTP if email changed
      if (isEmailChanged) {
        updateData.email = userData.email;
        if (otpSent) {
          updateData.otp = otp;
        }
      }

      console.log("EditProfileScreen: Submitting update with data:", updateData);
      console.log("EditProfileScreen: API endpoint:", `${API_URL}/api/user/update/${userData._id}`);

      // Update user profile with authorization header
      const response = await axios.put(
        `${API_URL}/api/user/update/${userData._id}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        }
      );

      console.log("EditProfileScreen: Update response status:", response.status);
      console.log("EditProfileScreen: Update response data:", response.data);

      if (response.status === 200) {
        // Update local user data
        if (updateUser && response.data.user) {
          console.log("EditProfileScreen: Updating local user data with:", response.data.user);
          await updateUser(response.data.user);
        } else {
          console.warn("EditProfileScreen: No updateUser function or user data in response");
        }

        Alert.alert("Success", "Profile updated successfully", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      console.error("EditProfileScreen: Failed to update profile:", error.response?.data || error);
      setError(error.response?.data?.message || "Failed to update profile");
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update profile"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          style={styles.saveButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Avatar Section - Sử dụng ImageUploader component */}
        <View style={styles.avatarSection}>
          <ImageUploader
            initialImageUrl={userData.avt}
            onImageUploaded={handleAvatarUploaded}
            size={120}
            circular={true}
            showIcon={true}
            placeholderText="Change Photo"
          />
          <Text style={styles.avatarHelpText}>Tap to change profile photo</Text>
        </View>

        {/* Name Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={userData.name}
            onChangeText={(value) => handleInputChange("name", value)}
            placeholder="Your name"
          />
        </View>

        {/* Email Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={userData.email}
            onChangeText={(value) => handleInputChange("email", value)}
            placeholder="Your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {isEmailChanged && !otpSent && (
            <TouchableOpacity
              style={styles.otpButton}
              onPress={requestOtp}
              disabled={loading}
            >
              <Text style={styles.otpButtonText}>Request OTP</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* OTP Field (only shown if email changed and OTP requested) */}
        {isEmailChanged && otpSent && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>OTP Code</Text>
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP code"
              keyboardType="number-pad"
            />
          </View>
        )}

        {/* Phone Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={userData.phone}
            onChangeText={(value) => handleInputChange("phone", value)}
            placeholder="Your phone number"
            keyboardType="phone-pad"
          />
        </View>

        {/* Gender Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={userData.gender}
              onValueChange={(value) => handleInputChange("gender", value)}
              style={styles.picker}
            >
              <Picker.Item label="Select gender" value="" />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Other" value="other" />
            </Picker>
          </View>
        </View>

        {/* Date of Birth Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>
              {userData.birthDate
                ? formatDate(userData.birthDate)
                : "Select date of birth"}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={
                userData.birthDate ? new Date(userData.birthDate) : new Date()
              }
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>

        {/* Address Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.textArea}
            value={userData.address}
            onChangeText={(value) => handleInputChange("address", value)}
            placeholder="Your address"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Button (for smaller screens) */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Update Profile</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#D32F2F",
  },
  // Avatar styles
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 16,
  },
  avatarHelpText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 100,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  otpButton: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  otpButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 40,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default EditProfileScreen;
