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
