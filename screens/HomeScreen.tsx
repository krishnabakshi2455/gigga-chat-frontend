import { Text, View, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { useAtom } from "jotai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { userIdAtom } from "../lib/global.store";
import config from "../config";
import User from "../components/User";

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useAtom(userIdAtom);
  const [users, setUsers] = useState([]);
  const [hasIncomingRequests, setHasIncomingRequests] = useState(false);

  // Function to get read friend request IDs from AsyncStorage
  const getReadFriendRequestIds = async (): Promise<string[]> => {
    try {
      const readIds = await AsyncStorage.getItem('readFriendRequestIds');
      return readIds ? JSON.parse(readIds) : [];
    } catch (error) {
      console.log("Error getting read friend request IDs:", error);
      return [];
    }
  };

  // Function to save read friend request IDs to AsyncStorage
  const saveReadFriendRequestIds = async (ids: string[]) => {
    try {
      await AsyncStorage.setItem('readFriendRequestIds', JSON.stringify(ids));
    } catch (error) {
      console.log("Error saving read friend request IDs:", error);
    }
  };

  // Function to check for incoming friend requests and compare with read IDs
  const checkForIncomingRequests = async (currentUserId: string) => {
    try {
      const response = await axios.get(`${config.BACKEND_URL}/friend-request/${currentUserId}`);

      if (response.status === 200 && response.data && response.data.length > 0) {
        // Get the IDs of current friend requests
        const currentRequestIds = response.data.map((request: any) => request.id || request._id);

        // Get previously read request IDs
        const readIds = await getReadFriendRequestIds();

        // Check if there are any NEW unread requests
        const hasUnreadRequests = currentRequestIds.some((id: string) => !readIds.includes(id));

        // console.log("Current request IDs:", currentRequestIds);
        // console.log("Read IDs:", readIds);
        // console.log("Has unread requests:", hasUnreadRequests);

        setHasIncomingRequests(hasUnreadRequests);
        return hasUnreadRequests;
      } else {
        setHasIncomingRequests(false);
        return false;
      }
    } catch (error) {
      console.log("Error checking friend requests:", error);
      setHasIncomingRequests(false);
      return false;
    }
  };

  useEffect(() => {
    const fetchUsersAndCheckRequests = async () => {
      const token = await AsyncStorage.getItem("authToken");

      if (!token) {
        console.log("No auth token found");
        return;
      }

      const decodedToken = jwtDecode(token) as any;
      const decodedUserId = decodedToken.userId;
      setUserId(decodedUserId);

      // Fetch users
      try {
        const response = await axios.get(`${config.BACKEND_URL}/users/${decodedUserId}`);
        setUsers(response.data);

        // Check for friend requests after getting users
        await checkForIncomingRequests(decodedUserId);
      } catch (error) {
        console.log("error retrieving users", error);
      }
    };

    fetchUsersAndCheckRequests();
  }, [setUserId]);

  const handleFriendsPress = async () => {
    // Mark all current friend requests as "read" when user clicks Friends
    try {
      const response = await axios.get(`${config.BACKEND_URL}/friend-request/${userId}`);

      if (response.status === 200 && response.data && response.data.length > 0) {
        const currentRequestIds = response.data.map((request: any) => request.id || request._id);

        // Get existing read IDs and add new ones
        const existingReadIds = await getReadFriendRequestIds();
        const updatedReadIds = [...new Set([...existingReadIds, ...currentRequestIds])]; // Remove duplicates

        // Save updated read IDs
        await saveReadFriendRequestIds(updatedReadIds);

        // console.log("Marked as read:", currentRequestIds);
        // console.log("All read IDs:", updatedReadIds);
      }
    } catch (error) {
      console.log("Error marking requests as read:", error);
    }

    setHasIncomingRequests(false);
    navigation.navigate("Friends");
  };

  return (
    <View className="h-full" style={{ backgroundColor: "#000" }}>
      {/* Custom Header */}
      <View className="bg-black pt-12 pb-4 px-4 border-b border-gray-800">
        <View className="flex-row justify-between items-center">
          <Text className="font-bold text-base text-white">Gigga Chat</Text>
          <View className="flex-row items-center gap-2">
            <Ionicons
              onPress={() => navigation.navigate("Chats")}
              name="chatbox-ellipses-outline"
              size={24}
              color="white"
            />
            {/* Friends icon with notification badge */}
            <TouchableOpacity onPress={handleFriendsPress}>
              <View style={{ position: 'relative' }}>
                <MaterialIcons
                  name="people-outline"
                  size={24}
                  color="white"
                />
                {/* Red notification dot */}
                {hasIncomingRequests && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#ef4444', // red-500
                    }}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      <View className="p-3 flex-1">
        {users.map((item, index) => (
          <User key={index} item={item} />
        ))}
      </View>
    </View>
  );
};

export default HomeScreen;