import { Text, View, TouchableOpacity } from "react-native";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { useAtom } from "jotai";
import { userIdAtom } from "../src/lib/store/userId.store";
import { UserItem } from "../src/lib/types";
import User from "../components/User";
import { userService } from "../src/services/userService";

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useAtom(userIdAtom);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [hasIncomingRequests, setHasIncomingRequests] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "",
      headerLeft: () => (
        <Text style={{ fontSize: 16, fontWeight: "bold" }} className="text-white text-base">
          Gigga Chat
        </Text>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons
            onPress={() => navigation.navigate("Chats")}
            name="chatbox-ellipses-outline"
            size={24}
            color="blue"
          />
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

  useEffect(() => {
    const fetchUsersAndCheckRequests = async () => {
      try {
        // Use the service to initialize all user data
        const { userId: fetchedUserId, users: fetchedUsers, hasUnreadRequests } =
          await userService.initializeUserData();

        if (!fetchedUserId) {
          console.log("No auth token found");
          return;
        }

        setUserId(fetchedUserId);
        setUsers(fetchedUsers);
        setHasIncomingRequests(hasUnreadRequests);
      } catch (error) {
        console.log("Error initializing user data:", error);
      }
    };

    fetchUsersAndCheckRequests();
  }, [setUserId]);

  const handleFriendsPress = async () => {
    navigation.navigate("Friends");
    try {
      // Mark all current friend requests as "read" when user clicks Friends
      await userService.markFriendRequestsAsRead(userId);
      setHasIncomingRequests(false);
      
    } catch (error) {
      console.log("Error handling friends press:", error);
    }
  };

  return (
    <View className="h-full" style={{ backgroundColor: "#000" }}>
      {/* Content */}
      <View className="flex-1">
        {users.map((item, index) => (
          <User key={index} item={item} />
        ))}
      </View>
    </View>
  );
};

export default HomeScreen;