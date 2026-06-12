export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  course?: string;
  phone?: string;
  photoUrl?: string;
  role: 'user' | 'driver' | 'superadmin';
  joinedQueues: string[];
}

export interface Queue {
  id: string;
  name: string;
  code: string;
  openTime?: string;
  closeTime?: string;
  lastResetDate?: string;
  announcement?: string;
  announcementImage?: string;
  announcementPostedAt?: any;
}

export interface QueueMember {
  uid: string;
  name: string;
  course: string;
  photoUrl: string;
  timestamp: any; // Firestore Timestamp
  observation?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  type: 'user' | 'system';
  userId?: string;
  sender?: string;
  photoUrl?: string;
  imageUrl?: string;
  timestamp: any; // Firestore Timestamp
}
