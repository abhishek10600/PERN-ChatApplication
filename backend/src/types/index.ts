export interface IJwtUserPayload {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  isOnline: boolean;
  lastSeen: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
