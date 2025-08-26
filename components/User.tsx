import { Text, View, Pressable, Image } from "react-native";
import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { userIdAtom } from "../lib/global.store";
import config from "../config";

interface UserItem {
    _id: string;
    name: string;
    email: string;
    image: string;
}

interface FriendRequest {
    _id: string;
    // Add other properties as needed
}

interface UserProps {
    item: UserItem;
}

const User: React.FC<UserProps> = ({ item }) => {
    const [userId] = useAtom(userIdAtom);
    const [requestSent, setRequestSent] = useState(false);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [userFriends, setUserFriends] = useState<string[]>([]);

    useEffect(() => {
        const fetchFriendRequests = async () => {
            if (!userId) return;

            try {
                const response = await fetch(
                    `${config.BACKEND_URL}/friend-requests/sent/${userId}`
                );

                const data = await response.json();
                if (response.ok) {
                    setFriendRequests(data);
                } else {
                    console.log("error", response.status);
                }
            } catch (error) {
                console.log("error", error);
            }
        };

        fetchFriendRequests();
    }, [userId]);

    useEffect(() => {
        const fetchUserFriends = async () => {
            if (!userId) return;

            try {
                const response = await fetch(`${config.BACKEND_URL}/friends/${userId}`);

                const data = await response.json();

                if (response.ok) {
                    setUserFriends(data);
                } else {
                    console.log("error retrieving user friends", response.status);
                }
            } catch (error) {
                console.log("Error message", error);
            }
        };

        fetchUserFriends();
    }, [userId]);

    const sendFriendRequest = async (currentUserId: string, selectedUserId: string) => {
        try {
            const response = await fetch(`${config.BACKEND_URL}/friend-request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ currentUserId, selectedUserId }),
            });

            if (response.ok) {
                setRequestSent(true);
            }
        } catch (error) {
            console.log("error message", error);
        }
    };

    // Early return if userId is not available
    if (!userId) {
        return null;
    }

    return (
        <Pressable className="flex-row items-center my-2.5">
            <View>
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

            <View className="ml-3 flex-1">
                <Text className="font-bold">{item?.name}</Text>
                <Text className="mt-1 text-gray-500">{item?.email}</Text>
            </View>

            {userFriends.includes(item._id) ? (
                <Pressable className="bg-green-400 px-4 py-2.5 w-26 rounded-md">
                    <Text className="text-center text-white">Friends</Text>
                </Pressable>
            ) : requestSent || friendRequests.some((friend) => friend._id === item._id) ? (
                <Pressable className="bg-gray-500 px-4 py-2.5 w-26 rounded-md">
                    <Text className="text-center text-white text-xs">
                        Request Sent
                    </Text>
                </Pressable>
            ) : (
                <Pressable
                    onPress={() => sendFriendRequest(userId, item._id)}
                    className="bg-slate-600 px-4 py-2.5 w-26 rounded-md"
                >
                    <Text className="text-center text-white text-xs">
                        Add Friend
                    </Text>
                </Pressable>
            )}
        </Pressable>
    );
};

export default User;