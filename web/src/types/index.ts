export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
  avt?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface Message {
  _id: string;
  sender: string | User;
  receiver: string;
  content: string;
  timestamp: Date;
  status?: "sent" | "delivered" | "seen";
  _tempId?: string;
  reactions?: Record<string, string>;
  replyTo?: string;
  mediaType?: "image" | "video" | "audio" | "file";
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  unsent?: boolean;
  chatType?: "private" | "group";
}
