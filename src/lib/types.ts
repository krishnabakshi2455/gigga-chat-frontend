export interface Message {
    _id: string;
    senderId: {
        _id: string;
    };
    messageType: "text" | "image" | "audio" | "video";
    message?: string;
    imageUrl?: string;
    timeStamp: string;
    conversationId?: string;
}
export interface BackendMessageData extends Omit<Message, "_id" | "senderId"> {
    senderId: string
    receiverId: string;
    content: string;
    conversationId: string;
}
export interface RecipientData {
    _id: string;
    name: string;
    image: string;
}


export interface FriendRequestProps {
    item: UserItem;
    friendRequests: UserItem[];
    setFriendRequests: React.Dispatch<React.SetStateAction<UserItem[]>>;
}

export interface UserItem {
    _id: string;
    name: string;
    email: string;
    image: string;
}

export interface FriendRequest {
    _id: string;
}

export interface UserProps {
    item: UserItem;
}
export interface ExtendedMessage extends Message {
    audioUrl?: string;
    videoUrl?: string
}

export interface MessageInputProps {
    message: string;
    setMessage: (text: string) => void;
    onSendTextMessage: () => void;
    onShowImagePicker: () => void;
    onStartRecording: () => void;
    onStopRecording: () => void;
    isRecording: boolean;
}

export interface DeleteMessageRequest {
    messageType: string;
    mediaUrl?: string;
}

export interface BatchDeleteRequest {
    messages: Array<{
        messageId: string;
        messageType: string;
        mediaUrl?: string;
    }>;
}

export interface DeleteResponse {
    success: boolean;
    message: string;
    deletedMessageId?: string;
}

export interface BatchDeleteResponse {
    success: boolean;
    deletedCount: number;
    failedCount: number;
    errors?: string[];
}

export interface SendMessageOptions {
    recipientId: string;
    senderId: string;
    setMessages: React.Dispatch<React.SetStateAction<ExtendedMessage[]>>;
    setMessage: React.Dispatch<React.SetStateAction<string>>;
    scrollToBottom: () => void;
    connectionStatus: "connecting" | "connected" | "disconnected";
    onUploadProgress?: (progress: number) => void;
}