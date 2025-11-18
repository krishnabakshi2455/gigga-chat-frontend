import { CallData } from "../lib/types";
import { socketService } from "./socketServices";


class CallService {
    private activeCall: CallData | null = null;
    private callListeners: Map<string, Function[]> = new Map();

    async initiateCall(
        recipientId: string,
        callType: 'video' | 'audio',
        callerId: string,
        callerName: string,
        callerImage?: string
    ): Promise<string | null> {
        const callId = socketService.initiateCall(
            recipientId,
            callType,
            callerId,
            callerName,
            callerImage
        );

        if (callId) {
            this.activeCall = {
                callId,
                callType,
                callerId,
                callerName,
                callerImage,
                recipientId,
                timestamp: new Date().toISOString()
            };
        }

        return callId;
    }

    acceptCall(callId: string, callerId: string): boolean {
        const success = socketService.acceptCall(callId, callerId);
        if (success && this.activeCall?.callId === callId) {
            this.emit('call:accepted', this.activeCall);
        }
        return success;
    }

    rejectCall(callId: string, callerId: string, reason?: string): boolean {
        const success = socketService.rejectCall(callId, callerId, reason);
        if (success) {
            this.emit('call:rejected', { callId, reason });
            this.clearActiveCall();
        }
        return success;
    }

    endCall(): boolean {
        if (!this.activeCall) return false;

        const success = socketService.endCall(
            this.activeCall.callId,
            this.activeCall.recipientId
        );

        if (success) {
            this.emit('call:ended', this.activeCall);
            this.clearActiveCall();
        }

        return success;
    }

    sendOffer(offer: any): boolean {
        if (!this.activeCall) return false;
        return socketService.sendWebRTCOffer(
            this.activeCall.callId,
            this.activeCall.recipientId,
            offer
        );
    }

    sendAnswer(answer: any): boolean {
        if (!this.activeCall) return false;
        return socketService.sendWebRTCAnswer(
            this.activeCall.callId,
            this.activeCall.recipientId,
            answer
        );
    }

    sendICECandidate(candidate: any): boolean {
        if (!this.activeCall) return false;
        return socketService.sendICECandidate(
            this.activeCall.callId,
            this.activeCall.recipientId,
            candidate
        );
    }

    getActiveCall(): CallData | null {
        return this.activeCall;
    }

    setActiveCall(callData: CallData): void {
        this.activeCall = callData;
    }

    clearActiveCall(): void {
        this.activeCall = null;
    }

    on(event: string, callback: Function): void {
        if (!this.callListeners.has(event)) {
            this.callListeners.set(event, []);
        }
        this.callListeners.get(event)?.push(callback);
    }

    off(event: string, callback: Function): void {
        const listeners = this.callListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    private emit(event: string, data: any): void {
        const listeners = this.callListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }
}

export const callService = new CallService();