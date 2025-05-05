import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { API_URL, SOCKET_URL } from "../../config/constants";
import moment from "moment";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { io } from "socket.io-client";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    avt: string;
  };
  content: string;
  type: "text" | "image" | "video" | "audio" | "file";
  createdAt: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  reactions?: Record<string, string>;
  replyTo?: {
    _id: string;
    content: string;
    sender: string;
  };
  unsent: boolean;
}

interface RouteParams {
  chatId: string;
  chatName: string;
  contactId: string;
  contactAvatar: string;
}

const ChatDetailScreen = () => {
  const route = useRoute();
  const { chatId, chatName, contactId, contactAvatar } =
    route.params as RouteParams;
  const navigation = useNavigation<any>();
  const { user } = useContext(AuthContext);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const socketRef = useRef<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    // Join the chat room
    socketRef.current.emit("join", chatId);

    // Listen for new messages
    socketRef.current.on("message", (newMessage: Message) => {
      setMessages((prev) => [newMessage, ...prev]);
    });

    // Listen for message status updates
    socketRef.current.on(
      "messageStatus",
      (data: { messageId: string; status: string }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId ? { ...msg, status: data.status } : msg
          )
        );
      }
    );

    // Listen for message reactions
    socketRef.current.on(
      "messageReaction",
      (data: { messageId: string; userId: string; emoji: string }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId
              ? {
                  ...msg,
                  reactions: {
                    ...(msg.reactions || {}),
                    [data.userId]: data.emoji,
                  },
                }
              : msg
          )
        );
      }
    );

    // Clean up on unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        // Get token from storage
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.error("No auth token available for loading messages");
          Alert.alert("Error", "Authentication required. Please log in again.");
          return;
        }

        // Try multiple API endpoints and formats that the server might use
        let messages = [];
        let endpoint = '';
        let response;
        
        // First try the specific chat ID endpoint
        try {
          endpoint = `${API_URL}/api/chat/${chatId}/messages`;
          console.log(`Trying to load messages from: ${endpoint}`);
          response = await axios.get(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.data && (Array.isArray(response.data) || response.data.messages)) {
            messages = Array.isArray(response.data) ? response.data : response.data.messages;
            console.log(`Successfully loaded ${messages.length} messages from chat ID endpoint`);
          }
        } catch (err) {
          console.log(`First endpoint failed: ${err.message}`);
        }
        
        // If first attempt failed, try the user-to-user endpoint
        if (messages.length === 0) {
          try {
            const sortedUserIds = [user?._id, contactId].sort();
            endpoint = `${API_URL}/api/chat/messages/${sortedUserIds[0]}/${sortedUserIds[1]}`;
            console.log(`Trying alternate endpoint: ${endpoint}`);
            response = await axios.get(endpoint, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (response.data && (Array.isArray(response.data) || response.data.messages)) {
              messages = Array.isArray(response.data) ? response.data : response.data.messages;
              console.log(`Successfully loaded ${messages.length} messages from user-to-user endpoint`);
            }
          } catch (err) {
            console.log(`Second endpoint failed: ${err.message}`);
          }
        }
        
        // Last attempt - try room-based endpoint
        if (messages.length === 0) {
          try {
            const sortedUserIds = [user?._id, contactId].sort();
            const roomId = `${sortedUserIds[0]}_${sortedUserIds[1]}`;
            endpoint = `${API_URL}/api/chat/room/${roomId}/messages`;
            console.log(`Trying room endpoint: ${endpoint}`);
            response = await axios.get(endpoint, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (response.data && (Array.isArray(response.data) || response.data.messages)) {
              messages = Array.isArray(response.data) ? response.data : response.data.messages;
              console.log(`Successfully loaded ${messages.length} messages from room endpoint`);
            }
          } catch (err) {
            console.log(`Third endpoint failed: ${err.message}`);
          }
        }
        
        if (messages.length === 0) {
          console.log("All message loading attempts failed");
          // For new chats, this might be normal - not showing an error
        } else {
          console.log(`Loaded ${messages.length} messages`);
        }
        
        // Transform messages to match the expected format if needed
        const formattedMessages = messages.map((msg: any) => {
          // Handle different sender formats
          let sender = msg.sender || {};
          if (typeof sender === 'string') {
            // If sender is just an ID string
            sender = {
              _id: sender,
              name: sender === user?._id ? (user?.name || "You") : "User",
              avt: ""
            };
          } else if (!sender._id && msg.senderId) {
            // If we have a senderId property but no sender object
            sender = {
              _id: msg.senderId,
              name: msg.senderId === user?._id ? (user?.name || "You") : "User",
              avt: ""
            };
          }
          
          return {
            _id: msg._id || msg.id || `temp-${Date.now()}-${Math.random()}`,
            content: msg.content || "",
            type: msg.type || "text",
            sender: {
              _id: sender._id || sender.id || "",
              name: sender.name || `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || "Unknown",
              avt: sender.avt || sender.avatar || ""
            },
            createdAt: msg.createdAt || new Date().toISOString(),
            reactions: msg.reactions || {},
            unsent: msg.unsent || false,
            fileUrl: msg.fileUrl || msg.file?.url || "",
            fileName: msg.fileName || msg.file?.name || ""
          };
        });
        
        // Sort in descending order (newest first) for inverted FlatList
        setMessages(formattedMessages.reverse());
      } catch (error: any) {
        console.error("Failed to load messages:", error);
        Alert.alert(
          "Error", 
          error.response?.data?.message || "Failed to load messages. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [user?._id, contactId]);

  const sendMessage = async (
    content: string,
    type = "text",
    fileUrl = "",
    fileName = "",
    fileSize = 0
  ) => {
    if ((type === "text" && !content.trim()) || sending) return;

    try {
      setSending(true);
      
      // Get token from storage
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error("No auth token available for sending message");
        Alert.alert("Error", "Authentication required. Please log in again.");
        return;
      }

      const sortedUserIds = [user?._id, contactId].sort();
      const roomId = `${sortedUserIds[0]}_${sortedUserIds[1]}`;

      // Create a temporary message ID to track this message
      const tempMessageId = `temp-${Date.now()}`;

      // Add temporary message to UI immediately for better UX
      const tempMessage: Message = {
        _id: tempMessageId,
        content,
        type: type as "text" | "image" | "video" | "audio" | "file",
        sender: {
          _id: user?._id || '',
          name: user?.name || 'You',
          avt: user?.avt || ''
        },
        createdAt: new Date().toISOString(),
        unsent: false,
        reactions: {},
        ...(fileUrl && { fileUrl }),
        ...(fileName && { fileName })
      };

      // Add temp message to start of the messages array
      setMessages(prevMessages => [tempMessage, ...prevMessages]);

      // Prepare message data based on server expectations
      const messageData = {
        roomId,
        content,
        type,
        receiver: contactId,
        ...(replyingTo && { replyToId: replyingTo._id }),
        ...(fileUrl && { fileUrl }),
        ...(fileName && { fileName }),
        ...(fileSize > 0 && { fileSize }),
      };

      console.log("Sending message:", type);
      
      // Try multiple API endpoints that the server might use
      let response;
      let sent = false;
      
      // First try standard messages endpoint
      try {
        response = await axios.post(
          `${API_URL}/api/chat/messages`,
          messageData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        sent = true;
        console.log("Message sent successfully via standard endpoint");
      } catch (err) {
        console.log("First message endpoint failed:", err.message);
      }
      
      // Try alternate endpoint if first one failed
      if (!sent) {
        try {
          response = await axios.post(
            `${API_URL}/api/chat/send`,
            messageData,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          sent = true;
          console.log("Message sent successfully via alternate endpoint");
        } catch (err) {
          console.log("Second message endpoint failed:", err.message);
        }
      }
      
      // Final attempt with room-specific endpoint
      if (!sent) {
        try {
          response = await axios.post(
            `${API_URL}/api/chat/room/${roomId}/messages`,
            {
              content,
              type,
              ...(replyingTo && { replyToId: replyingTo._id }),
              ...(fileUrl && { fileUrl }),
              ...(fileName && { fileName }),
              ...(fileSize > 0 && { fileSize }),
            },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          sent = true;
          console.log("Message sent successfully via room endpoint");
        } catch (err) {
          console.log("Third message endpoint failed:", err.message);
          throw err; // Re-throw to handle in the catch block
        }
      }

      // Clear input after sending
      setMessageText("");
      setReplyingTo(null);

      if (sent && response?.data) {
        // Replace the temporary message with the real one from the server
        const serverMessage = response.data;
        
        setMessages(prevMessages => prevMessages.map(msg => 
          msg._id === tempMessageId ? {
            _id: serverMessage._id || serverMessage.id || tempMessageId,
            content: serverMessage.content || content,
            type: (serverMessage.type || type) as "text" | "image" | "video" | "audio" | "file",
            sender: {
              _id: user?._id || '',
              name: user?.name || 'You',
              avt: user?.avt || ''
            },
            createdAt: serverMessage.createdAt || new Date().toISOString(),
            unsent: false,
            reactions: {},
            ...(serverMessage.fileUrl && { fileUrl: serverMessage.fileUrl }),
            ...(serverMessage.fileName && { fileName: serverMessage.fileName })
          } : msg
        ));

        // Emit message via socket if connected
        if (socketRef.current) {
          socketRef.current.emit("sendMessage", {
            roomId,
            message: serverMessage,
          });
          console.log("Message emitted to socket");
        }
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      
      // Remove the temporary message since it failed to send
      setMessages(prevMessages => prevMessages.filter(msg => !msg._id.startsWith('temp-')));
      
      Alert.alert(
        "Error", 
        error.response?.data?.message || "Failed to send message. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  const handleImagePicker = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Need permission to access your photos"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const fileName = uri.split("/").pop() || "image.jpg";
      const fileType = result.assets[0].type || "image";

      try {
        // Create form data for upload
        const formData = new FormData();
        formData.append("file", {
          uri,
          name: fileName,
          type: fileType === "image" ? "image/jpeg" : "video/mp4",
        } as any);
        formData.append("type", fileType);

        // Upload the file
        const response = await axios.post(
          `${API_URL}/api/chat/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const {
          fileUrl,
          fileId,
          fileName: serverFileName,
          fileSize,
        } = response.data;

        // Send the message with the file
        sendMessage(
          fileType === "image" ? "Photo" : "Video",
          fileType,
          fileUrl,
          serverFileName,
          fileSize
        );
      } catch (error) {
        console.error("Failed to upload file:", error);
        Alert.alert("Error", "Failed to upload file. Please try again.");
      }
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync();

      if (result.canceled) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = asset.name;
      const fileSize = asset.size || 0;

      // Create form data for upload
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName,
        type: asset.mimeType || "application/octet-stream",
      } as any);
      formData.append("type", "file");

      // Upload the file
      const response = await axios.post(
        `${API_URL}/api/chat/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const {
        fileUrl,
        fileId,
        fileName: serverFileName,
        fileSize: serverFileSize,
      } = response.data;

      // Send the message with the file
      sendMessage(
        "Document",
        "file",
        fileUrl,
        serverFileName,
        serverFileSize || fileSize
      );
    } catch (error) {
      console.error("Failed to upload document:", error);
      Alert.alert("Error", "Failed to upload document. Please try again.");
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI() || "";

      if (uri) {
        // Create form data for upload
        const formData = new FormData();
        formData.append("file", {
          uri,
          name: `audio_${Date.now()}.m4a`,
          type: "audio/m4a",
        } as any);
        formData.append("type", "audio");

        // Upload the file
        const response = await axios.post(
          `${API_URL}/api/chat/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const { fileUrl, fileId, fileName, fileSize } = response.data;

        // Send the message with the file
        sendMessage("Audio message", "audio", fileUrl, fileName, fileSize);
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert(
        "Error",
        "Failed to process audio recording. Please try again."
      );
    } finally {
      recordingRef.current = null;
    }
  };

  const handleReplyTo = (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await axios.post(`${API_URL}/api/chat/message/${messageId}/reaction`, {
        emoji,
      });

      // Socket emit will handle the update
      socketRef.current.emit("react", { messageId, emoji, roomId: chatId });
    } catch (error) {
      console.error("Failed to add reaction:", error);
      Alert.alert("Error", "Failed to add reaction. Please try again.");
    }
  };

  const handleUnsendMessage = async (message: Message) => {
    try {
      await axios.put(`${API_URL}/api/chat/message/${message._id}/unsend`, {
        forEveryone: true,
      });

      // Update local messages
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === message._id
            ? { ...msg, unsent: true, content: "This message has been unsent" }
            : msg
        )
      );

      // Socket emit will notify other users
      socketRef.current.emit("unsendMessage", {
        messageId: message._id,
        roomId: chatId,
      });
    } catch (error) {
      console.error("Failed to unsend message:", error);
      Alert.alert("Error", "Failed to unsend message. Please try again.");
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.sender._id === user?._id;
    const formattedTime = moment(item.createdAt).format("HH:mm");

    return (
      <View
        style={[
          styles.messageContainer,
          isMine ? styles.myMessageContainer : {},
        ]}
      >
        {!isMine && (
          <Image
            source={{
              uri:
                item.sender.avt ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  item.sender.name
                )}`,
            }}
            style={styles.messageSenderAvatar}
          />
        )}

        <View
          style={[styles.messageBubble, isMine ? styles.myMessageBubble : {}]}
        >
          {item.replyTo && (
            <View style={styles.replyContainer}>
              <Text style={styles.replyText} numberOfLines={1}>
                {item.replyTo.content}
              </Text>
            </View>
          )}

          {item.unsent ? (
            <Text style={styles.unsent}>This message has been unsent</Text>
          ) : item.type === "text" ? (
            <Text style={styles.messageText}>{item.content}</Text>
          ) : item.type === "image" ? (
            <View>
              <Image
                source={{ uri: item.fileUrl }}
                style={styles.imageMessage}
                resizeMode="cover"
              />
            </View>
          ) : item.type === "video" ? (
            <View style={styles.fileMessage}>
              <Ionicons name="videocam" size={24} color="#fff" />
              <Text style={styles.fileMessageText}>Video</Text>
            </View>
          ) : item.type === "audio" ? (
            <View style={styles.fileMessage}>
              <Ionicons name="mic" size={24} color="#fff" />
              <Text style={styles.fileMessageText}>Audio message</Text>
            </View>
          ) : item.type === "file" ? (
            <View style={styles.fileMessage}>
              <Ionicons name="document" size={24} color="#fff" />
              <Text style={styles.fileMessageText}>
                {item.fileName || "Document"}
              </Text>
            </View>
          ) : null}

          <Text style={styles.messageTime}>{formattedTime}</Text>

          {Object.keys(item.reactions || {}).length > 0 && (
            <View style={styles.reactionsContainer}>
              {Object.entries(item.reactions || {}).map(([userId, emoji]) => (
                <Text key={userId} style={styles.reaction}>
                  {emoji}
                </Text>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.messageOptions}
          onPress={() => {
            Alert.alert("Message Options", "Choose an action", [
              { text: "Reply", onPress: () => handleReplyTo(item) },
              {
                text: "React 👍",
                onPress: () => handleReaction(item._id, "👍"),
              },
              {
                text: "React ❤️",
                onPress: () => handleReaction(item._id, "❤️"),
              },
              ...(isMine && !item.unsent
                ? [
                    {
                      text: "Unsend",
                      onPress: () => handleUnsendMessage(item),
                    },
                  ]
                : []),
              { text: "Cancel", style: "cancel" },
            ]);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#999" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>

        <Image
          source={{
            uri:
              contactAvatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                chatName
              )}`,
          }}
          style={styles.headerAvatar}
        />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{chatName}</Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="call-outline" size={24} color="#2196F3" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="videocam-outline" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading ? (
          <ActivityIndicator
            style={styles.loader}
            size="large"
            color="#2196F3"
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
            inverted
          />
        )}

        {replyingTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyInfo}>
              <Text style={styles.replyingTo}>
                Replying to {replyingTo.sender.name}
              </Text>
              <Text style={styles.replyContent} numberOfLines={1}>
                {replyingTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelReply} style={styles.cancelReply}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleImagePicker}
          >
            <Ionicons name="image-outline" size={24} color="#2196F3" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleDocumentPicker}
          >
            <Ionicons name="document-outline" size={24} color="#2196F3" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />

          {messageText.trim() ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => sendMessage(messageText)}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.recordButton}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <Ionicons
                name={recording ? "radio-button-on" : "mic-outline"}
                size={24}
                color={recording ? "#ff0000" : "#2196F3"}
              />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 5,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 5,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  headerStatus: {
    fontSize: 12,
    color: "#4caf50",
  },
  headerButton: {
    paddingHorizontal: 10,
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  messagesList: {
    flex: 1,
    padding: Platform.OS === "android" ? 5 : 10,
  },
  messagesListContent: {
    paddingTop: 10,
    paddingBottom: Platform.OS === "android" ? 5 : 10,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "flex-end",
  },
  myMessageContainer: {
    justifyContent: "flex-end",
  },
  messageSenderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 5,
  },
  messageBubble: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 10,
    maxWidth: "75%",
    minWidth: 50,
    borderWidth: 1,
    borderColor: "#eee",
  },
  myMessageBubble: {
    backgroundColor: "#e3f2fd",
  },
  replyContainer: {
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#2196F3",
    backgroundColor: "rgba(33, 150, 243, 0.1)",
    borderRadius: 5,
    marginBottom: 5,
  },
  replyText: {
    fontSize: 12,
    color: "#555",
  },
  messageText: {
    fontSize: 16,
    color: "#333",
  },
  messageTime: {
    fontSize: 10,
    color: "#999",
    alignSelf: "flex-end",
    marginTop: 5,
  },
  unsent: {
    fontStyle: "italic",
    color: "#999",
  },
  imageMessage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  fileMessage: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
  },
  fileMessageText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#333",
  },
  reactionsContainer: {
    flexDirection: "row",
    marginTop: 5,
    alignItems: "center",
  },
  reaction: {
    fontSize: 16,
    marginRight: 3,
  },
  messageOptions: {
    marginLeft: 5,
    marginRight: 5,
    padding: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    paddingBottom: Platform.OS === "android" ? 5 : 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  attachButton: {
    padding: 5,
    marginRight: 5,
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#2196F3",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  recordButton: {
    padding: 5,
    marginLeft: 10,
  },
  replyBar: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
  },
  replyInfo: {
    flex: 1,
  },
  replyingTo: {
    fontSize: 12,
    color: "#2196F3",
    fontWeight: "bold",
  },
  replyContent: {
    fontSize: 14,
    color: "#666",
  },
  cancelReply: {
    padding: 5,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ChatDetailScreen;
