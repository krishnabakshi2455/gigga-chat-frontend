import {
    Text,
    View,
    ScrollView,
    KeyboardAvoidingView,
    Alert,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    AppState
} from "react-native";
import React, { useState, useLayoutEffect, useEffect, useRef, useCallback } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAtom } from "jotai";
import { useNavigation, useRoute } from "@react-navigation/native";
import { userIdAtom, userTokenAtom } from "../src/lib/store/userId.store";
import { ExtendedMessage, RecipientData } from "../src/lib/types";
import { requestPermissions } from "../src/lib/utils/permissionUtils";
import { socketService } from "../src/services/socketServices";
import { messageService } from "../src/services/MessageService";
import { cloudinaryService } from "../src/services/CloudinaryService";
import { startRecording, stopRecording } from "../src/lib/hooks/AudioRecorder";
import { openCamera, pickImageFromLibrary, showImagePickerOptions } from "../src/lib/hooks/ImagePicker";
import { ChatHeaderLeft, ChatHeaderRight } from "../components/chatMessage/ChatHeader";
import { MessageInput } from "../components/chatMessage/MessageInput";
import MessageBubble from "../components/chatMessage/MessageBubble";
import { messageDeletionService } from "../src/services/DeleteMessage";

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
    const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const [uploadingMedia, setUploadingMedia] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);

    // Media Upload Handlers
    const handleImageUpload = async (imageUri: string) => {
        const cloudinaryUrl = await cloudinaryService.uploadImage(imageUri, {
            onUploadStart: () => setUploadingMedia(true),
            onUploadEnd: () => setUploadingMedia(false)
        });

        if (cloudinaryUrl) {
            await handleSend("image", cloudinaryUrl);
        }
    };

    const handleAudioUpload = async (audioUri: string) => {
        const cloudinaryUrl = await cloudinaryService.uploadAudio(audioUri, {
            onUploadStart: () => setUploadingMedia(true),
            onUploadEnd: () => setUploadingMedia(false)
        });

        if (cloudinaryUrl) {
            await handleSend("audio", cloudinaryUrl);
        }
    };

    // Create handlers using the message service
    const handleReceiveMessage = useCallback((data: any) => {
        messageService.handleReceiveMessage(data, _id, userId, setMessages, scrollToBottom);
    }, [_id, userId]);

    const handleUserTyping = useCallback((data: any) => {
        messageService.handleUserTyping(data, _id, setIsTyping);
    }, [_id]);

    const handleConversationJoined = useCallback((data: any) => {
        messageService.handleConversationJoined(data, setIsOtherUserOnline, setConnectionStatus);
    }, []);

    const handleUserJoinedConversation = useCallback((data: any) => {
        messageService.handleUserJoinedConversation(data, _id, setIsOtherUserOnline);
    }, [_id]);

    const handleUserLeftConversation = useCallback((data: any) => {
        messageService.handleUserLeftConversation(data, _id, setIsOtherUserOnline);
    }, [_id]);

    const handleMessageSent = useCallback((data: any) => {
        messageService.handleMessageSent(data);
    }, []);

    const handleTextChange = (text: string) => {
        messageService.handleTextChange(text, setMessage, _id, connectionStatus);
    };

    useEffect(() => {
        // Check if Cloudinary is properly configured
        if (!cloudinaryService.isConfigured()) {
            console.warn('⚠️ Cloudinary is not properly configured. Media uploads will fail.');
            const configStatus = cloudinaryService.getConfigurationStatus();
            console.log('Cloudinary config status:', configStatus.uploadPreset);
        }

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

            // Clean up message service
            messageService.cleanup();
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

                // Add debug logging to see what's happening
                // console.log('Recipient image URL:', image);
            } catch (error) {
                console.log("Error fetching recipient data", error);
            }
        };

        fetchRecepientData();
    }, [_id, name, image, userId]);

    const handleSend = async (messageType: any, content?: string) => {
        await messageService.sendMessage(
            messageType,
            content,
            _id,
            userId,
            message,
            setMessages,
            setMessage,
            scrollToBottom,
            connectionStatus
        );
    };

    const handleImageSelected = (uri: string) => {
        handleImageUpload(uri);
    };

    const handleStartRecording = async () => {
        await startRecording(setRecording, setIsRecording);
    };

    const handleStopRecording = async () => {
        const uri = await stopRecording(recording, setIsRecording);
        if (uri) {
            handleAudioUpload(uri);
        }
        setRecording(null);
    };

    const handleSelectMessage = (message: ExtendedMessage) => {
        const isSelected = selectedMessages.includes(message?._id);

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

    const handleDeleteMessage = async () => {
        if (selectedMessages.length === 0) return;

        // Get the full message objects from selected IDs
        const messagesToDelete = messages.filter(msg =>
            selectedMessages.includes(msg._id)
        );

        await messageDeletionService.deleteMessagesWithConfirmation(
            messagesToDelete,
            () => {
                // On success, remove from UI
                setMessages(prevMessages =>
                    prevMessages.filter(msg => !selectedMessages.includes(msg._id))
                );
                setSelectedMessages([]);
            }
        );
    };

    const handleVideoCall = () => {
        console.log("Initiating video call with:", recepientData?.name);
    };

    const handleAudioCall = () => {
        console.log("Initiating audio call with:", recepientData?.name);
    };

    const handleShowImagePicker = () => {
        showImagePickerOptions(
            () => openCamera(handleImageSelected),
            () => pickImageFromLibrary(handleImageSelected)
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
                <ChatHeaderLeft
                    selectedMessages={selectedMessages}
                    recepientData={recepientData}
                    connectionStatus={connectionStatus}
                    isOtherUserOnline={isOtherUserOnline}
                    onBack={() => navigation.goBack()}
                />
            ),
            headerRight: () => (
                <ChatHeaderRight
                    selectedMessages={selectedMessages}
                    onDeleteMessages={handleDeleteMessage}
                    onVideoCall={handleVideoCall}
                    onAudioCall={handleAudioCall}
                />
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
                                        onDeleteMessages={handleDeleteMessage}
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

                        {/* Message Input */}
                        <MessageInput
                            message={message}
                            keyboardHeight={keyboardHeight}
                            connectionStatus={connectionStatus}
                            uploadingMedia={uploadingMedia}
                            isRecording={isRecording}
                            onTextChange={handleTextChange}
                            onSend={() => handleSend("text")}
                            onShowImagePicker={handleShowImagePicker}
                            onStartRecording={handleStartRecording}
                            onStopRecording={handleStopRecording}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ChatMessagesScreen;
