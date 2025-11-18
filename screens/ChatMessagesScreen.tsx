import React, { useState, useLayoutEffect, useEffect, useRef, useCallback } from "react";
import {
    Text,
    View,
    ScrollView,
    KeyboardAvoidingView,
    Alert,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    AppState,
    ActivityIndicator
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAtom } from "jotai";
import { useNavigation, useRoute } from "@react-navigation/native";
import { CallData, ExtendedMessage, RecipientData } from "../src/lib/types";
import { userIdAtom, userTokenAtom } from "../src/lib/store/userId.store";
import { messageService } from "../src/services/MessageService";
import { socketService } from "../src/services/socketServices";
import { cloudinaryService } from "../src/services/CloudinaryService";
import { requestPermissions } from "../src/lib/utils/permissionUtils";
import { callService } from "../src/services/CallService";
import { startRecording, stopRecording } from "../src/lib/hooks/AudioRecorder";
import { openCamera, pickImageFromLibrary, showImagePickerOptions } from "../src/lib/hooks/ImagePicker";
import { ChatHeaderLeft, ChatHeaderRight } from "../components/chatMessage/ChatHeader";
import IncomingCallScreen from "../components/call_chat/IncomingCallScreen";
import CallScreen from "../components/call_chat/CallScreen";
import MessageBubble from "../components/chatMessage/MessageBubble";
import { MessageInput } from "../components/chatMessage/MessageInput";
import { messageDeletionService } from "../src/services/DeleteMessage";
// import { userIdAtom, userTokenAtom } from "../lib/store/userId.store";
// import { ExtendedMessage, RecipientData } from "../lib/types";
// import { requestPermissions } from "../lib/utils/permissionUtils";
// import { socketService } from "../services/SocketService";
// import { messageService } from "../services/MessageService";
// import { cloudinaryService } from "../services/CloudinaryService";
// import { startRecording, stopRecording } from "../lib/hooks/AudioRecorder";
// import { openCamera, pickImageFromLibrary, showImagePickerOptions } from "../lib/hooks/ImagePicker";
// import { ChatHeaderLeft, ChatHeaderRight } from "../components/chatMessage/ChatHeader";
// import { MessageInput } from "../components/chatMessage/MessageInput";
// import MessageBubble from "../components/chatMessage/MessageBubble";
// import { messageDeletionService } from "../services/DeleteMessage";
// import { callService, CallData } from "../services/CallService";
// import CallScreen from "../components/call/CallScreen";
// import IncomingCallScreen from "../components/call/IncomingCallScreen";

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
    const [loadingMessages, setLoadingMessages] = useState(true);

    // Call states
    const [activeCall, setActiveCall] = useState<CallData | null>(null);
    const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
    const [showCallScreen, setShowCallScreen] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);

    // Fetch historical messages
    useEffect(() => {
        const loadMessages = async () => {
            if (!userId || !_id) return;

            try {
                setLoadingMessages(true);
                const historicalMessages = await messageService.fetchMessages(userId, _id);

                if (historicalMessages.length > 0) {
                    setMessages(historicalMessages);
                    setTimeout(() => scrollToBottom(), 300);
                }
            } catch (error) {
                console.error('❌ Error loading messages:', error);
            } finally {
                setLoadingMessages(false);
            }
        };

        loadMessages();
    }, [userId, _id]);

    // Call event handlers
    useEffect(() => {
        // Incoming call listener
        socketService.on('call:incoming', (data: CallData) => {
            console.log('📞 Incoming call:', data);
            setIncomingCall(data);
        });

        // Call accepted listener
        socketService.on('call:accepted', (data: any) => {
            console.log('✅ Call accepted:', data);
            setActiveCall(incomingCall);
            setIncomingCall(null);
            setShowCallScreen(true);
        });

        // Call rejected listener
        socketService.on('call:rejected', (data: any) => {
            console.log('❌ Call rejected:', data);
            Alert.alert('Call Rejected', 'The recipient rejected your call');
            setActiveCall(null);
            setIncomingCall(null);
            setShowCallScreen(false);
        });

        // Call ended listener
        socketService.on('call:ended', (data: any) => {
            console.log('📴 Call ended:', data);
            setActiveCall(null);
            setIncomingCall(null);
            setShowCallScreen(false);
        });

        // Call timeout listener
        socketService.on('call:timeout', (data: any) => {
            console.log('⏰ Call timeout:', data);
            Alert.alert('Call Timeout', 'The recipient did not answer');
            setActiveCall(null);
            setShowCallScreen(false);
        });

        return () => {
            socketService.off('call:incoming');
            socketService.off('call:accepted');
            socketService.off('call:rejected');
            socketService.off('call:ended');
            socketService.off('call:timeout');
        };
    }, [incomingCall]);

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

    // Message event handlers
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

    // Socket connection and event setup
    useEffect(() => {
        requestPermissions();

        if (userId && userToken && _id) {
            const initializeSocket = async () => {
                setConnectionStatus('connecting');

                try {
                    const connected = await socketService.connect(userToken, userId);

                    if (connected) {
                        console.log('🔌 Socket connected, joining conversation...');
                        socketService.joinConversation(_id);

                        // Set up message event listeners
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

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && userId && userToken && _id) {
                socketService.connect(userToken, userId).then(() => {
                    socketService.joinConversation(_id);
                });
            } else if (nextAppState === 'background') {
                socketService.leaveConversation(_id);
            }
        });

        const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
            scrollToBottom();
        });
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });

        return () => {
            subscription.remove();
            showSubscription.remove();
            hideSubscription.remove();

            if (_id) {
                socketService.leaveConversation(_id);
            }
            socketService.removeAllListeners();
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

    // Call handlers
    const handleVideoCall = async () => {
        if (!recepientData || !userId) return;

        try {
            const callId = await callService.initiateCall(
                _id,
                'video',
                userId,
                'You', // Replace with actual user name
                undefined // Add user image if available
            );

            if (callId) {
                const callData: CallData = {
                    callId,
                    callType: 'video',
                    callerId: userId,
                    callerName: 'You',
                    recipientId: _id,
                    recipientName: recepientData.name,
                    timestamp: new Date().toISOString()
                };
                setActiveCall(callData);
                setShowCallScreen(true);

                // Set timeout for unanswered call
                setTimeout(() => {
                    if (showCallScreen && activeCall?.callId === callId) {
                        socketService.callTimeout(callId, _id);
                        setShowCallScreen(false);
                        setActiveCall(null);
                        Alert.alert('Call Timeout', 'No answer from recipient');
                    }
                }, 30000); // 30 second timeout
            } else {
                Alert.alert('Call Failed', 'Could not initiate video call');
            }
        } catch (error) {
            console.error('Error initiating video call:', error);
            Alert.alert('Call Failed', 'An error occurred while initiating the call');
        }
    };

    const handleAudioCall = async () => {
        if (!recepientData || !userId) return;

        try {
            const callId = await callService.initiateCall(
                _id,
                'audio',
                userId,
                'You', // Replace with actual user name
                undefined // Add user image if available
            );

            if (callId) {
                const callData: CallData = {
                    callId,
                    callType: 'audio',
                    callerId: userId,
                    callerName: 'You',
                    recipientId: _id,
                    recipientName: recepientData.name,
                    timestamp: new Date().toISOString()
                };
                setActiveCall(callData);
                setShowCallScreen(true);

                // Set timeout for unanswered call
                setTimeout(() => {
                    if (showCallScreen && activeCall?.callId === callId) {
                        socketService.callTimeout(callId, _id);
                        setShowCallScreen(false);
                        setActiveCall(null);
                        Alert.alert('Call Timeout', 'No answer from recipient');
                    }
                }, 30000); // 30 second timeout
            } else {
                Alert.alert('Call Failed', 'Could not initiate audio call');
            }
        } catch (error) {
            console.error('Error initiating audio call:', error);
            Alert.alert('Call Failed', 'An error occurred while initiating the call');
        }
    };

    const handleCallEnd = () => {
        if (activeCall) {
            callService.endCall();
        }
        setShowCallScreen(false);
        setActiveCall(null);
        setIncomingCall(null);
    };

    const handleAcceptIncomingCall = () => {
        if (incomingCall) {
            callService.acceptCall(incomingCall.callId, incomingCall.callerId);
            setActiveCall(incomingCall);
            setIncomingCall(null);
            setShowCallScreen(true);
        }
    };

    const handleRejectIncomingCall = () => {
        if (incomingCall) {
            callService.rejectCall(incomingCall.callId, incomingCall.callerId);
            setIncomingCall(null);
        }
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

        const messagesToDelete = messages.filter(msg =>
            selectedMessages.includes(msg._id)
        );

        await messageDeletionService.deleteMessagesWithConfirmation(
            messagesToDelete,
            () => {
                setMessages(prevMessages =>
                    prevMessages.filter(msg => !selectedMessages.includes(msg._id))
                );
                setSelectedMessages([]);
            }
        );
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

                        {/* Call Screens */}
                        {showCallScreen && activeCall && (
                            <CallScreen
                                callData={activeCall}
                                onCallEnd={handleCallEnd}
                                isIncoming={false}
                            />
                        )}

                        {incomingCall && (
                            <IncomingCallScreen
                                callData={incomingCall}
                                onAccept={handleAcceptIncomingCall}
                                onReject={handleRejectIncomingCall}
                            />
                        )}

                        {/* Messages Section (hidden during calls) */}
                        {!showCallScreen && !incomingCall && (
                            <>
                                {/* Messages ScrollView */}
                                <ScrollView
                                    ref={scrollViewRef}
                                    className="flex-1"
                                    onContentSizeChange={handleContentSizeChange}
                                    keyboardDismissMode="on-drag"
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {loadingMessages && (
                                        <View className="flex-1 justify-center items-center p-10">
                                            <ActivityIndicator size="large" color="#2563eb" />
                                            <Text className="text-gray-400 mt-2">Loading messages...</Text>
                                        </View>
                                    )}

                                    {!loadingMessages && messages.length === 0 && (
                                        <View className="flex-1 justify-center items-center p-10">
                                            <Text className="text-gray-400 text-center">
                                                No messages yet. Start the conversation!
                                            </Text>
                                        </View>
                                    )}

                                    {!loadingMessages && messages.map((item, index) => {
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
                            </>
                        )}
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ChatMessagesScreen;