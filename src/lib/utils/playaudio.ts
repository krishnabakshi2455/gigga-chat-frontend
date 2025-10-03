import { Audio } from 'expo-av';

export const playAudio = async (audioUri: string) => {
    console.log("Playing audio:", audioUri);
    try {
        const { sound } = await Audio.Sound.createAsync(
            { uri: audioUri },
            { shouldPlay: true }
        );
        // You might want to store the sound object to control playback later
    } catch (error) {
        console.log("Error playing audio:", error);
    }
};

