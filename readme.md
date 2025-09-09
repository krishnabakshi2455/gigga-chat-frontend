ChatMessage Feature Documentation
Overview
The ChatMessage feature is a comprehensive messaging system that allows users to:

Send and receive text messages

Share images from camera or gallery

Record and send audio messages

Select and manage multiple messages

Make audio and video calls (placeholder functionality)

File Structure
text
src/
  components/
    chatMessage/
      ChatMessagesScreen.tsx    # Main chat interface
      MessageBubble.tsx         # Individual message component
      AudioRecorder.tsx         # Audio recording functionality
      ImagePicker.tsx           # Image selection from camera/gallery
      utils/
        messageUtils.ts         # Message-related utilities
        timeUtils.ts            # Time formatting utilities
        permissionUtils.ts      # Permission handling
Core Features
1. Message Types
Text Messages: Standard text-based communication

Image Messages: Share photos from camera or gallery

Audio Messages: Record and send voice messages

2. Message Management
Multi-select: Long press to select multiple messages

Message Actions: Forward, reply, star, and delete selected messages

Real-time Updates: Messages appear instantly in the UI

3. Media Handling
Camera Integration: Take and send photos directly

Gallery Access: Select images from device gallery

Audio Recording: Record voice messages with visual feedback

4. User Interface
Responsive Design: Adapts to keyboard visibility

Message Bubbles: Different styling for sent vs received messages

Timestamps: Displays time for each message

Header Customization: Dynamic header based on selection state

5. Communication Features
Audio Calls: Placeholder for voice calling functionality

Video Calls: Placeholder for video calling functionality