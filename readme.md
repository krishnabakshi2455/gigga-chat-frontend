import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Alert, AppState, Keyboard } from "react-native";
import { useAtom } from "jotai";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth_Token } from "@env";
import { CallData, ExtendedMessage, RecipientData } from "../types/types";
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
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
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

    // ============================================
    // REFS
    // ============================================
    const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const scrollViewRef = useRef<any>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoad = useRef(true);
    const isMountedRef = useRef(true);

    // ============================================
    // MEMOIZED VALUES
    // ============================================
    const recepientData: RecipientData = useMemo(() => ({
        _id: recipientId,
        name: recipientName,
        image: recipientImage
    }), [recipientId, recipientName, recipientImage]);

    // ============================================
    // SCROLL UTILITIES
    // ============================================
    const scrollToBottom = useCallback((animated: boolean = true) => {
        if (scrollViewRef.current) {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated });
            }, animated ? 100 : 50);
        }
    }, []);

    const handleContentSizeChange = useCallback(() => {
        // No-op - scrolling handled elsewhere
    }, []);

    // ============================================
    // MESSAGE EVENT HANDLERS (MEMOIZED)
    // ============================================
    const handleReceiveMessage = useCallback((data: any) => {
        if (!isMountedRef.current) return;
        messageService.handleReceiveMessage(data, recipientId, userId, setMessages, scrollToBottom);
    }, [recipientId, userId, scrollToBottom]);

    const handleUserTyping = useCallback((data: any) => {
        if (!isMountedRef.current) return;
        messageService.handleUserTyping(data, recipientId, setIsTyping);
    }, [recipientId]);

    const handleConversationJoined = useCallback((data: any) => {
        if (!isMountedRef.current) return;
        messageService.handleConversationJoined(data, setIsOtherUserOnline, setConnectionStatus);
    }, []);

    const handleUserJoinedConversation = useCallback((data: any) => {
        if (!isMountedRef.current) return;
        messageService.handleUserJoinedConversation(data, recipientId, setIsOtherUserOnline);
    }, [recipientId]);

    const handleUserLeftConversation = useCallback((data: any) => {
        if (!isMountedRef.current) return;
        messageService.handleUserLeftConversation(data, recipientId, setIsOtherUserOnline);
    }, [recipientId]);

    const handleMessageSent = useCallback((data: any) => {
        if (!isMountedRef.current) return;
        messageService.handleMessageSent(data);
    }, []);

    // ============================================
    // CALL EVENT HANDLERS (MEMOIZED)
    // ============================================
    const clearCallTimeout = useCallback(() => {
        if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
        }
    }, []);

    const cleanupCall = useCallback(() => {
        clearCallTimeout();
        setActiveCall(null);
        setIncomingCall(null);
        setShowCallScreen(false);
        callService.clearActiveCall();
    }, [clearCallTimeout]);

    const handleIncomingCallEvent = useCallback((data: any) => {
        if (!isMountedRef.current || data.callerId === userId) return;

        console.log('📞 INCOMING CALL RECEIVED!', data.callId);

        const callData: CallData = {
            callId: data.callId,
            callType: data.callType,
            callerId: data.callerId,
            callerName: data.callerName || 'Unknown Caller',
            callerImage: data.callerImage,
            recipientId: userId || '',
            recipientName: recipientName,
            timestamp: data.timestamp || new Date().toISOString()
        };

        setIncomingCall(callData);
        callService.setActiveCall(callData);
    }, [userId, recipientName]);

    const handleCallAcceptedEvent = useCallback((data: any) => {
        if (!isMountedRef.current) return;

        console.log('✅ Call accepted:', data.callId);
        clearCallTimeout();

        const currentCall = callService.getActiveCall();
        if (currentCall?.callerId === userId) {
            callService.startWebRTC();
        }
        setShowCallScreen(true);
    }, [userId, clearCallTimeout]);

    const handleCallRejectedEvent = useCallback((data: any) => {
        if (!isMountedRef.current) return;

        console.log('❌ Call rejected:', data.callId);
        Alert.alert('Call Rejected', data.reason || 'The recipient rejected your call');
        cleanupCall();
    }, [cleanupCall]);

    const handleCallEndedEvent = useCallback((data: any) => {
        if (!isMountedRef.current) return;

        console.log('📴 Call ended:', data.callId);
        cleanupCall();
    }, [cleanupCall]);

    const handleCallTimeoutEvent = useCallback((data: any) => {
        if (!isMountedRef.current) return;

        console.log('⏰ Call timeout:', data.callId);
        Alert.alert('Call Timeout', 'The recipient did not answer');
        cleanupCall();
    }, [cleanupCall]);

    const handleCallFailedEvent = useCallback((data: any) => {
        if (!isMountedRef.current) return;

        console.error('❌ Call failed:', data.reason);
        Alert.alert('Call Failed', data.reason || 'Could not initiate call');
        cleanupCall();
    }, [cleanupCall]);

    const handleWebRTCOfferEvent = useCallback(async (data: any) => {
        if (!isMountedRef.current) return;

        try {
            await callService.handleIncomingOffer(data.offer);
        } catch (error) {
            console.error('❌ Error handling WebRTC offer:', error);
        }
    }, []);

    const handleWebRTCAnswerEvent = useCallback(async (data: any) => {
        if (!isMountedRef.current) return;

        try {
            await callService.handleIncomingAnswer(data.answer);
        } catch (error) {
            console.error('❌ Error handling WebRTC answer:', error);
        }
    }, []);

    const handleWebRTCIceCandidateEvent = useCallback(async (data: any) => {
        if (!isMountedRef.current) return;

        try {
            await callService.handleIncomingICECandidate(data.candidate);
        } catch (error) {
            console.error('❌ Error handling ICE candidate:', error);
        }
    }, []);

    // ============================================
    // SOCKET INITIALIZATION
    // ============================================
    useEffect(() => {
        isMountedRef.current = true;
        let reconnectTimeout: NodeJS.Timeout;

        const initializeSocket = async () => {
            if (!isMountedRef.current) return;

            // Get token
            let actualUserToken: string | null = userToken;
            if (!actualUserToken) {
                try {
                    actualUserToken = await AsyncStorage.getItem(Auth_Token);
                } catch (error) {
                    console.error('❌ Error reading token:', error);
                }
            }

            // Validate
            if (!userId || !actualUserToken || !recipientId) {
                console.error('❌ Missing required parameters');
                setConnectionStatus('disconnected');
                return;
            }

            setConnectionStatus('connecting');

            try {
                const connected = await socketService.connect(actualUserToken, userId);

                if (connected && isMountedRef.current) {
                    console.log('✅ Socket connected:', socketService.socket?.id);

                    await new Promise(resolve => setTimeout(resolve, 100));
                    socketService.joinConversation(recipientId);

                    // Register all listeners
                    const listeners = {
                        // Message events
                        'receive_message': handleReceiveMessage,
                        'user_typing': handleUserTyping,
                        'conversation_joined': handleConversationJoined,
                        'user_joined_conversation': handleUserJoinedConversation,
                        'user_left_conversation': handleUserLeftConversation,
                        'message_sent': handleMessageSent,

                        // Call events
                        'call:incoming': handleIncomingCallEvent,
                        'call:accepted': handleCallAcceptedEvent,
                        'call:rejected': handleCallRejectedEvent,
                        'call:ended': handleCallEndedEvent,
                        'call:timeout': handleCallTimeoutEvent,
                        'call:initiated': (data: any) => console.log('📞 Call initiated:', data.callId),
                        'call:failed': handleCallFailedEvent,

                        // WebRTC events
                        'webrtc:offer': handleWebRTCOfferEvent,
                        'webrtc:answer': handleWebRTCAnswerEvent,
                        'webrtc:ice-candidate': handleWebRTCIceCandidateEvent,

                        // Connection events
                        'connect_error': (error: any) => {
                            console.error('❌ Connection error:', error.message);
                            if (isMountedRef.current) {
                                setConnectionStatus('disconnected');
                                attemptReconnection();
                            }
                        },
                        'disconnect': (reason: string) => {
                            console.log('🔌 Disconnected:', reason);
                            if (isMountedRef.current) {
                                setConnectionStatus('disconnected');
                                if (reason === 'io server disconnect' || reason === 'transport close') {
                                    attemptReconnection();
                                }
                            }
                        },
                        'connect': () => {
                            console.log('✅ Reconnected');
                            if (isMountedRef.current) setConnectionStatus('connected');
                        }
                    };

                    // Register all listeners
                    Object.entries(listeners).forEach(([event, handler]) => {
                        socketService.on(event, handler);
                    });

                    setConnectionStatus('connected');
                    console.log('🎉 Chat initialized');

                } else if (isMountedRef.current) {
                    setConnectionStatus('disconnected');
                    attemptReconnection();
                }
            } catch (error) {
                console.error('💥 Socket error:', error);
                if (isMountedRef.current) {
                    setConnectionStatus('disconnected');
                    attemptReconnection();
                }
            }
        };

        const attemptReconnection = () => {
            if (!isMountedRef.current) return;
            reconnectTimeout = setTimeout(() => {
                if (isMountedRef.current && userId && recipientId) {
                    initializeSocket();
                }
            }, 3000);
        };

        // Initialize
        requestPermissions();
        initializeSocket();

        // App state listener
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && userId && recipientId) {
                initializeSocket();
            } else if (nextAppState === 'background') {
                socketService.leaveConversation(recipientId);
            }
        });

        // Keyboard listeners
        const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
            if (!isInitialLoad.current) scrollToBottom();
        });
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });

        // Cleanup
        return () => {
            isMountedRef.current = false;
            clearTimeout(reconnectTimeout);
            subscription.remove();
            showSubscription.remove();
            hideSubscription.remove();

            if (recipientId) socketService.leaveConversation(recipientId);
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            clearCallTimeout();

            // Remove all listeners
            const events = [
                'receive_message', 'user_typing', 'conversation_joined',
                'user_joined_conversation', 'user_left_conversation', 'message_sent',
                'call:incoming', 'call:accepted', 'call:rejected', 'call:ended',
                'call:timeout', 'call:initiated', 'call:failed',
                'webrtc:offer', 'webrtc:answer', 'webrtc:ice-candidate'
            ];
            events.forEach(event => socketService.off(event));
        };
    }, [
        userId, userToken, recipientId, recipientName,
        handleReceiveMessage, handleUserTyping, handleConversationJoined,
        handleUserJoinedConversation, handleUserLeftConversation, handleMessageSent,
        handleIncomingCallEvent, handleCallAcceptedEvent, handleCallRejectedEvent,
        handleCallEndedEvent, handleCallTimeoutEvent, handleCallFailedEvent,
        handleWebRTCOfferEvent, handleWebRTCAnswerEvent, handleWebRTCIceCandidateEvent,
        scrollToBottom, clearCallTimeout
    ]);

    // ============================================
    // LOAD HISTORICAL MESSAGES
    // ============================================
    useEffect(() => {
        const loadMessages = async () => {
            if (!userId || !recipientId) return;

            try {
                setLoadingMessages(true);
                const historicalMessages = await messageService.fetchMessages(userId, recipientId);

                if (historicalMessages.length > 0) {
                    setMessages(historicalMessages);
                    setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: false });
                    }, 100);
                }
            } catch (error) {
                console.error('❌ Error loading messages:', error);
            } finally {
                setTimeout(() => setLoadingMessages(false), 200);
            }
        };

        loadMessages();

        return () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, [userId, recipientId]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (messages.length > 0) {
            if (isInitialLoad.current) {
                isInitialLoad.current = false;
            } else {
                scrollToBottom(true);
            }
        }
    }, [messages.length, scrollToBottom]);

    // ============================================
    // HANDLER FUNCTIONS
    // ============================================
    const handleTextChange = useCallback((text: string) => {
        messageService.handleTextChange(text, setMessage, recipientId, connectionStatus);
    }, [recipientId, connectionStatus]);

    const handleSend = useCallback(async (messageType: any, content?: string) => {
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
    }, [recipientId, userId, message, scrollToBottom, connectionStatus]);

    const handleImageUpload = useCallback(async (imageUri: string) => {
        const cloudinaryUrl = await cloudinaryService.uploadImage(imageUri, {
            onUploadStart: () => setUploadingMedia(true),
            onUploadEnd: () => setUploadingMedia(false)
        });

        if (cloudinaryUrl) await handleSend("image", cloudinaryUrl);
    }, [handleSend]);

    const initiateCall = useCallback(async (callType: 'video' | 'audio') => {
        if (!recepientData || !userId || recipientId === userId) {
            Alert.alert('Error', 'Cannot initiate call');
            return;
        }

        try {
            console.log(`📞 Initiating ${callType} call to:`, recipientId);

            const callId = await callService.initiateCall(
                recipientId,
                callType,
                userId,
                recepientData.name,
                undefined
            );

            if (callId) {
                const callData: CallData = {
                    callId,
                    callType,
                    callerId: userId,
                    callerName: recepientData.name,
                    recipientId,
                    recipientName: recepientData.name,
                    timestamp: new Date().toISOString()
                };

                setActiveCall(callData);
                setShowCallScreen(true);
                callService.setActiveCall(callData);

                // Set timeout
                callTimeoutRef.current = setTimeout(() => {
                    const currentCall = callService.getActiveCall();
                    if (currentCall?.callId === callId) {
                        socketService.callTimeout(callId, recipientId);
                        cleanupCall();
                        Alert.alert('Call Timeout', 'No answer from recipient');
                    }
                }, 30000);
            } else {
                Alert.alert('Call Failed', `Could not initiate ${callType} call`);
            }
        } catch (error) {
            console.error('❌ Error initiating call:', error);
            Alert.alert('Call Failed', 'An error occurred');
        }
    }, [recepientData, userId, recipientId, cleanupCall]);

    const handleVideoCall = useCallback(() => initiateCall('video'), [initiateCall]);
    const handleAudioCall = useCallback(() => initiateCall('audio'), [initiateCall]);

    const handleCallEnd = useCallback(() => {
        if (activeCall) callService.endCall();
        cleanupCall();
    }, [activeCall, cleanupCall]);

    const handleAcceptIncomingCall = useCallback(async () => {
        if (!incomingCall) return;

        try {
            console.log('✅ Accepting call:', incomingCall.callId);
            clearCallTimeout();

            const success = await callService.acceptCall(incomingCall.callId, incomingCall.callerId);

            if (success) {
                setActiveCall(incomingCall);
                setIncomingCall(null);
                setShowCallScreen(true);
                await callService.startWebRTC();
            } else {
                Alert.alert('Call Failed', 'Could not accept the call');
            }
        } catch (error) {
            console.error('❌ Error accepting call:', error);
            Alert.alert('Call Failed', 'An error occurred');
        }
    }, [incomingCall, clearCallTimeout]);

    const handleRejectIncomingCall = useCallback(() => {
        if (incomingCall) {
            clearCallTimeout();
            callService.rejectCall(incomingCall.callId, incomingCall.callerId, 'Call rejected by user');
            setIncomingCall(null);
            callService.setActiveCall(null);
        }
    }, [incomingCall, clearCallTimeout]);

    const handleStartRecording = useCallback(async () => {
        await startRecording(setRecording, setIsRecording);
    }, []);

    const handleStopRecording = useCallback(async () => {
        const uri = await stopRecording(recording, setIsRecording);
        if (uri) handleImageUpload(uri);
        setRecording(null);
    }, [recording, handleImageUpload]);

    const handleSelectMessage = useCallback((msg: ExtendedMessage) => {
        setSelectedMessages(prev => {
            const isSelected = prev.includes(msg._id);
            return isSelected
                ? prev.filter(id => id !== msg._id)
                : [...prev, msg._id];
        });
    }, []);

    const handleDeleteMessage = useCallback(async () => {
        if (selectedMessages.length === 0) return;

        const messagesToDelete = messages.filter(msg => selectedMessages.includes(msg._id));

        await messageDeletionService.deleteMessagesWithConfirmation(
            messagesToDelete,
            () => {
                setMessages(prev => prev.filter(msg => !selectedMessages.includes(msg._id)));
                setSelectedMessages([]);
            }
        );
    }, [selectedMessages, messages]);

    // ============================================
    // RETURN VALUES
    // ============================================
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