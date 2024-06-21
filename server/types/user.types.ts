export interface IRegisterationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface IUser {
  name: string;
  email: string;
  password: string;
}

export interface PrismaUser {
  id: string;
  name: string;
  email: string;
  password: string | null;
  role: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  avatar: {
    public_id: string;
    url: string;
  } | null;
  courses: {
    courseId: string;
  }[];
}
