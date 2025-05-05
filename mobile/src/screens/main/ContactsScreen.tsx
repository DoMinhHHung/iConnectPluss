import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TouchableHighlight,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
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
}

interface FriendshipStatus {
  status: "friends" | "pending" | "requested" | "none";
  _id?: string;
}

const ContactsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useContext(AuthContext);

  const [friends, setFriends] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<
    Record<string, FriendshipStatus>
  >({});

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("friends"); // 'friends', 'pending', 'search'

  // Load friends list
  const loadFriends = async () => {
    try {
      // Get token from storage
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("No auth token available for loading friends");
        Alert.alert("Error", "Authentication required. Please log in again.");
        return;
      }

      console.log("Loading friends with token");
      const response = await axios.get(`${API_URL}/api/friendship`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log("Friendship data received:", response.data);
      
      // Transform the friendship data to match expected format
      const friendsList = response.data.map((friendship: any) => {
        // Determine which user is the friend (not the current user)
        const friendData = friendship.requester && friendship.requester._id !== user?._id 
          ? friendship.requester 
          : friendship.recipient;
        
        // Skip if friend data is missing
        if (!friendData) return null;
        
        return {
          _id: friendData._id,
          name: friendData.name || `${friendData.firstName || ''} ${friendData.lastName || ''}`.trim(),
          email: friendData.email || '',
          avt: friendData.avt || friendData.avatar || '',
          isOnline: friendData.isOnline || false
        };
      }).filter(Boolean); // Remove any null entries
      
      console.log(`Transformed ${friendsList.length} friends`);
      setFriends(friendsList);
    } catch (error) {
      console.error("Failed to load friends:", error);
      Alert.alert("Error", "Failed to load friends list");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load pending requests
  const loadPendingRequests = async () => {
    try {
      // Get token from storage
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("No auth token available for loading pending requests");
        return;
      }

      // Thử endpoint chính trước
      try {
        const response = await axios.get(
          `${API_URL}/api/friendship/pending-requests`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        console.log("Pending requests received:", response.data);
        
        // Transform the pending requests data if needed
        const transformedRequests = response.data.map((request: any) => {
          const requestUser = request.requester || {};
          return {
            _id: requestUser._id,
            name: requestUser.name || `${requestUser.firstName || ''} ${requestUser.lastName || ''}`.trim(),
            email: requestUser.email || '',
            avt: requestUser.avt || requestUser.avatar || '',
            // Lưu _id của request để sử dụng khi chấp nhận/từ chối
            requestId: request._id
          };
        });
        
        setPendingRequests(transformedRequests);
        
        // Lưu thông tin trạng thái kết bạn
        const status: Record<string, FriendshipStatus> = {};
        transformedRequests.forEach((user: any) => {
          status[user._id] = { status: 'pending', _id: user.requestId };
        });
        setFriendshipStatus({...friendshipStatus, ...status});
        
        return;
      } catch (primaryError) {
        console.error("Failed with primary endpoint:", primaryError);
        
        // Thử endpoint thay thế
        try {
          const response = await axios.get(
            `${API_URL}/api/friendship/requests/received`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          console.log("Pending requests received (alternate endpoint):", response.data);
          
          const transformedRequests = response.data.map((request: any) => {
            const requestUser = request.requester || {};
            return {
              _id: requestUser._id,
              name: requestUser.name || `${requestUser.firstName || ''} ${requestUser.lastName || ''}`.trim(),
              email: requestUser.email || '',
              avt: requestUser.avt || requestUser.avatar || '',
              requestId: request._id
            };
          });
          
          setPendingRequests(transformedRequests);
          
          // Lưu thông tin trạng thái kết bạn
          const status: Record<string, FriendshipStatus> = {};
          transformedRequests.forEach((user: any) => {
            status[user._id] = { status: 'pending', _id: user.requestId };
          });
          setFriendshipStatus({...friendshipStatus, ...status});
          
          return;
        } catch (secondaryError) {
          console.error("Failed with alternate endpoint:", secondaryError);
          throw primaryError;
        }
      }
    } catch (error) {
      console.error("Failed to load pending requests:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
    }
  };

  // Initial data loading
  useEffect(() => {
    loadFriends();
    loadPendingRequests();
  }, []);

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      
      // Lấy token xác thực
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("Không có token xác thực");
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        setSearching(false);
        return;
      }
      
      const response = await axios.get(
        `${API_URL}/api/user/search?query=${searchQuery}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Filter out the current user
      const filteredResults = response.data.filter(
        (result: User) => result._id !== user?._id
      );

      setSearchResults(filteredResults);

      // Get friendship status for each user
      const statusPromises = filteredResults.map((result: User) =>
        axios.get(`${API_URL}/api/friendship/status/${result._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );

      const statusResponses = await Promise.all(statusPromises);

      const newFriendshipStatus: Record<string, FriendshipStatus> = {};
      statusResponses.forEach((response, index) => {
        newFriendshipStatus[filteredResults[index]._id] = response.data;
      });

      setFriendshipStatus(newFriendshipStatus);
    } catch (error) {
      console.error("Search failed:", error);
      Alert.alert("Lỗi", "Không thể tìm kiếm người dùng");
    } finally {
      setSearching(false);
    }
  };

  // Handle friend request
  const sendFriendRequest = async (userId: string) => {
    try {
      // Lấy token xác thực
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("Không có token xác thực");
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }
      
      console.log("Gửi yêu cầu kết bạn đến:", userId);
      console.log("Token:", token.substring(0, 10) + "...");
      
      // Tạo dữ liệu request
      const requestData = {
        recipientId: userId,
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
        
        // Update friendship status
        setFriendshipStatus({
          ...friendshipStatus,
          [userId]: { status: "requested" },
        });

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
          
          // Update friendship status
          setFriendshipStatus({
            ...friendshipStatus,
            [userId]: { status: "requested" },
          });

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

  // Handle accepting friend request
  const acceptFriendRequest = async (userId: string, requestId: string) => {
    try {
      // Lấy token xác thực
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("Không có token xác thực");
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }
      
      console.log("Accepting friend request:", requestId, "from user:", userId);
      
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

      // Refresh the lists
      loadFriends();
      loadPendingRequests();

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

  // Handle rejecting friend request
  const rejectFriendRequest = async (userId: string, requestId: string) => {
    try {
      // Lấy token xác thực
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("Không có token xác thực");
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }
      
      console.log("Rejecting friend request:", requestId, "from user:", userId);
      
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

      // Refresh the pending requests list
      loadPendingRequests();

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

  // Handle unfriend
  const handleUnfriend = async (userId: string) => {
    try {
      // Lấy token xác thực
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("Không có token xác thực");
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }
      
      await axios.delete(`${API_URL}/api/friendship/unfriend/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Refresh the friends list
      loadFriends();

      // Update status if in search results
      if (friendshipStatus[userId]) {
        setFriendshipStatus({
          ...friendshipStatus,
          [userId]: { status: "none" },
        });
      }

      Alert.alert("Thành công", "Đã hủy kết bạn");
    } catch (error) {
      console.error("Failed to unfriend:", error);
      Alert.alert("Lỗi", "Không thể hủy kết bạn");
    }
  };

  // Navigate to chat with a friend
  const navigateToChat = (contact: User) => {
    // Create a chat ID from the two user IDs (sorted)
    const userIds = [user?._id, contact._id].sort();
    const chatId = `${userIds[0]}_${userIds[1]}`;

    navigation.navigate("ChatDetail", {
      chatId,
      chatName: contact.name,
      contactId: contact._id,
      contactAvatar: contact.avt,
    });
  };

  // View a user's profile
  const viewContactProfile = (contact: User) => {
    navigation.navigate("ContactDetail", {
      contactId: contact._id,
      contactName: contact.name,
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadFriends();
    loadPendingRequests();
  };

  // Render a friend item
  const renderFriendItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => viewContactProfile(item)}
    >
      <Image
        source={{
          uri:
            item.avt ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}`,
        }}
        style={styles.contactAvatar}
      />

      {item.isOnline && <View style={styles.onlineIndicator} />}

      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactEmail}>{item.email}</Text>
      </View>

      <TouchableOpacity
        style={styles.messageButton}
        onPress={() => navigateToChat(item)}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={20}
          color="#2196F3"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => {
          Alert.alert(
            "Friend Options",
            `What would you like to do with ${item.name}?`,
            [
              { text: "View Profile", onPress: () => viewContactProfile(item) },
              { text: "Message", onPress: () => navigateToChat(item) },
              {
                text: "Unfriend",
                onPress: () => {
                  Alert.alert(
                    "Confirm Unfriend",
                    `Are you sure you want to remove ${item.name} from your friends?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        onPress: () => handleUnfriend(item._id),
                        style: "destructive",
                      },
                    ]
                  );
                },
                style: "destructive",
              },
              { text: "Cancel", style: "cancel" },
            ]
          );
        }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render a pending request item
  const renderRequestItem = ({ item }: { item: User }) => {
    // Get the request ID directly from the item
    const requestId = (item as any).requestId || "";

    return (
      <View style={styles.requestItem}>
        <Image
          source={{
            uri:
              item.avt ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                item.name
              )}`,
          }}
          style={styles.contactAvatar}
        />

        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactEmail}>{item.email}</Text>
        </View>

        <View style={styles.requestButtons}>
          <TouchableOpacity
            style={[styles.requestButton, styles.acceptButton]}
            onPress={() => acceptFriendRequest(item._id, requestId)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.requestButton, styles.rejectButton]}
            onPress={() => rejectFriendRequest(item._id, requestId)}
          >
            <Text style={styles.rejectButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render a search result item
  const renderSearchResultItem = ({ item }: { item: User }) => {
    const status = friendshipStatus[item._id]?.status || "none";

    return (
      <View style={styles.contactItem}>
        <Image
          source={{
            uri:
              item.avt ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                item.name
              )}`,
          }}
          style={styles.contactAvatar}
        />

        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactEmail}>{item.email}</Text>
        </View>

        {status === "none" && (
          <TouchableHighlight
            style={styles.addButton}
            onPress={() => {
              console.log("Đã bấm nút kết bạn với:", item._id, item.name);
              
              // Thêm thời gian trễ nhỏ để đảm bảo animation hiển thị trước khi gọi API
              setTimeout(() => {
                sendFriendRequest(item._id);
              }, 100);
            }}
            underlayColor="#1565C0" // Màu khi ấn xuống, xanh đậm hơn
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={20} color="#fff" />
          </TouchableHighlight>
        )}

        {status === "pending" && (
          <View style={styles.pendingButton}>
            <Text style={styles.pendingButtonText}>Pending</Text>
          </View>
        )}

        {status === "requested" && (
          <View style={styles.requestedButton}>
            <Text style={styles.requestedButtonText}>Sent</Text>
          </View>
        )}

        {status === "friends" && (
          <View style={styles.friendsButton}>
            <Ionicons name="checkmark-circle" size={22} color="#4caf50" />
          </View>
        )}
      </View>
    );
  };

  // Empty list components
  const EmptyFriendsList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={60} color="#ddd" />
      <Text style={styles.emptyText}>No friends yet</Text>
      <Text style={styles.emptySubtext}>
        Search for people to add as friends
      </Text>
    </View>
  );

  const EmptyRequestsList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="mail-outline" size={60} color="#ddd" />
      <Text style={styles.emptyText}>No friend requests</Text>
      <Text style={styles.emptySubtext}>
        When people send you friend requests, you'll see them here
      </Text>
    </View>
  );

  const EmptySearchResults = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={60} color="#ddd" />
      <Text style={styles.emptyText}>No results found</Text>
      <Text style={styles.emptySubtext}>
        Try searching with a different name or email
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for people..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.trim() !== "" && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery("");
                setActiveTab("friends");
                setSearchResults([]);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "friends" && styles.activeTab]}
          onPress={() => setActiveTab("friends")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "friends" && styles.activeTabText,
            ]}
          >
            Friends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.activeTab]}
          onPress={() => setActiveTab("pending")}
        >
          <View style={styles.tabWithBadge}>
            <Text
              style={[
                styles.tabText,
                activeTab === "pending" && styles.activeTabText,
              ]}
            >
              Requests
            </Text>
            {pendingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {searchResults.length > 0 && (
          <TouchableOpacity
            style={[styles.tab, activeTab === "search" && styles.activeTab]}
            onPress={() => setActiveTab("search")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "search" && styles.activeTabText,
              ]}
            >
              Results
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === "friends" &&
        (loading ? (
          <ActivityIndicator
            style={styles.loader}
            size="large"
            color="#2196F3"
          />
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={
              friends.length === 0 ? styles.emptyList : null
            }
            ListEmptyComponent={EmptyFriendsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#2196F3"]}
              />
            }
          />
        ))}

      {activeTab === "pending" && (
        <FlatList
          data={pendingRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={
            pendingRequests.length === 0 ? styles.emptyList : null
          }
          ListEmptyComponent={EmptyRequestsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#2196F3"]}
            />
          }
        />
      )}

      {activeTab === "search" &&
        (searching ? (
          <ActivityIndicator
            style={styles.loader}
            size="large"
            color="#2196F3"
          />
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResultItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={
              searchResults.length === 0 ? styles.emptyList : null
            }
            ListEmptyComponent={EmptySearchResults}
          />
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 30,
  },
  searchContainer: {
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    height: 40,
  },
  clearButton: {
    padding: 5,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#2196F3",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#2196F3",
  },
  tabWithBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#f44336",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 5,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    position: "relative",
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4caf50",
    position: "absolute",
    bottom: 15,
    left: 50,
    borderWidth: 2,
    borderColor: "#fff",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 3,
  },
  contactEmail: {
    fontSize: 14,
    color: "#666",
  },
  messageButton: {
    padding: 10,
  },
  moreButton: {
    padding: 10,
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  requestButtons: {
    flexDirection: "row",
  },
  requestButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: "#2196F3",
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  rejectButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  rejectButtonText: {
    color: "#666",
    fontSize: 12,
  },
  addButton: {
    backgroundColor: "#2196F3",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  pendingButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "#f5f5f5",
  },
  pendingButtonText: {
    color: "#666",
    fontSize: 12,
  },
  requestedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "#e3f2fd",
  },
  requestedButtonText: {
    color: "#2196F3",
    fontSize: 12,
  },
  friendsButton: {
    padding: 5,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ContactsScreen;
