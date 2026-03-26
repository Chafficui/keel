export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  bio?: string;
  location?: string;
  website?: string;
}

export interface UpdateProfileInput {
  name?: string;
  image?: string | null;
}
