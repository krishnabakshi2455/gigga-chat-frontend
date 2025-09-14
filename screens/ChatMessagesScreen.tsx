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
    Pressable,
    AppState
} from "react-native";
import React, { useState, useLayoutEffect, useEffect, useRef, useCallback } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAtom } from "jotai";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, FontAwesome, MaterialIcons, Entypo, Feather } from "@expo/vector-icons";
import { userIdAtom, userTokenAtom } from "../src/lib/store/userId.store";
import { ExtendedMessage, RecipientData } from "../src/lib/types";
import { requestPermissions } from "../src/lib/utils/permissionUtils";
import { deleteMessages } from "../src/lib/utils/messageUtils";
import { socketService } from "../src/services/socketServices";
import { startRecording, stopRecording } from "../components/chatMessage/AudioRecorder";
import MessageBubble from "../components/chatMessage/MessageBubble";
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
    const [userToken] = useAtom(userTokenAtom);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [recording, setRecording] = useState<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isOtherUserOnline, setIsOtherUserOnline] = useState(false); // NEW: Track if other user is online
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting'); // NEW: Connection status
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    // useEffect(() => {
    //     console.log("=== CHAT DEBUG INFO ===");
    //     console.log("🫵 Your MongoDB ID:", userId);
    //     console.log("👤 Other User's MongoDB ID:", _id);
    //     console.log("💬 Chat between:", userId, "and", _id);
    //     console.log("📝 Recipient Data:", { _id, name, image });
    //     console.log("=====================");
    // }, [userId, _id, name, image]);
    const handleReceiveMessage = useCallback((data: any) => {
        // Only accept messages from the current conversation
        if (data.senderId !== _id) return;

        const newMessage: ExtendedMessage = {
            _id: Date.now().toString(),
            messageType: data.messageType || 'text',
            senderId: { _id: data.senderId },
            timeStamp: data.timestamp || new Date().toISOString(),
            message: data.message,
            imageUrl: data.messageType === 'image' ? data.message : undefined,
            audioUrl: data.messageType === 'audio' ? data.message : undefined
        };

        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
    }, [_id]);

    const handleUserTyping = useCallback((data: any) => {
        if (data.userId === _id) {
            setIsTyping(data.isTyping);

            if (data.isTyping && typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            if (data.isTyping) {
                typingTimeoutRef.current = setTimeout(() => {
                    setIsTyping(false);
                }, 2000);
            }
        }
    }, [_id]);

    // NEW: Handle conversation status updates
    const handleConversationJoined = useCallback((data: any) => {
        console.log('✅ Conversation joined:', data);
        setIsOtherUserOnline(data.isOtherUserOnline);
        setConnectionStatus('connected');
    }, []);

    const handleUserJoinedConversation = useCallback((data: any) => {
        console.log('👥 User joined conversation:', data);
        if (data.connectedUsers.includes(_id)) {
            setIsOtherUserOnline(true);
        }
    }, [_id]);

    const handleUserLeftConversation = useCallback((data: any) => {
        console.log('👋 User left conversation:', data);
        if (data.userId === _id) {
            setIsOtherUserOnline(false);
        }
    }, [_id]);

    const handleMessageSent = useCallback((data: any) => {
        console.log('📤 Message sent confirmation:', data);
        // You can show delivery status here
        if (data.isReceiverOnline) {
            console.log('✅ Message delivered - receiver is online');
        } else {
            console.log('📱 Message sent - receiver is offline');
        }
    }, []);

    useEffect(() => {
        requestPermissions();
        scrollToBottom();

        // Connect to socket when component mounts
        if (userId && userToken && _id) {
            const initializeSocket = async () => {
                setConnectionStatus('connecting');

                try {
                    const connected = await socketService.connect(userToken, userId);

                    if (connected) {
                        console.log('🔌 Socket connected, joining conversation...');

                        // Join the conversation with the other user
                        socketService.joinConversation(_id);

                        // Set up all event listeners
                        socketService.on('receive_message', handleReceiveMessage);
                        socketService.on('user_typing', handleUserTyping);
                        socketService.on('conversation_joined', handleConversationJoined);
                        socketService.on('user_joined_conversation', handleUserJoinedConversation);
                        socketService.on('user_left_conversation', handleUserLeftConversation);
                        socketService.on('message_sent', handleMessageSent);

                        setConnectionStatus('connected');
                    } else {
                        setConnectionStatus('disconnected');
                        Alert.alert('Connection Error', 'Could not connect to chat server');
                    }
                } catch (error) {
                    console.error('Socket connection error:', error);
                    setConnectionStatus('disconnected');
                }
            };

            initializeSocket();
        }

        // Handle app state changes (foreground/background)
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && userId && userToken && _id) {
                // Reconnect when app comes to foreground
                socketService.connect(userToken, userId).then(() => {
                    socketService.joinConversation(_id);
                });
            } else if (nextAppState === 'background') {
                // Leave conversation when app goes to background
                socketService.leaveConversation(_id);
            }
        });

        // Keyboard event listeners
        const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
            scrollToBottom();
        });
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });

        // Clean up on component unmount
        return () => {
            subscription.remove();
            showSubscription.remove();
            hideSubscription.remove();

            // Leave conversation and clean up socket
            if (_id) {
                socketService.leaveConversation(_id);
            }
            socketService.removeAllListeners();

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [userId, userToken, _id, handleReceiveMessage, handleUserTyping, handleConversationJoined, handleUserJoinedConversation, handleUserLeftConversation, handleMessageSent]);

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

    useEffect(() => {
        const fetchRecepientData = async () => {
            if (!userId) return;

            try {
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
            if (!_id || connectionStatus !== 'connected') {
                Alert.alert("Error", "Not connected to chat server");
                return;
            }

            // Create a new message object for immediate UI update
            const newMessage: ExtendedMessage = {
                _id: `temp-${Date.now()}`,
                messageType,
                senderId: { _id: userId },
                timeStamp: new Date().toISOString(),
            };

            if (messageType === "text") {
                if (!message.trim()) return;
                newMessage.message = message;
                const sent = socketService.sendMessage(_id, message, "text");
                if (!sent) {
                    Alert.alert("Error", "Could not send message. Please check your connection.");
                    return;
                }
            } else if (messageType === "image" && content) {
                newMessage.imageUrl = content;
                const sent = socketService.sendImageMessage(_id, content);
                if (!sent) {
                    Alert.alert("Error", "Could not send image. Please check your connection.");
                    return;
                }
            } else if (messageType === "audio" && content) {
                newMessage.audioUrl = content;
                const sent = socketService.sendAudioMessage(_id, content);
                if (!sent) {
                    Alert.alert("Error", "Could not send audio. Please check your connection.");
                    return;
                }
            }

            // Add to local state for immediate UI update
            setMessages(prev => [...prev, newMessage]);
            setMessage("");
            scrollToBottom();

        } catch (error) {
            console.log("error in sending the message", error);
            Alert.alert("Error", "Failed to send message");
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
    };

    const handleAudioCall = () => {
        console.log("Initiating audio call with:", recepientData?.name);
    };

    // Debounced typing handler
    const debouncedTypingHandler = useRef<NodeJS.Timeout | null>(null);

    const handleTextChange = (text: string) => {
        setMessage(text);

        // Notify typing with debounce
        if (text.length > 0 && _id && connectionStatus === 'connected') {
            if (debouncedTypingHandler.current) {
                clearTimeout(debouncedTypingHandler.current);
            }

            socketService.startTyping(_id);

            debouncedTypingHandler.current = setTimeout(() => {
                socketService.stopTyping(_id);
            }, 1000);
        } else if (_id && connectionStatus === 'connected') {
            socketService.stopTyping(_id);
        }
    };

    // NEW: Connection status indicator component
    const ConnectionIndicator = () => {
        if (connectionStatus === 'connecting') {
            return (
                <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                    <Text className="text-xs text-yellow-500">Connecting...</Text>
                </View>
            );
        }

        if (connectionStatus === 'disconnected') {
            return (
                <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                    <Text className="text-xs text-red-500">Disconnected</Text>
                </View>
            );
        }

        return (
            <View className="flex-row items-center">
                <View className={`w-2 h-2 rounded-full mr-2 ${isOtherUserOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                <Text className={`text-xs ${isOtherUserOnline ? 'text-green-500' : 'text-gray-500'}`}>
                    {isOtherUserOnline ? 'Online' : 'Offline'}
                </Text>
            </View>
        );
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

                            <View className="ml-1.5">
                                <Text className="text-sm font-bold text-white">
                                    {recepientData?.name || 'Loading...'}
                                </Text>
                                <ConnectionIndicator />
                            </View>
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
    }, [recepientData, selectedMessages, navigation, connectionStatus, isOtherUserOnline]);

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
                        {/* Connection Banner */}
                        {connectionStatus === 'disconnected' && (
                            <View className="bg-red-600 p-2">
                                <Text className="text-white text-center text-sm">
                                    Connection lost. Trying to reconnect...
                                </Text>
                            </View>
                        )}

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
                                        key={item._id || index}
                                        item={item}
                                        userId={userId}
                                        isSelected={isSelected}
                                        onLongPress={() => handleSelectMessage(item)}
                                    />
                                );
                            })}

                            {/* Typing Indicator */}
                            {isTyping && (
                                <View className="flex-row items-center p-2">
                                    <View className="bg-gray-700 rounded-full p-3">
                                        <Text className="text-white">Typing...</Text>
                                    </View>
                                </View>
                            )}
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
                                onChangeText={handleTextChange}
                                className="flex-1 h-10 border border-gray-600 bg-gray-800 rounded-full px-4 text-white"
                                placeholder="Type Your message..."
                                placeholderTextColor="#9ca3af"
                                multiline
                                editable={connectionStatus === 'connected'}
                            />

                            <View className="flex-row items-center gap-2 mx-2">
                                <Entypo
                                    onPress={() => showImagePickerOptions(
                                        () => openCamera(handleImageSelected),
                                        () => pickImageFromLibrary(handleImageSelected)
                                    )}
                                    name="camera"
                                    size={24}
                                    color={connectionStatus === 'connected' ? "#2563eb" : "#6b7280"}
                                />
                                <Pressable
                                    onPressIn={handleStartRecording}
                                    onPressOut={handleStopRecording}
                                    disabled={connectionStatus !== 'connected'}
                                >
                                    <Feather
                                        name="mic"
                                        size={24}
                                        color={isRecording ? "red" : connectionStatus === 'connected' ? "#2563eb" : "#6b7280"}
                                    />
                                </Pressable>
                            </View>

                            <Pressable
                                onPress={() => handleSend("text")}
                                disabled={message.trim() === "" || connectionStatus !== 'connected'}
                                className={`py-2 px-3 rounded-full ${message.trim() === "" || connectionStatus !== 'connected'
                                        ? "bg-gray-700"
                                        : "bg-blue-600"
                                    }`}
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