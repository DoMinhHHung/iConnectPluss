import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { API_URL } from "../../config/constants";
import moment from "moment";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define interfaces based on server response format
interface LastMessage {
  id: string;
  content: string;
  type: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  email?: string;
}

interface Chat {
  id: string;
  lastMessage: LastMessage;
  participants: Participant[];
  unreadCount: number;
  updatedAt: string;
  isGroup?: boolean;
}

const ChatScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useContext(AuthContext);
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChats = async () => {
    try {
      // Get token from storage
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("No auth token available");
        setError("Authentication required. Please log in again.");
        return;
      }
      
      console.log("Loading chats with token");
      
      // Try multiple endpoints to get chats data
      let chatData = [];
      let response;
      let success = false;
      
      // First try standard recent chats endpoint
      try {
        console.log("Trying standard recent chats endpoint");
        response = await axios.get(`${API_URL}/api/chat/recent`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data) {
          // Check if response contains array directly or nested
          if (Array.isArray(response.data)) {
            chatData = response.data;
            success = true;
            console.log("Loaded chats from standard endpoint (array format):", chatData.length);
          } else if (response.data.chats && Array.isArray(response.data.chats)) {
            chatData = response.data.chats;
            success = true;
            console.log("Loaded chats from standard endpoint (nested format):", chatData.length);
          }
        }
      } catch (err) {
        console.log("Standard endpoint failed:", err.message);
      }
      
      // If first attempt failed, try conversations endpoint
      if (!success) {
        try {
          console.log("Trying conversations endpoint");
          response = await axios.get(`${API_URL}/api/chat/conversations`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data) {
            if (Array.isArray(response.data)) {
              chatData = response.data;
              success = true;
              console.log("Loaded chats from conversations endpoint (array format):", chatData.length);
            } else if (response.data.conversations && Array.isArray(response.data.conversations)) {
              chatData = response.data.conversations;
              success = true;
              console.log("Loaded chats from conversations endpoint (nested format):", chatData.length);
            }
          }
        } catch (err) {
          console.log("Conversations endpoint failed:", err.message);
        }
      }
      
      // Last attempt - try rooms endpoint
      if (!success) {
        try {
          console.log("Trying rooms endpoint");
          response = await axios.get(`${API_URL}/api/chat/rooms`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data) {
            if (Array.isArray(response.data)) {
              chatData = response.data;
              success = true;
              console.log("Loaded chats from rooms endpoint (array format):", chatData.length);
            } else if (response.data.rooms && Array.isArray(response.data.rooms)) {
              chatData = response.data.rooms;
              success = true;
              console.log("Loaded chats from rooms endpoint (nested format):", chatData.length);
            }
          }
        } catch (err) {
          console.log("Rooms endpoint failed:", err.message);
        }
      }
      
      // If still no chats, try to load from friends list and create chats
      if ((!success || chatData.length === 0) && user?._id) {
        try {
          console.log("Attempting to create chats from friends list");
          
          // Get friends list
          const friendsResponse = await axios.get(`${API_URL}/api/friendship`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (friendsResponse.data && Array.isArray(friendsResponse.data)) {
            const friendships = friendsResponse.data;
            console.log("Found friendships to create chats from:", friendships.length);
            
            // Create synthetic chats from friends
            const syntheticChats = [];
            
            for (const friendship of friendships) {
              // Get the other user (not the current user)
              const otherUser = (friendship.requester?._id === user._id) 
                ? friendship.recipient 
                : friendship.requester;
              
              if (otherUser && otherUser._id) {
                // Check if messages exist between these users
                try {
                  const sortedUserIds = [user._id, otherUser._id].sort();
                  const messagesResponse = await axios.get(
                    `${API_URL}/api/chat/messages/${sortedUserIds[0]}/${sortedUserIds[1]}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    }
                  );
                  
                  if (messagesResponse.data && Array.isArray(messagesResponse.data) && messagesResponse.data.length > 0) {
                    console.log(`Found ${messagesResponse.data.length} messages with ${otherUser.name}`);
                    
                    // Get the latest message
                    const latestMessage = messagesResponse.data[0];
                    
                    // Create synthetic chat
                    syntheticChats.push({
                      id: `${sortedUserIds[0]}_${sortedUserIds[1]}`,
                      lastMessage: {
                        id: latestMessage._id,
                        content: latestMessage.content,
                        type: latestMessage.type || "text",
                        senderId: latestMessage.sender,
                        createdAt: latestMessage.createdAt,
                        isRead: latestMessage.isRead || false,
                      },
                      participants: [
                        {
                          id: user._id,
                          firstName: user.name ? user.name.split(' ')[0] : '',
                          lastName: user.name ? user.name.split(' ').slice(1).join(' ') : '',
                          avatar: user.avt || '',
                        },
                        {
                          id: otherUser._id,
                          firstName: otherUser.name ? otherUser.name.split(' ')[0] : '',
                          lastName: otherUser.name ? otherUser.name.split(' ').slice(1).join(' ') : '',
                          avatar: otherUser.avt || '',
                          email: otherUser.email || '',
                        }
                      ],
                      unreadCount: 0, // We don't have this info, can be improved later
                      updatedAt: latestMessage.createdAt,
                      isGroup: false,
                    });
                  }
                } catch (err) {
                  console.log(`No messages found with ${otherUser.name}:`, err.message);
                }
              }
            }
            
            if (syntheticChats.length > 0) {
              console.log(`Created ${syntheticChats.length} synthetic chats from messages`);
              chatData = syntheticChats;
              success = true;
            }
          }
        } catch (err) {
          console.log("Failed to create chats from friends:", err.message);
        }
      }
      
      if (!success || chatData.length === 0) {
        console.log("All chat loading attempts failed or returned empty data");
        setChats([]);
        return;
      }
      
      // Transform each chat object to match the expected interface
      const transformedChats = chatData.map((chat: any) => {
        // Find the other participant (not the current user)
        let participants = Array.isArray(chat.participants) ? chat.participants : [];
        
        // If participants is empty but we have a recipient/sender format
        if (participants.length === 0 && (chat.sender || chat.recipient)) {
          participants = [
            chat.sender || {},
            chat.recipient || {}
          ].filter(p => p && (p._id || p.id));
        }
        
        // Transform participants to expected format
        const transformedParticipants = participants.map((p: any) => ({
          id: p._id || p.id,
          firstName: p.firstName || (p.name ? p.name.split(' ')[0] : ''),
          lastName: p.lastName || (p.name ? p.name.split(' ').slice(1).join(' ') : ''),
          avatar: p.avatar || p.avt || '',
          email: p.email || ''
        }));
        
        // Extract last message data
        let lastMessage = chat.lastMessage || {};
        if (typeof lastMessage === 'string' && chat.messages && chat.messages.length > 0) {
          // If lastMessage is just an ID, use the first message from messages array
          lastMessage = chat.messages[0];
        }
        
        // Handle empty lastMessage by providing reasonable defaults
        if (!lastMessage || typeof lastMessage !== 'object') {
          lastMessage = {
            _id: '',
            content: 'Start chatting',
            type: 'text',
            sender: { _id: '' },
            createdAt: new Date().toISOString(),
            isRead: true
          };
        }
        
        return {
          id: chat._id || chat.id || `${chat.sender?._id}_${chat.recipient?._id}`,
          lastMessage: {
            id: lastMessage._id || lastMessage.id || '',
            content: lastMessage.content || '',
            type: lastMessage.type || 'text',
            senderId: lastMessage.sender?._id || lastMessage.senderId || '',
            createdAt: lastMessage.createdAt || new Date().toISOString(),
            isRead: lastMessage.isRead || false
          },
          participants: transformedParticipants,
          unreadCount: chat.unreadCount || 0,
          updatedAt: chat.updatedAt || new Date().toISOString(),
          isGroup: chat.isGroup || false
        };
      });
      
      console.log("Transformed chats:", transformedChats.length);
      setChats(transformedChats);
    } catch (error: any) {
      console.error("Failed to load chats:", error);
      console.error("Error details:", error.response?.data);
      if (error.response?.status === 401) {
        setError("Session expired. Please log in again.");
      } else {
        setError(`Error loading chats: ${error.message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadChats();

    // Set up a refresh interval
    const interval = setInterval(loadChats, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const navigateToChatDetail = (chat: Chat) => {
    // Find the other participant (not the current user)
    const otherParticipant = chat.participants.find(
      (p) => p.id !== user?._id
    );

    if (otherParticipant) {
      console.log("Navigating to chat detail with:", otherParticipant.firstName, otherParticipant.lastName);
      navigation.navigate("ChatDetail", {
        chatId: chat.id,
        chatName: `${otherParticipant.firstName} ${otherParticipant.lastName}`,
        contactId: otherParticipant.id,
        contactAvatar: otherParticipant.avatar,
      });
    } else {
      console.log("Could not find other participant in chat:", chat);
      // Fallback if we can't find other participant, check if it's a direct roomId (like "id1_id2")
      if (chat.id && chat.id.includes('_')) {
        const ids = chat.id.split('_');
        const otherId = ids[0] === user?._id ? ids[1] : ids[0];
        
        // Use the first participant's info as fallback
        const fallbackParticipant = chat.participants[0] || { 
          id: otherId,
          firstName: 'Unknown',
          lastName: 'User',
          avatar: ''
        };
        
        navigation.navigate("ChatDetail", {
          chatId: chat.id,
          chatName: fallbackParticipant.firstName + ' ' + fallbackParticipant.lastName, 
          contactId: otherId,
          contactAvatar: fallbackParticipant.avatar,
        });
      }
    }
  };

  const getFormattedTime = (dateString: string) => {
    const now = moment();
    const messageDate = moment(dateString);

    if (now.diff(messageDate, "days") === 0) {
      return messageDate.format("HH:mm"); // Today, just show time
    } else if (now.diff(messageDate, "days") < 7) {
      return messageDate.format("ddd"); // Within a week, show day name
    } else {
      return messageDate.format("DD/MM/YYYY"); // Otherwise show date
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    // Find the other participant (not the current user)
    const otherParticipant = item.participants.find((p) => p.id !== user?._id);

    if (!otherParticipant) return null;

    const displayName = `${otherParticipant.firstName} ${otherParticipant.lastName}`;
    const avatarUrl =
      otherParticipant.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigateToChatDetail(item)}
      >
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />

        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
          </View>
        )}

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.chatTime}>
              {getFormattedTime(item.lastMessage.createdAt)}
            </Text>
          </View>

          <View style={styles.chatPreviewContainer}>
            {item.lastMessage.type === "text" ? (
              <Text style={styles.chatPreview} numberOfLines={1}>
                {item.lastMessage.senderId === user?._id ? "You: " : ""}
                {item.lastMessage.content}
              </Text>
            ) : item.lastMessage.type === "image" ? (
              <View style={styles.mediaPreview}>
                <Ionicons name="image-outline" size={16} color="#666" />
                <Text style={styles.chatPreview}> Photo</Text>
              </View>
            ) : item.lastMessage.type === "video" ? (
              <View style={styles.mediaPreview}>
                <Ionicons name="videocam-outline" size={16} color="#666" />
                <Text style={styles.chatPreview}> Video</Text>
              </View>
            ) : item.lastMessage.type === "audio" ? (
              <View style={styles.mediaPreview}>
                <Ionicons name="mic-outline" size={16} color="#666" />
                <Text style={styles.chatPreview}> Audio</Text>
              </View>
            ) : item.lastMessage.type === "file" ? (
              <View style={styles.mediaPreview}>
                <Ionicons name="document-outline" size={16} color="#666" />
                <Text style={styles.chatPreview}> Document</Text>
              </View>
            ) : (
              <Text style={styles.chatPreview}>New message</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyListComponent = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={60} color="#ddd" />
        <Text style={styles.emptyText}>No conversations yet</Text>
        <Text style={styles.emptySubtext}>
          Your recent chats will appear here
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadChats}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && !refreshing ? (
        <ActivityIndicator style={styles.loader} size="large" color="#2196F3" />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#2196F3"]}
            />
          }
          ListEmptyComponent={EmptyListComponent}
          contentContainerStyle={chats.length === 0 ? styles.emptyList : null}
        />
      )}
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
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 30,
  },
  chatItem: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  unreadBadge: {
    position: "absolute",
    top: 15,
    left: 50,
    backgroundColor: "#2196F3",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  unreadBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: "#999",
    marginLeft: 10,
  },
  chatPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  mediaPreview: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatPreview: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
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
  },
  errorContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 5,
    margin: 20,
  },
  errorText: {
    color: "#f00",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ChatScreen;
