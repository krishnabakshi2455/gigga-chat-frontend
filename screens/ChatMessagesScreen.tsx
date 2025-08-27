import {
    Text,
    View,
    ScrollView,
    KeyboardAvoidingView,
    TextInput,
    Pressable,
    Image,
} from "react-native";
import React, { useState, useLayoutEffect, useEffect, useRef } from "react";
import { Feather } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { Entypo } from "@expo/vector-icons";
import EmojiSelector from "react-native-emoji-selector";
import { useAtom } from "jotai";
import { userIdAtom } from "../lib/global.store";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import config from "../config";
import { Message, RecipientData, RouteParams } from "../lib/types";



const ChatMessagesScreen = () => {
    const [showEmojiSelector, setShowEmojiSelector] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [recepientData, setRecepientData] = useState<RecipientData>();
    const navigation = useNavigation();
    const [selectedImage, setSelectedImage] = useState("");
    const route = useRoute();
    const { recepientId } = route.params as RouteParams;
    const [message, setMessage] = useState("");
    const [userId] = useAtom(userIdAtom);

    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        scrollToBottom();
    }, []);

    const scrollToBottom = () => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: false });
        }
    };

    const handleContentSizeChange = () => {
        scrollToBottom();
    };

    const handleEmojiPress = () => {
        setShowEmojiSelector(!showEmojiSelector);
    };

    const fetchMessages = async () => {
        try {
            const response = await fetch(
                `${config.BACKEND_URL}/messages/${userId}/${recepientId}`
            );
            const data = await response.json();

            if (response.ok) {
                setMessages(data);
            } else {
                console.log("error showing messages", response.status);
            }
        } catch (error) {
            console.log("error fetching messages", error);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchMessages();
        }
    }, [userId]);

    useEffect(() => {
        const fetchRecepientData = async () => {
            try {
                const response = await fetch(
                    `${config.BACKEND_URL}/user/${recepientId}`
                );

                const data = await response.json();
                setRecepientData(data);
            } catch (error) {
                console.log("error retrieving details", error);
            }
        };

        fetchRecepientData();
    }, [recepientId]);

    const handleSend = async (messageType: "text" | "image", imageUri?: string) => {
        try {
            const formData = new FormData();
            formData.append("senderId", userId);
            formData.append("recepientId", recepientId);

            if (messageType === "image" && imageUri) {
                formData.append("messageType", "image");
                formData.append("imageFile", {
                    uri: imageUri,
                    name: "image.jpg",
                    type: "image/jpeg",
                } as any);
            } else {
                formData.append("messageType", "text");
                formData.append("messageText", message);
            }

            const response = await fetch(`${config.BACKEND_URL}/messages`, {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                setMessage("");
                setSelectedImage("");
                fetchMessages();
            }
        } catch (error) {
            console.log("error in sending the message", error);
        }
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: "",
            headerLeft: () => (
                <View className="flex-row items-center gap-2.5">
                    <Ionicons
                        onPress={() => navigation.goBack()}
                        name="arrow-back"
                        size={24}
                        color="black"
                    />

                    {selectedMessages.length > 0 ? (
                        <View>
                            <Text className="text-base font-medium">
                                {selectedMessages.length}
                            </Text>
                        </View>
                    ) : (
                        <View className="flex-row items-center">
                            <Image
                                className="w-8 h-8 rounded-full"
                                source={{ uri: recepientData?.image }}
                            />

                            <Text className="ml-1.5 text-sm font-bold">
                                {recepientData?.name}
                            </Text>
                        </View>
                    )}
                </View>
            ),
            headerRight: () =>
                selectedMessages.length > 0 ? (
                    <View className="flex-row items-center gap-2.5">
                        <Ionicons name="arrow-redo-sharp" size={24} color="black" />
                        <Ionicons name="arrow-undo-sharp" size={24} color="black" />
                        <FontAwesome name="star" size={24} color="black" />
                        <MaterialIcons
                            onPress={() => deleteMessages(selectedMessages)}
                            name="delete"
                            size={24}
                            color="black"
                        />
                    </View>
                ) : null,
        });
    }, [recepientData, selectedMessages, navigation]);

    const deleteMessages = async (messageIds: string[]) => {
        try {
            const response = await fetch(`${config.BACKEND_URL}/deleteMessages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages: messageIds }),
            });

            if (response.ok) {
                setSelectedMessages((prevSelectedMessages) =>
                    prevSelectedMessages.filter((id) => !messageIds.includes(id))
                );
                fetchMessages();
            } else {
                console.log("error deleting messages", response.status);
            }
        } catch (error) {
            console.log("error deleting messages", error);
        }
    };

    const formatTime = (time: string) => {
        const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "numeric" };
        return new Date(time).toLocaleString("en-US", options);
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            handleSend("image", result.assets[0].uri);
        }
    };

    const handleSelectMessage = (message: Message) => {
        const isSelected = selectedMessages.includes(message._id);

        if (isSelected) {
            setSelectedMessages((previousMessages) =>
                previousMessages.filter((id) => id !== message._id)
            );
        } else {
            setSelectedMessages((previousMessages) => [
                ...previousMessages,
                message._id,
            ]);
        }
    };

    if (!userId) {
        return null;
    }

    return (
        <KeyboardAvoidingView className="flex-1 bg-gray-100">
            <ScrollView
                ref={scrollViewRef}
                className="flex-grow"
                onContentSizeChange={handleContentSizeChange}
            >
                {messages.map((item, index) => {
                    if (item.messageType === "text") {
                        const isSelected = selectedMessages.includes(item._id);
                        const isOwnMessage = item?.senderId?._id === userId;

                        return (
                            <Pressable
                                onLongPress={() => handleSelectMessage(item)}
                                key={index}
                                className={`
                                    p-2 m-2.5 rounded-lg max-w-[60%]
                                    ${isOwnMessage ? 'self-end bg-green-200' : 'self-start bg-white'}
                                    ${isSelected ? 'w-full bg-cyan-50' : ''}
                                `}
                            >
                                <Text className={`text-xs ${isSelected ? 'text-right' : 'text-left'}`}>
                                    {item?.message}
                                </Text>
                                <Text className="text-right text-[9px] text-gray-500 mt-1.5">
                                    {formatTime(item.timeStamp)}
                                </Text>
                            </Pressable>
                        );
                    }

                    if (item.messageType === "image") {
                        const isOwnMessage = item?.senderId?._id === userId;
                        const baseUrl = "/Users/sujananand/Build/messenger-project/api/files/";
                        const imageUrl = item.imageUrl || "";
                        const filename = imageUrl.split("/").pop();
                        const source = { uri: baseUrl + filename };

                        return (
                            <Pressable
                                key={index}
                                className={`
                                    p-2 m-2.5 rounded-lg max-w-[60%]
                                    ${isOwnMessage ? 'self-end bg-green-200' : 'self-start bg-white'}
                                `}
                            >
                                <View className="relative">
                                    <Image
                                        source={source}
                                        className="w-50 h-50 rounded-lg"
                                    />
                                    <Text className="absolute right-2.5 bottom-2 text-white text-[9px] mt-1.5">
                                        {formatTime(item?.timeStamp)}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    }
                })}
            </ScrollView>

            <View className={`
                flex-row items-center px-2.5 py-2.5 border-t border-gray-300
                ${showEmojiSelector ? 'mb-0' : 'mb-6'}
            `}>
                <Entypo
                    onPress={handleEmojiPress}
                    style={{ marginRight: 5 }}
                    name="emoji-happy"
                    size={24}
                    color="gray"
                />

                <TextInput
                    value={message}
                    onChangeText={(text) => setMessage(text)}
                    className="flex-1 h-10 border border-gray-300 rounded-full px-2.5"
                    placeholder="Type Your message..."
                />

                <View className="flex-row items-center gap-2 mx-2">
                    <Entypo onPress={pickImage} name="camera" size={24} color="gray" />
                    <Feather name="mic" size={24} color="gray" />
                </View>

                <Pressable
                    onPress={() => handleSend("text")}
                    className="bg-blue-500 py-2 px-3 rounded-full"
                >
                    <Text className="text-white font-bold">Send</Text>
                </Pressable>
            </View>

            {showEmojiSelector && (
                <View className="h-62">
                    <EmojiSelector
                        onEmojiSelected={(emoji) => {
                            setMessage((prevMessage) => prevMessage + emoji);
                        }}
                    />
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

export default ChatMessagesScreen;