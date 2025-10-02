export interface Message {
    _id: string;
    senderId: {
        _id: string;
    };
    messageType: "text" | "image" | "audio" | "video";
    message?: string;
    imageUrl?: string;
    timeStamp: string;
}

export interface RecipientData {
    _id: string;
    name: string;
    image: string;
}

export interface AcceptedFriend {
    _id: string;
    name: string;
    email: string;
    image: string;
}
export interface FriendRequestItem {
    _id: string;
    name: string;
    email: string;
    image: string;
}

export interface ApiResponse {
    _id: string;
    name: string;
    email: string;
    image: string;
}

export interface FriendRequestProps {
    item: FriendRequestItem;
    friendRequests: FriendRequestItem[];
    setFriendRequests: React.Dispatch<React.SetStateAction<FriendRequestItem[]>>;
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
    videoUrl?:string
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