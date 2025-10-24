import { Text, View, Pressable, Image } from "react-native";
import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { FriendRequest, UserProps } from "../src/lib/types";
import { userIdAtom } from "../src/lib/store/userId.store";
import { userService } from "../src/services/userService";

const User: React.FC<UserProps> = ({ item }) => {
    const [userId] = useAtom(userIdAtom);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [userFriends, setUserFriends] = useState<string[]>([]);

    const fetchFriendRequests = async () => {
        if (!userId) return;
        try {
            const data = await userService.fetchSentFriendRequests(userId);
            setFriendRequests(data);
        } catch (error) {
            console.log("Error fetching friend requests:", error);
        }
    };

    const fetchUserFriends = async () => {
        if (!userId) return;
        try {
            const data = await userService.fetchUserFriends(userId);
            setUserFriends(data);
        } catch (error) {
            console.log("Error fetching user friends:", error);
        }
    };

    useEffect(() => {
        fetchFriendRequests();
        fetchUserFriends();
    }, [userId]);

    const handleSendFriendRequest = async () => {
        if (!userId) return;

        try {
            const success = await userService.sendFriendRequest(userId, item._id);
            if (success) {
                await fetchFriendRequests();
            }
        } catch (error) {
            console.log("Error sending friend request:", error);
        }
    };

    if (!userId) {
        return null;
    }

    return (
        <Pressable
            className="flex-row items-center py-3 px-4 border-b border-gray-800"
            style={{ backgroundColor: '#111' }}
        >
            {/* User Avatar */}
            <View className="mr-4">
                <Image
                    className="w-12 h-12 rounded-full"
                    source={{ uri: item.image }}
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                    }}
                    alt={item.name}
                />
            </View>

            {/* User Info */}
            <View className="flex-1">
                <Text className="text-white text-base font-semibold">
                    {item?.name || 'Unknown User'}
                </Text>
                {item.email && (
                    <Text className="text-gray-400 text-sm mt-1">
                        {item.email}
                    </Text>
                )}
            </View>

            {/* Action Button */}
            {userFriends.includes(item._id) ? (
                <Pressable className="ml-4 bg-gray-700 px-4 py-2 rounded-full">
                    <Text className="text-white text-sm font-medium">Friend</Text>
                </Pressable>
            ) : friendRequests.some((friend) => friend._id === item._id) ? (
                <Pressable className="ml-4 bg-gray-700 px-4 py-2 rounded-full">
                    <Text className="text-gray-300 text-sm">
                        Request Sent
                    </Text>
                </Pressable>
            ) : (
                <Pressable
                    onPress={handleSendFriendRequest}
                    className="ml-4 bg-blue-600 px-4 py-2 rounded-full"
                >
                    <Text className="text-white text-sm font-medium">
                        Add Friend
                    </Text>
                </Pressable>
            )}
        </Pressable>
    );
};

export default User;