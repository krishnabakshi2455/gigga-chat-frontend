import { Text, View, TouchableOpacity, FlatList, Image } from "react-native";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { useAtom } from "jotai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import config from "../config";
import { userIdAtom } from "../lib/store/userId.store";
import User from "../components/User";

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useAtom(userIdAtom);
  const [users, setUsers] = useState([]);
  const [hasIncomingRequests, setHasIncomingRequests] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "",
      headerLeft: () => (
        <Text style={{ fontSize: 16, fontWeight: "bold" }} className="text-white text-base">Gigga Chat</Text>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons onPress={() => navigation.navigate("Chats")} name="chatbox-ellipses-outline" size={24} color="blue" />
          <TouchableOpacity onPress={handleFriendsPress}>
            <View style={{ position: 'relative' }}>
              <MaterialIcons
                name="people-outline"
                size={24}
                color="blue"
              />
              {hasIncomingRequests && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#ef4444',
                  }}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [hasIncomingRequests]);

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
      }
    } catch (error) {
      console.log("Error marking requests as read:", error);
    }

    setHasIncomingRequests(false);
    navigation.navigate("Friends");
  };

  return (
    <View className="h-full" style={{ backgroundColor: "#000" }}>
      {/* Content */}
      <View className=" flex-1">
        {users.map((item, index) => (
          <User key={index} item={item} />
        ))}
      </View>
    </View>
  );
};

export default HomeScreen;