import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
} from 'react-native';
import { Ionicons, Feather, FontAwesome, MaterialIcons, Entypo } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

// Define types for our messages
type MessageType = 'text' | 'image' | 'audio';

interface Message {
    id: string;
    text: string;
    sender: 'me' | 'other';
    time: string;
    type: MessageType;
    image?: string;
    audio?: string;
    duration?: string;
}

const ChatMessagesScreen = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // Request permissions on component mount
    useEffect(() => {
        (async () => {
            const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
            const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            const { status: audioStatus } = await Audio.requestPermissionsAsync();

            if (cameraStatus !== 'granted' || libraryStatus !== 'granted' || audioStatus !== 'granted') {
                Alert.alert('Permissions required', 'Please grant all permissions to use all chat features');
            }
        })();
    }, []);

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleSendText = () => {
        if (inputText.trim() === '') return;

        const newMessage: Message = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text'
        };

        setMessages([...messages, newMessage]);
        setInputText('');
    };

    const handleSendImage = async (useCamera = false) => {
        try {
            let result: ImagePicker.ImagePickerResult;

            if (useCamera) {
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newMessage: Message = {
                    id: Date.now().toString(),
                    text: '',
                    sender: 'me',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    type: 'image',
                    image: result.assets[0].uri
                };
                setMessages([...messages, newMessage]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to select image');
        }
    };

    const showImagePickerOptions = () => {
        Alert.alert(
            "Send Image",
            "Choose an option",
            [
                {
                    text: "Take Photo",
                    onPress: () => handleSendImage(true)
                },
                {
                    text: "Choose from Gallery",
                    onPress: () => handleSendImage(false)
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const startRecording = async () => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Failed to start recording');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        if (uri) {
            const newMessage: Message = {
                id: Date.now().toString(),
                text: 'Audio message',
                sender: 'me',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'audio',
                audio: uri,
                duration: '0:15'
            };

            setMessages([...messages, newMessage]);
        }
        setRecording(null);
    };

    const handleRecordAudio = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const renderMessage = (message: Message) => {
        if (message.type === 'text') {
            return (
                <View
                    key={message.id}
                    className={`p-3 rounded-lg mb-2 max-w-[80%] ${message.sender === 'me' ? 'bg-blue-600 self-end rounded-tr-none' : 'bg-gray-800 self-start rounded-tl-none'}`}
                >
                    <Text className="text-white text-base">{message.text}</Text>
                    <Text className="text-gray-400 text-xs text-right mt-1">{message.time}</Text>
                </View>
            );
        } else if (message.type === 'image') {
            return (
                <View
                    key={message.id}
                    className={`mb-2 max-w-[80%] ${message.sender === 'me' ? 'self-end' : 'self-start'}`}
                >
                    <Image
                        source={{ uri: message.image }}
                        className="w-60 h-60 rounded-lg"
                    />
                    <View className="bg-black bg-opacity-50 p-2 rounded-b-lg">
                        <Text className="text-gray-400 text-xs text-right">{message.time}</Text>
                    </View>
                </View>
            );
        } else if (message.type === 'audio') {
            return (
                <View
                    key={message.id}
                    className={`p-3 rounded-lg mb-2 max-w-[80%] ${message.sender === 'me' ? 'bg-blue-600 self-end rounded-tr-none' : 'bg-gray-800 self-start rounded-tl-none'}`}
                >
                    <View className="flex-row items-center">
                        <Ionicons name="play-circle" size={24} color="#0084FF" />
                        <View className="flex-row items-center mx-3">
                            <View className="w-1 h-3 bg-blue-400 mx-0.5 rounded-full" />
                            <View className="w-1 h-5 bg-blue-400 mx-0.5 rounded-full" />
                            <View className="w-1 h-7 bg-blue-400 mx-0.5 rounded-full" />
                            <View className="w-1 h-5 bg-blue-400 mx-0.5 rounded-full" />
                            <View className="w-1 h-3 bg-blue-400 mx-0.5 rounded-full" />
                        </View>
                        <Text className="text-gray-400 text-xs">{message.duration}</Text>
                    </View>
                    <Text className="text-gray-400 text-xs text-right mt-2">{message.time}</Text>
                </View>
            );
        }
    };

    return (
        <View className="flex-1 bg-black">
            {/* Header */}
            <View className="flex-row justify-between items-center px-4 py-3 bg-gray-900 border-b border-gray-800">
                <View className="flex-row items-center">
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    <Image
                        source={{ uri: 'https://placekitten.com/40/40' }}
                        className="w-10 h-10 rounded-full mx-3"
                    />
                    <View>
                        <Text className="text-white text-base font-semibold">John Doe</Text>
                        <Text className="text-gray-400 text-sm">Online</Text>
                    </View>
                </View>
                <View className="flex-row items-center">
                    <Ionicons name="videocam" size={24} color="#FFFFFF" className="mr-5" />
                    <Ionicons name="call" size={22} color="#FFFFFF" className="mr-5" />
                    <Entypo name="dots-three-vertical" size={20} color="#FFFFFF" />
                </View>
            </View>

            {/* Messages Area */}
            <View className="flex-1 px-3">
                <ScrollView
                    ref={scrollViewRef}
                    className="py-3"
                    showsVerticalScrollIndicator={false}
                >
                    {messages.map(renderMessage)}
                </ScrollView>
            </View>

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-row items-center px-3 py-2 bg-gray-900 border-t border-gray-800"
            >
                <TouchableOpacity className="p-2">
                    <Entypo name="emoji-happy" size={24} color="#8696A0" />
                </TouchableOpacity>
                <TouchableOpacity
                    className="p-2"
                    onPress={showImagePickerOptions}
                >
                    <Entypo name="attachment" size={24} color="#8696A0" />
                </TouchableOpacity>
                <TextInput
                    className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-white mx-2"
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message"
                    placeholderTextColor="#8696A0"
                    multiline
                />
                <TouchableOpacity
                    className="p-2"
                    onPress={handleRecordAudio}
                >
                    {isRecording ? (
                        <FontAwesome name="stop" size={24} color="#FF3B30" />
                    ) : (
                        <Feather name="mic" size={24} color="#8696A0" />
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    className="w-10 h-10 bg-blue-600 rounded-full justify-center items-center ml-2"
                    onPress={handleSendText}
                    disabled={inputText.trim() === ''}
                >
                    <Ionicons
                        name="send"
                        size={20}
                        color={inputText.trim() === '' ? "#8696A0" : "#FFFFFF"}
                    />
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </View>
    );
};

export default ChatMessagesScreen;