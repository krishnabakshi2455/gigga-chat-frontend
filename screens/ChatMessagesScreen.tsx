import React, { useLayoutEffect } from "react";
import {
    Text,
    View,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    ActivityIndicator
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from "@react-navigation/native";
import { RecipientData } from "../src/lib/types/types";
import { socketService } from "../src/services/socketServices";
import { openCamera, pickImageFromLibrary, showImagePickerOptions } from "../src/lib/hooks/ImagePicker";
import { ChatHeaderLeft, ChatHeaderRight } from "../components/chatMessage/ChatHeader";
import IncomingCallScreen from "../components/call_chat/IncomingCallScreen";
import CallScreen from "../components/call_chat/CallScreen";
import MessageBubble from "../components/chatMessage/MessageBubble";
import { MessageInput } from "../components/chatMessage/MessageInput";
import { useChatManager } from "../src/lib/hooks/useChatManager";

const ConnectionStatus = ({ connectionStatus }: { connectionStatus: string }) => {
    if (connectionStatus === 'connected') {
        return null;
    }

    const statusInfo = socketService.getDetailedConnectionStatus();

    return (
        <View className="bg-gray-800 p-2">
            {connectionStatus === 'disconnected' && (
                <View className="bg-red-600 p-2 rounded">
                    <Text className="text-white text-center text-sm">
                        🔌 Connection lost. Trying to reconnect...
                    </Text>
                </View>
            )}

            {connectionStatus === 'connecting' && (
                <View className="bg-yellow-600 p-2 rounded">
                    <Text className="text-white text-center text-sm">
                        🔄 Connecting to chat...
                    </Text>
                </View>
            )}

            {__DEV__ && connectionStatus === 'disconnected' && (
                <View className="mt-1">
                    <Text className="text-white text-xs">Socket: {statusInfo.socketConnected ? 'Connected' : 'Disconnected'}</Text>
                    <Text className="text-white text-xs">ID: {statusInfo.socketId || 'None'}</Text>
                </View>
            )}
        </View>
    );
};

const ChatMessagesScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { _id, name, image } = route.params as RecipientData;

    // Use the chat manager hook
    const {
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
    } = useChatManager({
        recipientId: _id,
        recipientName: name,
        recipientImage: image
    });

    const handleImageSelected = (uri: string) => {
        handleImageUpload(uri);
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
                        <ConnectionStatus connectionStatus={connectionStatus} />

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

                        {!showCallScreen && !incomingCall && (
                            <>
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