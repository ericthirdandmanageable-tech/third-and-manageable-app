import { Ionicons } from "@expo/vector-icons";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: "#FAF8FC",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#FEE2E2",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Raleway-Bold",
              color: "#1F2937",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Something Went Wrong
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Raleway-Regular",
              color: "#9CA3AF",
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 24,
            }}
          >
            {this.props.fallbackMessage ??
              "An unexpected error occurred. Please try again."}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#040485",
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 16,
              shadowColor: "#040485",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={this.handleRetry}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 14,
                fontFamily: "Raleway-Bold",
              }}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
