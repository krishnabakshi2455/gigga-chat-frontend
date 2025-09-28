import { Audio } from 'expo-av';

export const startRecording = async (setRecording: any, setIsRecording: any) => {
    try {
        console.log('Requesting permissions..');
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        console.log('Starting recording..');
        const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
        console.log('Recording started');
    } catch (err) {
        console.error('Failed to start recording', err);
    }
};

export const stopRecording = async (recording: Audio.Recording | null, setIsRecording: any) => {
    console.log('Stopping recording..');
    setIsRecording(false);

    if (!recording) return;

    try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
        });

        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);

        return uri;
    } catch (error) {
        console.log('Error stopping recording:', error);
        return null;
    }
};