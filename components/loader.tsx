import { View, ActivityIndicator, Text } from "react-native";
import React from "react";

interface LoadingScreenProps {
    message?: string;
    color?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = "Loading...",
    color = "#3B82F6"
}) => {
    return (
        <View className="flex-1 bg-black justify-center items-center">
            <ActivityIndicator size="large" color={color} />
            <Text className="text-white mt-4 text-lg">{message}</Text>
        </View>
    );
};

export default LoadingScreen;