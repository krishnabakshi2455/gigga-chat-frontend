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
    Keyboard,
    TouchableWithoutFeedback
} from "react-native";
import React, { useState, useLayoutEffect, useEffect, useRef } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { Entypo } from "@expo/vector-icons";
import { useAtom } from "jotai";
import { userIdAtom } from "../lib/store/userId.store";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Audio } from 'expo-av';
import config from "../config";
import { Message, RecipientData, RouteParams } from "../lib/types";

// Extend the Message interface to include audioUrl (only additional property needed)
interface ExtendedMessage extends Message {
    audioUrl?: string;
}

const ChatMessagesScreen = () => {
    const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
    const [recepientData, setRecepientData] = useState<RecipientData>();
    const navigation = useNavigation();
    const [selectedImage, setSelectedImage] = useState("");
    const route = useRoute();
    const { recepientId, recepientName, recepientImage } = route.params as RouteParams;
    const [message, setMessage] = useState("");
    const [userId] = useAtom(userIdAtom);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const textInputRef = useRef<TextInput>(null);

    // Request permissions when component mounts
    useEffect(() => {
        requestPermissions();
        scrollToBottom();

        // Keyboard event listeners
        const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
            scrollToBottom();
        });
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const requestPermissions = async () => {
        try {
            // Request media library permissions
            const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            // Request camera permissions
            const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

            // Request audio recording permissions
            const { status: audioStatus } = await Audio.requestPermissionsAsync();

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

            if (audioStatus !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant microphone permission to record audio.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.log('Error requesting permissions:', error);
        }
    };

    const scrollToBottom = () => {
        if (scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    const handleContentSizeChange = () => {
        scrollToBottom();
    };

    const fetchMessages = async () => {
        try {
            // Simulated API call - replace with actual implementation
            console.log("Fetching messages from backend...");

            /*
            // BACKEND IMPLEMENTATION:
            const response = await fetch(
                `${config.BACKEND_URL}/messages/${userId}/${recepientId}`
            );
            const data = await response.json();

            if (response.ok) {
                setMessages(data);
            } else {
                console.log("error showing messages", response.status);
            }
            */
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
                console.log("Fetching recipient data...");

                /*
                // BACKEND IMPLEMENTATION:
                const response = await fetch(
                    `${config.BACKEND_URL}/accepted-friends/${userId}`
                );
                const data = await response.json();

                if (response.ok) {
                    // Find the specific recipient from the accepted friends list
                    const recipient = data.find((friend: any) => friend._id === recepientId);
                    if (recipient) {
                        setRecepientData(recipient);
                    } else {
                        console.log("Recipient not found in accepted friends");
                    }
                } else {
                    console.log("error fetching accepted friends", response.status);
                }
                */

                // For demo purposes, we'll simulate fetching recipient data
                // In a real app, you would use the actual API call above
                const simulatedRecipient: RecipientData = {
                    _id: recepientId,
                    name: recepientName,
                    image: recepientImage
                };
                setRecepientData(simulatedRecipient);
            } catch (error) {
                console.log("error showing the accepted friends", error);
            }
        };

        fetchRecepientData();
    }, [recepientId, recepientName, recepientImage, userId]);

    const handleSend = async (messageType: Message['messageType'], content?: string) => {
        try {
            console.log(`Sending ${messageType} message:`, content || "No content");

            // Create a new message object
            const newMessage: ExtendedMessage = {
                _id: Date.now().toString(), // Temporary ID
                messageType,
                senderId: { _id: userId },
                timeStamp: new Date().toISOString(),
            };

            if (messageType === "text") {
                newMessage.message = message;
            } else if (messageType === "image" && content) {
                newMessage.imageUrl = content;
            } else if (messageType === "audio" && content) {
                newMessage.audioUrl = content;
            }

            // Add to local state for immediate UI update
            setMessages(prev => [...prev, newMessage]);
            setMessage("");
            setSelectedImage("");

            scrollToBottom();

            /*
            // BACKEND IMPLEMENTATION:
            const formData = new FormData();
            formData.append("senderId", userId);
            formData.append("recepientId", recepientId);

            if (messageType === "image" && content) {
                formData.append("messageType", "image");
                formData.append("imageFile", {
                    uri: content,
                    name: "image.jpg",
                    type: "image/jpeg",
                } as any);
            } else if (messageType === "audio" && content) {
                formData.append("messageType", "audio");
                formData.append("audioFile", {
                    uri: content,
                    name: "audio.m4a",
                    type: "audio/m4a",
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
                fetchMessages(); // Refresh messages from server
            }
            */
        } catch (error) {
            console.log("error in sending the message", error);
        }
    };

    // Improved image picker with options
    const showImagePickerOptions = () => {
        // Dismiss keyboard when selecting image
        Keyboard.dismiss();

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

            if (!result.canceled && result.assets && result.assets[0]) {
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

            if (!result.canceled && result.assets && result.assets[0]) {
                handleSend("image", result.assets[0].uri);
            }
        } catch (error) {
            console.log('Error picking image:', error);
            Alert.alert('Error', 'Failed to select image. Please try again.');
        }
    };

    const startRecording = async () => {
        try {
            console.log('Requesting permissions..');
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        console.log('Stopping recording..');
        setIsRecording(false);

        if (!recording) return;

        try {
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            const uri = recording.getURI();
            console.log('Recording stopped and stored at', uri);

            if (uri) {
                handleSend("audio", uri);
            }

            setRecording(null);
        } catch (error) {
            console.log('Error stopping recording:', error);
        }
    };

    const handleSelectMessage = (message: ExtendedMessage) => {
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
            console.log("Deleting messages:", messageIds);

            /*
            // BACKEND IMPLEMENTATION:
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
            */

            // Local state update for UI
            setMessages(prev => prev.filter(msg => !messageIds.includes(msg._id)));
            setSelectedMessages([]);
        } catch (error) {
            console.log("error deleting messages", error);
        }
    };

    const formatTime = (time: string) => {
        const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "numeric" };
        return new Date(time).toLocaleString("en-US", options);
    };

    const playAudio = async (audioUri: string) => {
        console.log("Playing audio:", audioUri);
        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: audioUri },
                { shouldPlay: true }
            );
            // You might want to store the sound object to control playback later
        } catch (error) {
            console.log("Error playing audio:", error);
        }
    };

    const handleVideoCall = () => {
        console.log("Initiating video call with:", recepientData?.name);
        // Implement video call functionality here
    };

    const handleAudioCall = () => {
        console.log("Initiating audio call with:", recepientData?.name);
        // Implement audio call functionality here
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

                            <Text className="ml-1.5 text-sm font-bold text-white">
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
                ) : (
                    <View className="flex-row items-center gap-4">
                        <FontAwesome
                            name="video-camera"
                            size={20}
                            color="#2563eb"
                            onPress={handleVideoCall}
                        />
                        <Ionicons
                            name="call"
                            size={20}
                            color="#2563eb"
                            onPress={handleAudioCall}
                        />
                    </View>
                ),
        });
    }, [recepientData, selectedMessages, navigation]);

    if (!userId) {
        return null;
    }

    return (
        <SafeAreaView className="flex-1 bg-black">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View className="flex-1">
                        {/* Messages ScrollView */}
                        <ScrollView
                            ref={scrollViewRef}
                            className="flex-1"
                            onContentSizeChange={handleContentSizeChange}
                            keyboardDismissMode="on-drag"
                            keyboardShouldPersistTaps="handled"
                        >
                            {messages.map((item, index) => {
                                const isOwnMessage = item?.senderId?._id === userId;
                                const isSelected = selectedMessages.includes(item._id);

                                return (
                                    <Pressable
                                        onLongPress={() => handleSelectMessage(item)}
                                        key={index}
                                        className={`
                                            p-2 m-2.5 rounded-lg max-w-[80%]
                                            ${isOwnMessage ? 'self-end bg-blue-600' : 'self-start bg-gray-700'}
                                            ${isSelected ? 'border-2 border-blue-400' : ''}
                                        `}
                                    >
                                        {item.messageType === "text" && (
                                            <>
                                                <Text className={`text-white text-base ${isSelected ? 'text-right' : 'text-left'}`}>
                                                    {item?.message}
                                                </Text>
                                                <Text className="text-right text-[10px] text-gray-300 mt-1">
                                                    {formatTime(item.timeStamp)}
                                                </Text>
                                            </>
                                        )}

                                        {item.messageType === "image" && item.imageUrl && (
                                            <View className="relative">
                                                <Image
                                                    source={{ uri: item.imageUrl }}
                                                    className="w-60 h-60 rounded-lg"
                                                    resizeMode="cover"
                                                />
                                                <Text className="absolute right-2 bottom-2 text-white text-[10px] bg-black bg-opacity-50 px-1 rounded">
                                                    {formatTime(item.timeStamp)}
                                                </Text>
                                            </View>
                                        )}

                                        {item.messageType === "audio" && item.audioUrl && (
                                            <View className="flex-row items-center">
                                                <Ionicons
                                                    name="play-circle"
                                                    size={32}
                                                    color="white"
                                                    onPress={() => playAudio(item.audioUrl as string)}
                                                />
                                                <View className="ml-2 bg-gray-800 h-8 rounded-full w-40 justify-center">
                                                    <Text className="text-white text-center">Audio Message</Text>
                                                </View>
                                                <Text className="ml-2 text-[10px] text-gray-300">
                                                    {formatTime(item.timeStamp)}
                                                </Text>
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {/* Message Input Container */}
                        <View
                            className="flex-row items-center px-2.5 py-2.5 border-t border-gray-700 bg-black"
                            style={{
                                marginBottom: keyboardHeight,
                            }}
                        >
                            <TextInput
                                ref={textInputRef}
                                value={message}
                                onChangeText={(text) => setMessage(text)}
                                className="flex-1 h-10 border border-gray-600 bg-gray-800 rounded-full px-4 text-white"
                                placeholder="Type Your message..."
                                placeholderTextColor="#9ca3af"
                                multiline
                            />

                            <View className="flex-row items-center gap-2 mx-2">
                                <Entypo
                                    onPress={showImagePickerOptions}
                                    name="camera"
                                    size={24}
                                    color="#2563eb"
                                />
                                <Pressable
                                    onPressIn={startRecording}
                                    onPressOut={stopRecording}
                                    onLongPress={startRecording}
                                >
                                    <Feather
                                        name="mic"
                                        size={24}
                                        color={isRecording ? "red" : "#2563eb"}
                                    />
                                </Pressable>
                            </View>

                            <Pressable
                                onPress={() => handleSend("text")}
                                disabled={message.trim() === ""}
                                className={`py-2 px-3 rounded-full ${message.trim() === "" ? "bg-gray-700" : "bg-blue-600"}`}
                            >
                                <Text className="text-white font-bold">Send</Text>
                            </Pressable>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ChatMessagesScreen;