export interface Message {
    _id: string;
    senderId: {
        _id: string;
    };
    messageType: "text" | "image" | "audio";
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