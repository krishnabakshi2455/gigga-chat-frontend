import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, AppState, Keyboard } from "react-native";
import { useAtom } from "jotai";
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { CallData, ExtendedMessage, RecipientData } from "../src/lib/types";
// import { userIdAtom, userTokenAtom } from "../src/lib/store/userId.store";
// import { messageService } from "../src/services/MessageService";
// import { socketService } from "../src/services/socketServices";
// import { cloudinaryService } from "../src/services/CloudinaryService";
// import { requestPermissions } from "../src/lib/utils/permissionUtils";
// import { callService } from "../src/services/CallService";
// import { startRecording, stopRecording } from "../src/lib/hooks/AudioRecorder";
// import { messageDeletionService } from "../src/services/DeleteMessage";
import { Auth_Token } from "@env";
import { CallData, ExtendedMessage, RecipientData } from "../types";
import { userIdAtom, userTokenAtom } from "../store/userId.store";
import { messageService } from "../../services/MessageService";
import { socketService } from "../../services/socketServices";
import { cloudinaryService } from "../../services/CloudinaryService";
import { requestPermissions } from "../utils/permissionUtils";
import { callService } from "../../services/CallService";
import { startRecording, stopRecording } from "./AudioRecorder";
import { messageDeletionService } from "../../services/DeleteMessage";

interface UseChatManagerProps {
    recipientId: string;
    recipientName: string;
    recipientImage: string;
}

export const useChatManager = ({ recipientId, recipientName, recipientImage }: UseChatManagerProps) => {
    // State management
    const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
    const [recepientData, setRecepientData] = useState<RecipientData>();
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

    const scrollViewRef = useRef<any>(null);

    // Scroll helper
    const scrollToBottom = useCallback(() => {
        if (scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, []);

    // Fetch historical messages
    useEffect(() => {
        const loadMessages = async () => {
            if (!userId || !recipientId) return;

            try {
                setLoadingMessages(true);
                const historicalMessages = await messageService.fetchMessages(userId, recipientId);

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
    }, [userId, recipientId, scrollToBottom]);

    // Call event handlers
    useEffect(() => {
        socketService.on('call:incoming', (data: CallData) => {
            console.log('📞 Incoming call:', data);
            setIncomingCall(data);
        });

        socketService.on('call:accepted', (data: any) => {
            console.log('✅ Call accepted:', data);
            setActiveCall(incomingCall);
            setIncomingCall(null);
            setShowCallScreen(true);
        });

        socketService.on('call:rejected', (data: any) => {
            console.log('❌ Call rejected:', data);
            Alert.alert('Call Rejected', 'The recipient rejected your call');
            setActiveCall(null);
            setIncomingCall(null);
            setShowCallScreen(false);
        });

        socketService.on('call:ended', (data: any) => {
            console.log('📴 Call ended:', data);
            setActiveCall(null);
            setIncomingCall(null);
            setShowCallScreen(false);
        });

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
        messageService.handleReceiveMessage(data, recipientId, userId, setMessages, scrollToBottom);
    }, [recipientId, userId, scrollToBottom]);

    const handleUserTyping = useCallback((data: any) => {
        messageService.handleUserTyping(data, recipientId, setIsTyping);
    }, [recipientId]);

    const handleConversationJoined = useCallback((data: any) => {
        messageService.handleConversationJoined(data, setIsOtherUserOnline, setConnectionStatus);
    }, []);

    const handleUserJoinedConversation = useCallback((data: any) => {
        messageService.handleUserJoinedConversation(data, recipientId, setIsOtherUserOnline);
    }, [recipientId]);

    const handleUserLeftConversation = useCallback((data: any) => {
        messageService.handleUserLeftConversation(data, recipientId, setIsOtherUserOnline);
    }, [recipientId]);

    const handleMessageSent = useCallback((data: any) => {
        messageService.handleMessageSent(data);
    }, []);

    const handleTextChange = (text: string) => {
        messageService.handleTextChange(text, setMessage, recipientId, connectionStatus);
    };

    // Socket connection and event setup
    useEffect(() => {
        console.log('🎯 CHAT SCREEN MOUNTED - Starting socket connection');

        let reconnectTimeout: NodeJS.Timeout;
        let isMounted = true;

        const initializeSocket = async () => {
            if (!isMounted) return;

            let actualUserToken: string | null = userToken;
            if (!actualUserToken) {
                console.log('🔄 Token not in Jotai, checking AsyncStorage...');
                try {
                    actualUserToken = await AsyncStorage.getItem(Auth_Token);
                    console.log('🔑 Token from AsyncStorage:', actualUserToken ? `Present (${actualUserToken.length} chars)` : 'MISSING');
                } catch (error) {
                    console.error('❌ Error reading token from AsyncStorage:', error);
                }
            }

            console.log('📋 Parameters:', {
                userId: userId ? `✅ ${userId.substring(0, 8)}...` : '❌ MISSING',
                userToken: actualUserToken ? `✅ Present (${actualUserToken.length} chars)` : '❌ MISSING',
                recipientId: recipientId ? `✅ ${recipientId}` : '❌ MISSING'
            });

            if (!userId || !actualUserToken || !recipientId) {
                console.error('❌ Missing required parameters for socket connection');
                setConnectionStatus('disconnected');
                return;
            }

            setConnectionStatus('connecting');
            console.log('🔄 Attempting socket connection...');

            try {
                const connected = await socketService.connect(actualUserToken, userId);

                if (connected && isMounted) {
                    console.log('✅ Socket connected successfully');

                    await new Promise(resolve => setTimeout(resolve, 100));
                    socketService.joinConversation(recipientId);

                    const setupListeners = () => {
                        socketService.on('receive_message', handleReceiveMessage);
                        socketService.on('user_typing', handleUserTyping);
                        socketService.on('conversation_joined', handleConversationJoined);
                        socketService.on('user_joined_conversation', handleUserJoinedConversation);
                        socketService.on('user_left_conversation', handleUserLeftConversation);
                        socketService.on('message_sent', handleMessageSent);

                        socketService.on('connect_error', (error) => {
                            console.error('❌ Socket connection error:', error.message);
                            if (isMounted) {
                                setConnectionStatus('disconnected');
                                attemptReconnection();
                            }
                        });

                        socketService.on('disconnect', (reason) => {
                            console.log('🔌 Socket disconnected. Reason:', reason);
                            if (isMounted) {
                                setConnectionStatus('disconnected');
                                if (reason === 'io server disconnect' || reason === 'transport close') {
                                    attemptReconnection();
                                }
                            }
                        });

                        socketService.on('connect', () => {
                            console.log('✅ Socket reconnected!');
                            if (isMounted) {
                                setConnectionStatus('connected');
                            }
                        });

                        socketService.on('ping', () => {
                            console.log('💓 Socket heartbeat received');
                        });
                    };

                    setupListeners();
                    setConnectionStatus('connected');
                    console.log('🎉 Chat fully initialized and connected');

                } else if (isMounted) {
                    console.error('❌ Socket connection failed');
                    setConnectionStatus('disconnected');
                    attemptReconnection();
                }
            } catch (error) {
                console.error('💥 Socket initialization error:', error);
                if (isMounted) {
                    setConnectionStatus('disconnected');
                    attemptReconnection();
                }
            }
        };

        const attemptReconnection = () => {
            if (!isMounted) return;

            console.log('🔄 Attempting reconnection in 3 seconds...');
            reconnectTimeout = setTimeout(() => {
                if (isMounted && userId && recipientId) {
                    console.log('🔄 Reconnecting now...');
                    initializeSocket();
                }
            }, 3000);
        };

        requestPermissions();
        initializeSocket();

        const subscription = AppState.addEventListener('change', nextAppState => {
            console.log('📱 App state changed to:', nextAppState);
            if (nextAppState === 'active' && userId && recipientId) {
                console.log('🔄 App became active, reconnecting socket...');
                initializeSocket();
            } else if (nextAppState === 'background') {
                console.log('📱 App went to background, leaving conversation...');
                socketService.leaveConversation(recipientId);
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
            console.log('🧹 Cleaning up chat screen...');
            isMounted = false;
            clearTimeout(reconnectTimeout);
            subscription.remove();
            showSubscription.remove();
            hideSubscription.remove();

            if (recipientId) {
                socketService.leaveConversation(recipientId);
            }
            socketService.removeAllListeners();
            messageService.cleanup();
        };
    }, [userId, userToken, recipientId, handleReceiveMessage, handleUserTyping, handleConversationJoined, handleUserJoinedConversation, handleUserLeftConversation, handleMessageSent, scrollToBottom]);

    // Fetch recipient data
    useEffect(() => {
        const fetchRecepientData = async () => {
            if (!userId) return;

            try {
                const simulatedRecipient: RecipientData = {
                    _id: recipientId,
                    name: recipientName,
                    image: recipientImage
                };
                setRecepientData(simulatedRecipient);
            } catch (error) {
                console.log("Error fetching recipient data", error);
            }
        };

        fetchRecepientData();
    }, [recipientId, recipientName, recipientImage, userId]);

    // Message handlers
    const handleSend = async (messageType: any, content?: string) => {
        await messageService.sendMessage(
            messageType,
            content,
            recipientId,
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
                recipientId,
                'video',
                userId,
                'You',
                undefined
            );

            if (callId) {
                const callData: CallData = {
                    callId,
                    callType: 'video',
                    callerId: userId,
                    callerName: 'You',
                    recipientId: recipientId,
                    recipientName: recepientData.name,
                    timestamp: new Date().toISOString()
                };
                setActiveCall(callData);
                setShowCallScreen(true);

                setTimeout(() => {
                    if (showCallScreen && activeCall?.callId === callId) {
                        socketService.callTimeout(callId, recipientId);
                        setShowCallScreen(false);
                        setActiveCall(null);
                        Alert.alert('Call Timeout', 'No answer from recipient');
                    }
                }, 30000);
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
                recipientId,
                'audio',
                userId,
                'You',
                undefined
            );

            if (callId) {
                const callData: CallData = {
                    callId,
                    callType: 'audio',
                    callerId: userId,
                    callerName: 'You',
                    recipientId: recipientId,
                    recipientName: recepientData.name,
                    timestamp: new Date().toISOString()
                };
                setActiveCall(callData);
                setShowCallScreen(true);

                setTimeout(() => {
                    if (showCallScreen && activeCall?.callId === callId) {
                        socketService.callTimeout(callId, recipientId);
                        setShowCallScreen(false);
                        setActiveCall(null);
                        Alert.alert('Call Timeout', 'No answer from recipient');
                    }
                }, 30000);
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

    const handleContentSizeChange = () => {
        scrollToBottom();
    };

    return {
        // State
        selectedMessages,
        messages,
        recepientData,
        message,
        userId,
        keyboardHeight,
        isRecording,
        isTyping,
        isOtherUserOnline,
        connectionStatus,
        uploadingMedia,
        loadingMessages,
        activeCall,
        incomingCall,
        showCallScreen,
        scrollViewRef,

        // Handlers
        handleTextChange,
        handleSend,
        handleImageUpload,
        handleVideoCall,
        handleAudioCall,
        handleCallEnd,
        handleAcceptIncomingCall,
        handleRejectIncomingCall,
        handleStartRecording,
        handleStopRecording,
        handleSelectMessage,
        handleDeleteMessage,
        handleContentSizeChange,
        scrollToBottom,
    };
};