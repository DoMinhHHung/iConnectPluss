import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import moment from "moment";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { API_URL } from "../../config/constants";
import ImageUploader from "../../components/ImageUploader";

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser, logout, token } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  
  useEffect(() => {
    if (user) {
      const newAvatarUrl = user?.avt || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "")}`;
      console.log("Avatar URL updated:", newAvatarUrl);
      setAvatarUrl(newAvatarUrl);
    }
  }, [user]);

  const handleEditProfile = () => {
    navigation.navigate("EditProfile", { user });
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        onPress: logout,
        style: "destructive",
      },
    ]);
  };

  const handleAvatarUploaded = async (imageUrl: string) => {
    try {
      console.log("ProfileScreen: Starting avatar update with URL:", imageUrl?.substring(0, 50));
      
      // Validate URL format
      if (!imageUrl || !imageUrl.startsWith('http')) {
        console.error("ProfileScreen: Invalid image URL format:", imageUrl?.substring(0, 50));
        Alert.alert("Error", "Invalid image URL format");
        return;
      }
      
      console.log("ProfileScreen: Making API request to update user profile", {
        userId: user?._id,
        endpoint: `${API_URL}/api/user/update/${user?._id}`
      });
      
      const response = await axios.put(
        `${API_URL}/api/user/update/${user?._id}`,
        { avt: imageUrl },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        }
      );
      
      console.log("ProfileScreen: Avatar update response status:", response.status);
      console.log("ProfileScreen: Avatar update response data:", response.data);
      
      if (response.data && response.data.user) {
        console.log("ProfileScreen: Setting new avatar URL:", response.data.user.avt?.substring(0, 50));
        setAvatarUrl(response.data.user.avt);
        await updateUser(response.data.user);
        Alert.alert("Success", "Profile picture updated successfully");
      } else {
        console.error("ProfileScreen: Missing user data in response");
        Alert.alert("Warning", "Avatar updated but user data not returned properly");
      }
    } catch (error) {
      console.error("ProfileScreen: Failed to update avatar:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to update profile with new image URL");
    }
  };

  if (!user) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Format birthdate
  const formattedBirthDate = user.birthDate
    ? moment(user.birthDate).format("MMMM D, YYYY")
    : "Not set";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <ImageUploader
              initialImageUrl={avatarUrl}
              onImageUploaded={handleAvatarUploaded}
              size={100}
              showIcon={true}
              circular={true}
            />
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#666"
              style={styles.infoIcon}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email || "Not set"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Ionicons
              name="call-outline"
              size={20}
              color="#666"
              style={styles.infoIcon}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.phone || "Not set"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Ionicons
              name="transgender-outline"
              size={20}
              color="#666"
              style={styles.infoIcon}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{user.gender || "Not set"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color="#666"
              style={styles.infoIcon}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Birth Date</Text>
              <Text style={styles.infoValue}>{formattedBirthDate}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Ionicons
              name="location-outline"
              size={20}
              color="#666"
              style={styles.infoIcon}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{user.address || "Not set"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.optionsSection}>
          <TouchableOpacity style={styles.optionItem}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#2196F3"
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Privacy Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color="#2196F3"
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Notification Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <Ionicons
              name="key-outline"
              size={20}
              color="#2196F3"
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <Ionicons
              name="help-circle-outline"
              size={20}
              color="#2196F3"
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionItem, styles.dangerOption]}>
            <Ionicons
              name="trash-outline"
              size={20}
              color="#f44336"
              style={styles.optionIcon}
            />
            <Text style={[styles.optionText, styles.dangerText]}>
              Delete Account
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>iTalk+ v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  logoutButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
  },
  avatarContainer: {
    position: "relative",
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIconContainer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#2196F3",
    padding: 8,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  editButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "#fff",
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoIcon: {
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
  },
  optionsSection: {
    backgroundColor: "#fff",
    marginTop: 20,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  optionIcon: {
    marginRight: 15,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  dangerOption: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: "#f44336",
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  versionText: {
    color: "#999",
    fontSize: 12,
  },
});

export default ProfileScreen;
