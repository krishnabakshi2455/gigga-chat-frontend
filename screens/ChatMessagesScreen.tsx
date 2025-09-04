import {
    Text,
    View,
    ScrollView,
    KeyboardAvoidingView,
    TextInput,
    Pressable,
    Image,
    Alert,
    ActionSheetIOS,
    Platform,
} from "react-native";
import React, { useState, useLayoutEffect, useEffect, useRef } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { Entypo } from "@expo/vector-icons";
import EmojiSelector from "react-native-emoji-selector";
import { useAtom } from "jotai";
import { userIdAtom } from "../lib/store/userId.store";
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

    // Request permissions when component mounts
    useEffect(() => {
        requestPermissions();
        scrollToBottom();
    }, []);

    const requestPermissions = async () => {
        try {
            // Request media library permissions
            const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            // Request camera permissions
            const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

            if (mediaLibraryStatus !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant permission to access your photo library to share images.',
                    [{ text: 'OK' }]
                );
            }

            if (cameraStatus !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant camera permission to take photos.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.log('Error requesting permissions:', error);
        }
    };

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
            if (!userId) return;

            try {
                console.log("entered in fetchRecepientData trycatch");

                const response = await fetch(
                    `${config.BACKEND_URL}/accepted-friends/${userId}`
                );
                const data = await response.json();

                if (response.ok) {
                    // Find the specific recipient from the accepted friends list
                    const recipient = data.find((friend: any) => friend._id === recepientId);
                    if (recipient) {
                        setRecepientData(recipient);
                        console.log("Recipient data found:", recipient);
                    } else {
                        console.log("Recipient not found in accepted friends");
                    }
                } else {
                    console.log("error fetching accepted friends", response.status);
                }
            } catch (error) {
                console.log("error showing the accepted friends", error);
            }
        };

        fetchRecepientData();
    }, [recepientId, userId]);

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

    // Improved image picker with options
    const showImagePickerOptions = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Take Photo', 'Choose from Library'],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        openCamera();
                    } else if (buttonIndex === 2) {
                        pickImageFromLibrary();
                    }
                }
            );
        } else {
            Alert.alert(
                'Select Image',
                'Choose an option',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Take Photo', onPress: openCamera },
                    { text: 'Choose from Library', onPress: pickImageFromLibrary },
                ]
            );
        }
    };

    const openCamera = async () => {
        try {
            // Check permissions first
            const { status } = await ImagePicker.getCameraPermissionsAsync();
            if (status !== 'granted') {
                const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
                if (newStatus !== 'granted') {
                    Alert.alert('Permission Required', 'Camera permission is required to take photos.');
                    return;
                }
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8, // Reduced quality for faster upload
            });

            if (!result.canceled && result.assets[0]) {
                handleSend("image", result.assets[0].uri);
            }
        } catch (error) {
            console.log('Error opening camera:', error);
            Alert.alert('Error', 'Failed to open camera. Please try again.');
        }
    };

    const pickImageFromLibrary = async () => {
        try {
            // Check permissions first
            const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (newStatus !== 'granted') {
                    Alert.alert('Permission Required', 'Media library permission is required to select photos.');
                    return;
                }
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8, // Reduced quality for faster upload
            });

            if (!result.canceled && result.assets[0]) {
                handleSend("image", result.assets[0].uri);
            }
        } catch (error) {
            console.log('Error picking image:', error);
            Alert.alert('Error', 'Failed to select image. Please try again.');
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

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: "",
            headerStyle: {
                backgroundColor: 'black',
            },
            headerTitleStyle: {
                color: '#2563eb',
            },
            headerLeft: () => (
                <View className="flex-row items-center gap-2.5">
                    <Ionicons
                        onPress={() => navigation.goBack()}
                        name="arrow-back"
                        size={24}
                        color="#2563eb"
                    />

                    {selectedMessages.length > 0 ? (
                        <View>
                            <Text className="text-base font-medium text-blue-600">
                                {selectedMessages.length}
                            </Text>
                        </View>
                    ) : (
                        <View className="flex-row items-center">
                            {recepientData?.image && (
                                <Image
                                    className="w-8 h-8 rounded-full"
                                    source={{ uri: recepientData.image }}
                                />
                            )}

                            <Text className="ml-1.5 text-sm font-bold text-blue-600">
                                {recepientData?.name || 'Loading...'}
                            </Text>
                        </View>
                    )}
                </View>
            ),
            headerRight: () =>
                selectedMessages.length > 0 ? (
                    <View className="flex-row items-center gap-2.5">
                        <Ionicons name="arrow-redo-sharp" size={24} color="#2563eb" />
                        <Ionicons name="arrow-undo-sharp" size={24} color="#2563eb" />
                        <FontAwesome name="star" size={24} color="#2563eb" />
                        <MaterialIcons
                            onPress={() => deleteMessages(selectedMessages)}
                            name="delete"
                            size={24}
                            color="#2563eb"
                        />
                    </View>
                ) : null,
        });
    }, [recepientData, selectedMessages, navigation]);

    if (!userId) {
        return null;
    }

    return (
        <SafeAreaView className="flex-1 bg-black">
            <KeyboardAvoidingView
                className="flex-1 bg-black"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
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
                                        ${isOwnMessage ? 'self-end bg-gray-600' : 'self-start bg-gray-600'}
                                        ${isSelected ? 'w-full bg-gray-700' : ''}
                                    `}
                                >
                                    <Text className={`text-xs text-blue-600 ${isSelected ? 'text-right' : 'text-left'}`}>
                                        {item?.message}
                                    </Text>
                                    <Text className="text-right text-[9px] text-gray-400 mt-1.5">
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
                                        ${isOwnMessage ? 'self-end bg-gray-600' : 'self-start bg-gray-600'}
                                    `}
                                >
                                    <View className="relative">
                                        <Image
                                            source={source}
                                            className="w-50 h-50 rounded-lg"
                                        />
                                        <Text className="absolute right-2.5 bottom-2 text-blue-600 text-[9px] mt-1.5">
                                            {formatTime(item?.timeStamp)}
                                        </Text>
                                    </View>
                                </Pressable>
                            );
                        }

                        return null;
                    })}
                </ScrollView>

                <View className="flex-row items-center px-2.5 py-2.5 border-t border-gray-700 bg-black">
                    <Entypo
                        onPress={handleEmojiPress}
                        style={{ marginRight: 5 }}
                        name="emoji-happy"
                        size={24}
                        color="#2563eb"
                    />

                    <TextInput
                        value={message}
                        onChangeText={(text) => setMessage(text)}
                        className="flex-1 h-10 border border-gray-600 bg-gray-600 rounded-full px-2.5 text-blue-600"
                        placeholder="Type Your message..."
                        placeholderTextColor="#9ca3af"
                    />

                    <View className="flex-row items-center gap-2 mx-2">
                        <Entypo
                            onPress={showImagePickerOptions}
                            name="camera"
                            size={24}
                            color="#2563eb"
                        />
                        <Feather name="mic" size={24} color="#2563eb" />
                    </View>

                    <Pressable
                        onPress={() => handleSend("text")}
                        className="bg-blue-600 py-2 px-3 rounded-full"
                    >
                        <Text className="text-white font-bold">Send</Text>
                    </Pressable>
                </View>
 
                {showEmojiSelector && (
                    <View className="h-62 bg-black">
                        <EmojiSelector
                            onEmojiSelected={(emoji) => {
                                setMessage((prevMessage) => prevMessage + emoji);
                            }}
                            theme="#000000"
                        />
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ChatMessagesScreen;