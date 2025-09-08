import * as ImagePicker from "expo-image-picker";
import { Alert, Platform, ActionSheetIOS } from "react-native";

export const showImagePickerOptions = async (openCamera: () => void, pickImageFromLibrary: () => void) => {
    if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
            {
                options: ['Cancel', 'Take Photo', 'Choose from Library'],
                cancelButtonIndex: 0,
            },
            (buttonIndex) => {
                if (buttonIndex === 1) {
                    openCamera();
                } else if (buttonIndex === 2) {
                    pickImageFromLibrary();
                }
            }
        );
    } else {
        Alert.alert(
            'Select Image',
            'Choose an option',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Take Photo', onPress: openCamera },
                { text: 'Choose from Library', onPress: pickImageFromLibrary },
            ]
        );
    }
};

export const openCamera = async (onImageSelected: (uri: string) => void) => {
    try {
        const { status } = await ImagePicker.getCameraPermissionsAsync();
        if (status !== 'granted') {
            const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
            if (newStatus !== 'granted') {
                Alert.alert('Permission Required', 'Camera permission is required to take photos.');
                return;
            }
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            onImageSelected(result.assets[0].uri);
        }
    } catch (error) {
        console.log('Error opening camera:', error);
        Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
};

export const pickImageFromLibrary = async (onImageSelected: (uri: string) => void) => {
    try {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (newStatus !== 'granted') {
                Alert.alert('Permission Required', 'Media library permission is required to select photos.');
                return;
            }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            onImageSelected(result.assets[0].uri);
        }
    } catch (error) {
        console.log('Error picking image:', error);
        Alert.alert('Error', 'Failed to select image. Please try again.');
    }
};