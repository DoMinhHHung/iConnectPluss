import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableHighlight,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { API_URL } from "../../config/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avt?: string;
  isOnline?: boolean;
  gender?: string;
  birthDate?: string;
  address?: string;
  isVerified?: boolean;
}

interface FriendshipStatus {
  status: "friends" | "pending" | "requested" | "none";
  _id?: string;
}

const ContactDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useContext(AuthContext);
  
  const { contactId, contactName } = route.params;

  const [contact, setContact] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>({ status: "none" });

  useEffect(() => {
    fetchContactDetails();
  }, [contactId]);

  const fetchContactDetails = async () => {
    try {
      setLoading(true);
      
      // Lấy token xác thực
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("Không có token xác thực");
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }
      
      // Lấy thông tin chi tiết người dùng
      const responseUser = await axios.get(`${API_URL}/api/users/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setContact(responseUser.data);

      // Kiểm tra trạng thái kết bạn - thử endpoint chính
      try {
        const responseFriendship = await axios.get(`${API_URL}/api/friendship/status/${contactId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log("Friendship status:", responseFriendship.data);
        setFriendshipStatus(responseFriendship.data);
      } catch (primaryError) {
        console.error("Failed with primary friendship status endpoint:", primaryError);
        
        // Thử endpoint thay thế
        try {
          const responseFriendship = await axios.get(`${API_URL}/api/friendship/check/${contactId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log("Friendship status (alternate):", responseFriendship.data);
          setFriendshipStatus(responseFriendship.data);
        } catch (secondaryError) {
          console.error("Failed with secondary friendship status endpoint:", secondaryError);
          // Default to "none" status if both endpoints fail
          setFriendshipStatus({ status: "none" });
        }
      }
    } catch (error) {
      console.error("Failed to fetch contact details:", error);
      Alert.alert("Error", "Failed to load contact information");
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      // Lấy token xác thực
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("Không có token xác thực");
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }
      
      console.log("Gửi yêu cầu kết bạn đến:", contactId);
      console.log("Token:", token.substring(0, 10) + "...");
      
      // Tạo dữ liệu request
      const requestData = {
        recipientId: contactId,
      };
      
      console.log("Request data:", JSON.stringify(requestData));
      
      // Chuẩn bị headers
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      console.log("Request headers:", JSON.stringify(headers));
      
      // Thử endpoint chính
      try {
        const response = await axios.post(
          `${API_URL}/api/friendship/send-request`, 
          requestData,
          { headers }
        );
        
        console.log("API response:", response.status, JSON.stringify(response.data));
        setFriendshipStatus({ status: "requested" });
        Alert.alert("Thành công", "Đã gửi lời mời kết bạn");
        return;
      } catch (primaryError) {
        console.error("Lỗi endpoint chính:", primaryError);
        
        // Nếu endpoint chính thất bại, thử endpoint thứ hai
        try {
          const response = await axios.post(
            `${API_URL}/api/friendship/request`, 
            requestData,
            { headers }
          );
          
          console.log("API response (endpoint phụ):", response.status, JSON.stringify(response.data));
          setFriendshipStatus({ status: "requested" });
          Alert.alert("Thành công", "Đã gửi lời mời kết bạn");
          return;
        } catch (secondaryError) {
          console.error("Lỗi endpoint phụ:", secondaryError);
          throw primaryError; // Ném lại lỗi ban đầu
        }
      }
    } catch (error) {
      console.error("Failed to send friend request:", error);
      
      // Log chi tiết lỗi
      if (error.response) {
        console.error("Response data:", JSON.stringify(error.response.data));
        console.error("Response status:", error.response.status);
        console.error("Response headers:", JSON.stringify(error.response.headers));
        
        Alert.alert(
          "Lỗi", 
          `Không thể gửi lời mời kết bạn (${error.response.status}): ${JSON.stringify(error.response.data)}`
        );
      } else if (error.request) {
        // Request được gửi nhưng không nhận được response
        console.error("No response received:", error.request);
        Alert.alert("Lỗi", "Không nhận được phản hồi từ máy chủ. Vui lòng kiểm tra kết nối mạng.");
      } else {
        // Có lỗi khác khi cài đặt request
        console.error("Error message:", error.message);
        Alert.alert("Lỗi", `Lỗi khi gửi yêu cầu: ${error.message}`);
      }
    }
  };

  const handleAcceptFriendRequest = async () => {
    try {
      // Lấy token xác thực
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("Không có token xác thực");
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }
      
      const requestId = friendshipStatus._id;
      console.log("Accepting friend request with ID:", requestId);
      
      if (!requestId) {
        console.error("No request ID available");
        Alert.alert("Lỗi", "Không tìm thấy ID của lời mời kết bạn");
        return;
      }
      
      // Mảng các phương thức API có thể
      const possibleEndpoints = [
        // Endpoint với request body là requestId
        {
          url: `${API_URL}/api/friendship/accept-request`,
          method: 'post',
          data: { requestId }
        },
        // Endpoint với request body là friendshipId
        {
          url: `${API_URL}/api/friendship/accept-request`,
          method: 'post',
          data: { friendshipId: requestId }
        },
        // Endpoint với ID trong path
        {
          url: `${API_URL}/api/friendship/accept/${requestId}`,
          method: 'post',
          data: {}
        },
        // Endpoint với ID trong path (requests)
        {
          url: `${API_URL}/api/friendship/requests/accept/${requestId}`,
          method: 'post',
          data: {}
        },
        // Endpoint với ID trong path (request)
        {
          url: `${API_URL}/api/friendship/request/accept/${requestId}`,
          method: 'post',
          data: {}
        },
        // Endpoint khác có thể
        {
          url: `${API_URL}/api/friendship/requests/accept`,
          method: 'post',
          data: { requestId }
        },
        // Endpoint khác có thể
        {
          url: `${API_URL}/api/friendship/request/accept`,
          method: 'post',
          data: { requestId }
        }
      ];

      // Thử từng endpoint cho đến khi thành công
      let success = false;
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Đang thử endpoint: ${endpoint.url}`, endpoint.data);
          const response = await axios({
            method: endpoint.method,
            url: endpoint.url,
            data: endpoint.data,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log("API accept response successful:", response.status);
          success = true;
          break;
        } catch (error) {
          console.log(`Thất bại với endpoint ${endpoint.url}:`, error.message);
        }
      }
      
      if (!success) {
        console.error("Đã thử tất cả các endpoint nhưng không thành công");
        throw new Error("No endpoint worked");
      }
      
      setFriendshipStatus({ status: "friends", _id: friendshipStatus._id });
      Alert.alert("Thành công", "Đã chấp nhận lời mời kết bạn");
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      if (error.response) {
        console.error("Response data:", JSON.stringify(error.response.data));
        console.error("Response status:", error.response.status);
      }
      Alert.alert("Lỗi", "Không thể chấp nhận lời mời kết bạn. Vui lòng thử lại sau.");
    }
  };

  const handleRejectFriendRequest = async () => {
    try {
      // Lấy token xác thực
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("Không có token xác thực");
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }
      
      const requestId = friendshipStatus._id;
      console.log("Rejecting friend request with ID:", requestId);
      
      if (!requestId) {
        console.error("No request ID available");
        Alert.alert("Lỗi", "Không tìm thấy ID của lời mời kết bạn");
        return;
      }
      
      // Mảng các phương thức API có thể
      const possibleEndpoints = [
        // Endpoint với request body là requestId
        {
          url: `${API_URL}/api/friendship/reject-request`,
          method: 'post',
          data: { requestId }
        },
        // Endpoint với request body là friendshipId
        {
          url: `${API_URL}/api/friendship/reject-request`,
          method: 'post',
          data: { friendshipId: requestId }
        },
        // Endpoint với ID trong path
        {
          url: `${API_URL}/api/friendship/reject/${requestId}`,
          method: 'post',
          data: {}
        },
        // Endpoint với ID trong path (requests)
        {
          url: `${API_URL}/api/friendship/requests/reject/${requestId}`,
          method: 'post',
          data: {}
        },
        // Endpoint với ID trong path (request)
        {
          url: `${API_URL}/api/friendship/request/reject/${requestId}`,
          method: 'post',
          data: {}
        },
        // Endpoint khác có thể
        {
          url: `${API_URL}/api/friendship/requests/reject`,
          method: 'post',
          data: { requestId }
        },
        // Endpoint khác có thể
        {
          url: `${API_URL}/api/friendship/request/reject`,
          method: 'post',
          data: { requestId }
        }
      ];

      // Thử từng endpoint cho đến khi thành công
      let success = false;
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Đang thử endpoint: ${endpoint.url}`, endpoint.data);
          const response = await axios({
            method: endpoint.method,
            url: endpoint.url,
            data: endpoint.data,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log("API reject response successful:", response.status);
          success = true;
          break;
        } catch (error) {
          console.log(`Thất bại với endpoint ${endpoint.url}:`, error.message);
        }
      }
      
      if (!success) {
        console.error("Đã thử tất cả các endpoint nhưng không thành công");
        throw new Error("No endpoint worked");
      }
      
      setFriendshipStatus({ status: "none" });
      Alert.alert("Thành công", "Đã từ chối lời mời kết bạn");
    } catch (error) {
      console.error("Failed to reject friend request:", error);
      if (error.response) {
        console.error("Response data:", JSON.stringify(error.response.data));
        console.error("Response status:", error.response.status);
      }
      Alert.alert("Lỗi", "Không thể từ chối lời mời kết bạn. Vui lòng thử lại sau.");
    }
  };

  const handleUnfriend = async () => {
    try {
      // Lấy token xác thực
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("Không có token xác thực");
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }
      
      await axios.delete(`${API_URL}/api/friendship/unfriend/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setFriendshipStatus({ status: "none" });
      Alert.alert("Thành công", "Đã hủy kết bạn");
    } catch (error) {
      console.error("Failed to unfriend:", error);
      Alert.alert("Lỗi", "Không thể hủy kết bạn");
    }
  };

  const handleStartChat = () => {
    if (!contact) return;
    
    // Tạo ID chat từ hai ID người dùng (sắp xếp theo thứ tự)
    const userIds = [user?._id, contact._id].sort();
    const chatId = `${userIds[0]}_${userIds[1]}`;

    navigation.navigate("ChatDetail", {
      chatId,
      chatName: contact.name,
      contactId: contact._id,
      contactAvatar: contact.avt,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{contactName || "Contact"}</Text>
          <View style={styles.placeholderRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={styles.placeholderRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Contact not found</Text>
        </View>
      </View>
    );
  }

  // Xác định avatar URL
  const avatarUrl = contact.avt || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{contact.name}</Text>
        <View style={styles.placeholderRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            {contact.isOnline && <View style={styles.onlineIndicator} />}
          </View>
          <Text style={styles.name}>{contact.name}</Text>
          {contact.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#2196F3" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleStartChat}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#2196F3" />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>

          {friendshipStatus.status === "none" && (
            <TouchableHighlight
              style={[styles.actionButton, styles.addFriendButton]}
              onPress={() => {
                console.log("Đã bấm nút kết bạn với:", contactId, contact?.name);
                
                // Thêm thời gian trễ nhỏ để đảm bảo animation hiển thị trước khi gọi API
                setTimeout(() => {
                  handleSendFriendRequest();
                }, 100);
              }}
              underlayColor="#3a9d3a" // Màu khi ấn xuống
              activeOpacity={0.7}
            >
              <View style={styles.buttonInner}>
                <Ionicons name="person-add-outline" size={24} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, styles.addFriendButtonText]}>Add Friend</Text>
              </View>
            </TouchableHighlight>
          )}

          {friendshipStatus.status === "requested" && (
            <TouchableOpacity 
              style={[styles.actionButton, { opacity: 0.6 }]}
              disabled
            >
              <Ionicons name="time-outline" size={24} color="#2196F3" />
              <Text style={styles.actionButtonText}>Request Sent</Text>
            </TouchableOpacity>
          )}

          {friendshipStatus.status === "pending" && (
            <View style={styles.pendingButtonsContainer}>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={handleAcceptFriendRequest}
              >
                <Ionicons name="checkmark-outline" size={24} color="#ffffff" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={handleRejectFriendRequest}
              >
                <Ionicons name="close-outline" size={24} color="#ffffff" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {friendshipStatus.status === "friends" && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: "#f0f0f0" }]}
              onPress={handleUnfriend}
            >
              <Ionicons name="person-remove-outline" size={24} color="#FF3B30" />
              <Text style={[styles.actionButtonText, { color: "#FF3B30" }]}>Unfriend</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contact Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color="#777" style={styles.infoIcon} />
            <View>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{contact.email}</Text>
            </View>
          </View>

          {contact.phone && (
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={20} color="#777" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{contact.phone}</Text>
              </View>
            </View>
          )}

          {contact.gender && (
            <View style={styles.infoItem}>
              <Ionicons name={contact.gender === 'male' ? 'male-outline' : 'female-outline'} size={20} color="#777" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{contact.gender.charAt(0).toUpperCase() + contact.gender.slice(1)}</Text>
              </View>
            </View>
          )}

          {contact.address && (
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color="#777" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{contact.address}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
    flex: 1,
    textAlign: "center",
  },
  placeholderRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F4FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  verifiedText: {
    color: "#2196F3",
    marginLeft: 4,
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  actionButton: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    marginTop: 8,
    color: "#2196F3",
  },
  pendingButtonsContainer: {
    flexDirection: "row",
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    marginLeft: 4,
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF3B30",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: "#FFFFFF",
    marginLeft: 4,
  },
  infoSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: "#777",
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
  },
  addFriendButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFriendButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
});

export default ContactDetailScreen;