import React, { useContext } from "react";
import { ActivityIndicator, View } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

// Context
import { AuthContext } from "../context/AuthContext";

// Auth Screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";

// Main Screens
import ChatScreen from "../screens/main/ChatScreen";
import ContactsScreen from "../screens/main/ContactsScreen";
import ProfileScreen from "../screens/main/ProfileScreen";
import ChatDetailScreen from "../screens/main/ChatDetailScreen";
import ContactDetailScreen from "../screens/main/ContactDetailScreen";
import EditProfileScreen from "../screens/main/EditProfileScreen";

// Stack Navigator Types
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

type MainStackParamList = {
  MainTabs: undefined;
  ChatDetail: {
    chatId: string;
    chatName: string;
    contactId: string;
    contactAvatar?: string;
  };
  ContactDetail: {
    contactId: string;
    contactName: string;
  };
  EditProfile: {
    user: any;
  };
};

// Tab Navigator Type
type MainTabParamList = {
  ChatTab: undefined;
  ContactsTab: undefined;
  ProfileTab: undefined;
};

// Create navigators
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainStack = createStackNavigator<MainStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Authentication stack
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: "#fff" },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
};

// Bottom tab navigator
const MainTabNavigator = () => {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "chatbubble";

          if (route.name === "ChatTab") {
            iconName = focused ? "chatbubble" : "chatbubble-outline";
          } else if (route.name === "ContactsTab") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "ProfileTab") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#2196F3",
        tabBarInactiveTintColor: "#999",
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
        },
      })}
    >
      <MainTab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{ tabBarLabel: "Chats" }}
      />
      <MainTab.Screen
        name="ContactsTab"
        component={ContactsScreen}
        options={{ tabBarLabel: "Contacts" }}
      />
      <MainTab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </MainTab.Navigator>
  );
};

// Main app stack
const MainNavigator = () => {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <MainStack.Screen name="MainTabs" component={MainTabNavigator} />
      <MainStack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <MainStack.Screen name="ContactDetail" component={ContactDetailScreen} />
      <MainStack.Screen name="EditProfile" component={EditProfileScreen} />
    </MainStack.Navigator>
  );
};

// Root navigator
const AppNavigator = () => {
  const { isLoading, token } = useContext(AuthContext);

  if (isLoading) {
    // Display loading screen while checking authentication state
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Navigate based on authentication state
  return token ? <MainNavigator /> : <AuthNavigator />;
};

export default AppNavigator;
