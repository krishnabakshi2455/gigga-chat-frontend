import * as ImagePicker from "expo-image-picker";
import { Audio } from 'expo-av';
import { Alert } from "react-native";

export const requestPermissions = async () => {
    try {
        // Request media library permissions
        const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        // Request camera permissions
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

        // Request audio recording permissions
        const { status: audioStatus } = await Audio.requestPermissionsAsync();

        if (mediaLibraryStatus !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Please grant permission to access your photo library to share images.',
                [{ text: 'OK' }]
            );
        }

        if (cameraStatus !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Please grant camera permission to take photos.',
                [{ text: 'OK' }]
            );
        }

        if (audioStatus !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Please grant microphone permission to record audio.',
                [{ text: 'OK' }]
            );
        }
    } catch (error) {
        console.log('Error requesting permissions:', error);
    }
};