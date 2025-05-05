import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { LogBox } from "react-native";

// Contexts
import AuthContextProvider from "./src/context/AuthContext";

// Navigation
import AppNavigator from "./src/navigation/AppNavigator";

// Ignore specific warnings
LogBox.ignoreLogs([
  "Warning: ...", // Add specific warning texts to ignore
  "Possible Unhandled Promise Rejection",
  "AsyncStorage has been extracted from react-native",
]);

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthContextProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthContextProvider>
    </SafeAreaProvider>
  );
}
