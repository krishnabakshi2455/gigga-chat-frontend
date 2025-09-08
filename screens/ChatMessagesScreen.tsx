import {
    Text,
    View,
    ScrollView,
    KeyboardAvoidingView,
    Image,
    Alert,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    TextInput,
    Pressable
} from "react-native";
import React, { useState, useLayoutEffect, useEffect, useRef } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAtom } from "jotai";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, FontAwesome, MaterialIcons, Entypo, Feather } from "@expo/vector-icons";
import { userIdAtom } from "../lib/store/userId.store";
import { ExtendedMessage, RecipientData } from "../lib/types";
import MessageBubble from "../components/chatMessage/MessageBubble";
import { requestPermissions } from "../lib/utils/permissionUtils";
import { startRecording, stopRecording } from "../components/chatMessage/AudioRecorder";
import { deleteMessages } from "../lib/utils/messageUtils";
import { openCamera, pickImageFromLibrary, showImagePickerOptions } from "../components/chatMessage/ImagePicker";


const ChatMessagesScreen = () => {
    const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
    const [recepientData, setRecepientData] = useState<RecipientData>();
    const navigation = useNavigation();
    const route = useRoute();
    const { _id, name, image } = route.params as RecipientData;
    const [message, setMessage] = useState("");
    const [userId] = useAtom(userIdAtom);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [recording, setRecording] = useState<any>(null);
    const [isRecording, setIsRecording] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);

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
                // For demo purposes, we'll simulate fetching recipient data
                const simulatedRecipient: RecipientData = {
                    _id: _id,
                    name: name,
                    image: image
                };
                setRecepientData(simulatedRecipient);
            } catch (error) {
                console.log("error showing the accepted friends", error);
            }
        };

        fetchRecepientData();
    }, [_id, name, image, userId]);

    const handleSend = async (messageType: any, content?: string) => {
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
            scrollToBottom();
        } catch (error) {
            console.log("error in sending the message", error);
        }
    };

    const handleImageSelected = (uri: string) => {
        handleSend("image", uri);
    };

    const handleStartRecording = async () => {
        await startRecording(setRecording, setIsRecording);
    };

    const handleStopRecording = async () => {
        const uri = await stopRecording(recording, setIsRecording);
        if (uri) {
            handleSend("audio", uri);
        }
        setRecording(null);
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

    const handleDeleteMessages = () => {
        deleteMessages(selectedMessages, setMessages, setSelectedMessages);
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
                            onPress={handleDeleteMessages}
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

    // console.log("recepientData",recepientData);
    
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
                                const isSelected = selectedMessages.includes(item._id);

                                return (
                                    <MessageBubble
                                        key={index}
                                        item={item}
                                        userId={userId}
                                        isSelected={isSelected}
                                        onLongPress={() => handleSelectMessage(item)}
                                    />
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
                                value={message}
                                onChangeText={(text) => setMessage(text)}
                                className="flex-1 h-10 border border-gray-600 bg-gray-800 rounded-full px-4 text-white"
                                placeholder="Type Your message..."
                                placeholderTextColor="#9ca3af"
                                multiline
                            />

                            <View className="flex-row items-center gap-2 mx-2">
                                <Entypo
                                    onPress={() => showImagePickerOptions(
                                        () => openCamera(handleImageSelected),
                                        () => pickImageFromLibrary(handleImageSelected)
                                    )}
                                    name="camera"
                                    size={24}
                                    color="#2563eb"
                                />
                                <Pressable
                                    onPressIn={handleStartRecording}
                                    onPressOut={handleStopRecording}
                                    onLongPress={handleStartRecording}
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