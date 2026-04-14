export class RegisterUserDTO {
  name: string;
  email: string;
  password: string;
}

export class LoginUserDTO {
  email: string;
  password: string;
}

export class LogOutUserDTO {
  user_id: string;
  access_token: string;
}
