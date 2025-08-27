import { Text, View, Pressable, Image, Alert } from "react-native";
import React, { useState } from "react";
import { useAtom } from 'jotai';
import { useNavigation } from "@react-navigation/native";
import { userIdAtom } from "../lib/global.store";
import config from "../config";
import { FriendRequestProps } from "../lib/types";

const FriendRequest: React.FC<FriendRequestProps> = ({ item, friendRequests, setFriendRequests }) => {
    const [userId] = useAtom(userIdAtom);
    const [loading, setLoading] = useState<boolean>(false);
    const navigation = useNavigation();

    const acceptRequest = async (friendRequestId: string): Promise<void> => {
        if (loading) return;

        try {
            setLoading(true);

            const response = await fetch(
                `${config.BACKEND_URL}/friend-request/accept`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        senderId: friendRequestId,
                        recepientId: userId,
                    }),
                }
            );

            if (response.ok) {
                setFriendRequests(
                    friendRequests.filter((request) => request._id !== friendRequestId)
                );
                navigation.navigate("Chats" as never);
            } else {
                throw new Error('Failed to accept friend request');
            }
        } catch (err) {
            console.error("Error accepting the friend request:", err);
            Alert.alert(
                "Error",
                "Failed to accept friend request. Please try again.",
                [{ text: "OK" }]
            );
        } finally {
            setLoading(false);
        }
    };

    const rejectRequest = async (friendRequestId: string): Promise<void> => {
        if (loading) return;

        try {
            setLoading(true);

            // Remove from local state immediately for better UX
            setFriendRequests(
                friendRequests.filter((request) => request._id !== friendRequestId)
            );

            // Optional: Make API call to reject on backend
            // const response = await fetch("http://localhost:8000/friend-request/reject", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify({ senderId: friendRequestId, recepientId: userId })
            // });

        } catch (err) {
            console.error("Error rejecting the friend request:", err);
            // Restore the request if rejection fails
            // You might want to refetch the requests here
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-row items-center justify-between my-2.5 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <View className="flex-row items-center flex-1">
                <Image
                    className="w-12 h-12 rounded-full"
                    source={{
                        uri: item.image || 'https://via.placeholder.com/50x50?text=User'
                    }}
                />
                <Text className="text-sm font-medium ml-3 flex-1 text-white">
                    {item.name} sent you a friend request!
                </Text>
            </View>

            <View className="flex-row gap-3 ml-3">
                <Pressable
                    onPress={() => rejectRequest(item._id)}
                    disabled={loading}
                    className={`px-3 py-2 rounded-md border border-gray-600 bg-gray-700 ${loading ? 'opacity-50' : ''
                        }`}
                >
                    <Text className="text-center text-gray-300 text-xs">Decline</Text>
                </Pressable>

                <Pressable
                    onPress={() => acceptRequest(item._id)}
                    disabled={loading}
                    className={`bg-blue-600 px-3 py-2 rounded-md ${loading ? 'opacity-50' : ''
                        }`}
                >
                    <Text className="text-center text-white text-xs font-medium">
                        {loading ? 'Accepting...' : 'Accept'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

export default FriendRequest;