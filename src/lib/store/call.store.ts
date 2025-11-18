import { atom } from 'jotai';
import { CurrentCallData, IncomingCallData } from '../types';



// Atoms for call management
export const incomingCallAtom = atom<IncomingCallData | null>(null);
export const currentCallAtom = atom<CurrentCallData | null>(null);
export const isInCallAtom = atom<boolean>(false);
export const currentUserNameAtom = atom<string>('');