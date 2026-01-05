Gigga-Chat Frontend – Frontend System Design Documentation
1. Introduction

Gigga-Chat is a React Native + TypeScript mobile chat application frontend.
It is responsible for rendering all user-facing screens, managing navigation, handling UI state, and coordinating user interactions for real-time chat features.

Target Users: Mobile users of the Gigga-Chat application

Frontend Purpose: UI rendering, navigation flow, local state handling, and API interaction orchestration

Vision: A scalable, modular, and maintainable mobile frontend architecture suitable for real-time communication apps

2. Frontend Feature Overview
Feature	What it Does (Frontend Only)	User Interaction
Authentication	Login & Signup UI	User enters credentials
Chat Interface	Message list & input UI	Send/receive messages
Media Handling	Image/audio picker UI	Attach media
Navigation	Screen routing & stacks	Move between screens
Profile	User profile display UI	View/edit profile
Settings	App preferences UI	Toggle options
Loading/Splash	App startup visuals	Initial feedback

If backend responses are mocked, they are treated as frontend-only placeholders.

3. Frontend System Design Flow
3.1 Application Entry Flow
index.ts
   │
   ▼
App.tsx
   │
   ▼
StackNavigator.tsx
   │
   ▼
┌───────────────┬─────────────────┐
│ Auth Screens  │ Main App Screens│
│ (Public)      │ (Protected)     │
└───────────────┴─────────────────┘

3.2 High-Level Rendering Flow
App.tsx
 ├─ Initializes app
 ├─ Loads providers (theme / context)
 └─ Mounts navigation container
        │
        ▼
   StackNavigator
        │
        ▼
     Screen
        │
        ▼
   UI Components

4. File & Folder Responsibilities
/
├─ assets/
│   ├─ images/
│   ├─ icons/
│   └─ fonts/
│
├─ components/
│   ├─ common UI components
│   ├─ message bubbles
│   └─ input controls
│
├─ screens/
│   ├─ Auth/
│   │   ├─ Login
│   │   └─ Signup
│   │
│   ├─ Chat/
│   │   ├─ ChatList
│   │   └─ ChatScreen
│   │
│   ├─ Profile/
│   └─ Settings/
│
├─ src/
│   ├─ navigation/
│   ├─ services/
│   └─ utils/
│
├─ App.tsx
├─ StackNavigator.tsx
└─ tailwind.config.js

Why This Structure Exists

screens/ → page-level UI logic

components/ → reusable visual building blocks

navigation/ → routing logic isolated

services/ → API communication abstraction

utils/ → helpers without UI responsibility

5. Feature-to-File Mapping
Authentication Feature
Login Screen
 ├─ Input Components
 ├─ Button Component
 └─ Navigation Redirect


Files Involved

screens/Auth/Login.tsx

screens/Auth/Signup.tsx

components/Input

components/Button

Chat Feature
ChatScreen
 ├─ MessageList
 │    └─ MessageBubble
 ├─ ChatInput
 │    ├─ Text Input
 │    └─ Media Picker
 └─ Header


Files Involved

screens/Chat/ChatScreen.tsx

components/MessageBubble

components/Input

utils/messageFormat.ts

6. State Management Flow
State Scope Breakdown
Global UI State (Context)
 ├─ Auth user info
 └─ App theme

Page-Level State
 ├─ Chat messages
 ├─ Form values
 └─ Loading flags

Component-Level State
 ├─ Input text
 ├─ Toggle states
 └─ Temporary UI flags

Data Flow Pattern
User Action
   ↓
Component State
   ↓
Page State
   ↓
Service Call
   ↓
UI Update


No Redux/Zustand present in the repository.

7. Component Architecture
Component Hierarchy
Screen
 ├─ Layout
 │   ├─ Header
 │   └─ Footer
 │
 └─ Content
     ├─ Reusable Component
     └─ Feature Component

Communication Pattern
Parent Screen
   ├─ passes props →
   └─ receives callbacks ←
        Component


Unidirectional data flow

No tight coupling between components

8. Routing & Navigation
Route Categories
Public Routes
 ├─ Login
 └─ Signup

Protected Routes
 ├─ Chat
 ├─ Profile
 └─ Settings

Navigation Flow
App Launch
   │
   ▼
Splash Screen
   │
   ▼
Is Authenticated?
   ├─ No → Auth Stack
   └─ Yes → Main Stack

9. Design System
Styling Strategy
Nativewind (Tailwind for RN)
 ├─ Utility-first styles
 ├─ Config-based tokens
 └─ Consistent spacing & colors

Design Tokens

Colors defined in tailwind.config.js

Typography standardized via utility classes

Component variants handled via props

10. User Types & Access Control (Frontend)
Guest User
 └─ Access → Auth Screens

Authenticated User
 ├─ Chat
 ├─ Profile
 └─ Settings

Frontend Guard Concept
Protected Screen
 ├─ If no auth → redirect Login
 └─ Else → render screen

11. Future Enhancements (Frontend Only)
Scalability Options
 ├─ Global state manager
 ├─ Offline UI caching
 ├─ Performance memoization
 └─ UI testing framework


Introduce feature-based folders

Lazy load heavy screens

Improve animation consistency

12. Summary

Architecture: Clean separation of concerns

Scalability: Feature-driven structure

Maintainability: Reusable components & clear flows

Extension Approach:
→ Add new feature inside screens/
→ Extract reusable UI into components/
→ Keep navigation centralized