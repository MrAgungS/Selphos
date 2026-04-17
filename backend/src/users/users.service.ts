import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { UsersRepository } from './users.repository';
import { RedisService } from 'src/common/redis/redis.service';
import { ValidationService } from 'src/common/validation/validation.service';
import { JwtBlacklistService } from 'src/security/service/jwt-blacklist.service';
import { Logger } from 'winston';
import bcrypt from 'bcrypt';
import {
  LoginUserDTO,
  LogOutUserDTO,
  RegisterUserDTO,
} from 'src/model/users.model';
import { UserValidation } from './users.validation';

// logger.debug must be disabled in production
@Injectable()
export class UsersService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private readonly usersRepository: UsersRepository,
    private readonly validationService: ValidationService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly blacklistService: JwtBlacklistService,
  ) {}

  private generateAccessToken(
    user_id: string,
    email: string,
    name: string,
    role: string,
  ) {
    return this.jwtService.sign(
      { sub: user_id, email, name, role },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );
  }

  private generateRefreshToken(
    user_id: string,
    email: string,
    name: string,
    role: string,
  ) {
    return this.jwtService.sign(
      { sub: user_id, email, name, role },
      { secret: process.env.JWT_SECRET, expiresIn: '7d' },
    );
  }

  private async saveRefreshToken(user_id: string, refresh_token: string) {
    const hashed = await bcrypt.hash(refresh_token, 10);
    await this.redisService.set(
      `refresh_token:${user_id}`,
      hashed,
      7 * 24 * 60 * 60,
    );
  }

  async register(request: RegisterUserDTO) {
    this.logger.info('Registering user', { email: request.email });

    const registerRequest = this.validationService.validate(
      UserValidation.REGISTER,
      request,
    ) as RegisterUserDTO;

    const existingUser = await this.usersRepository.findByEmail(
      registerRequest.email,
    );

    if (existingUser) {
      this.logger.warn('Registration failed, email already exists', {
        email: registerRequest.email,
      });
      throw new ConflictException('email already exists');
    }

    registerRequest.password = await bcrypt.hash(registerRequest.password, 10);

    const user = await this.usersRepository.create(
      registerRequest.name,
      registerRequest.email,
      registerRequest.password,
    );

    this.logger.info('User registered successfully', {
      email: user.email,
    });
    return {
      email: user.email,
      name: user.name,
    };
  }

  async login(request: LoginUserDTO) {
    this.logger.info('Login attempt', { email: request.email });

    const loginRequest = this.validationService.validate(
      UserValidation.LOGIN,
      request,
    ) as LoginUserDTO;

    const user = await this.usersRepository.findByEmail(loginRequest.email);
    if (!user) {
      this.logger.warn('Login failed, email not found', {
        email: loginRequest.email,
      });
      throw new UnauthorizedException('invalid email');
    }

    const isPasswordValid = await bcrypt.compare(
      loginRequest.password,
      user.password,
    );
    if (!isPasswordValid) {
      this.logger.warn('Login failed, invalid password', {
        email: loginRequest.email,
      });
      throw new UnauthorizedException('invalid password');
    }

    const access_token = this.generateAccessToken(
      user.id,
      user.email,
      user.name,
      user.role,
    );
    const refresh_token = this.generateRefreshToken(
      user.id,
      user.email,
      user.name,
      user.role,
    );

    await this.saveRefreshToken(user.id, refresh_token);

    this.logger.info('User logged in successfully', {
      user_id: user.id,
      email: user.email,
    });
    return {
      email: user.email,
      name: user.name,
      access_token,
      refresh_token,
    };
  }

  async refresh(refresh_token: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch (error: unknown) {
      this.logger.warn('Refresh token invalid or expired', { error });
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    this.logger.debug('Refresh token verified, checking stored token', {
      user_id: payload.sub,
    });
    const storedToken = await this.redisService.get(
      `refresh_token:${payload.sub}`,
    );
    if (!storedToken) {
      this.logger.warn('Refresh token not found in Redis', {
        user_id: payload.sub,
      });
      throw new ForbiddenException('Refresh token not found');
    }

    const isMatch = await bcrypt.compare(refresh_token, storedToken);
    if (!isMatch) {
      this.logger.warn('Refresh token is invalid', { user_id: payload.sub });
      throw new ForbiddenException('Refresh token is invalid');
    }

    const user = await this.usersRepository.findById(payload.sub);
    if (!user) {
      this.logger.warn('User not found during token refresh', {
        user_id: payload.sub,
      });
      throw new UnauthorizedException('User not found');
    }

    const new_access_token = this.generateAccessToken(
      user.id,
      user.email,
      user.name,
      user.role,
    );
    const new_refresh_token = this.generateRefreshToken(
      user.id,
      user.email,
      user.name,
      user.role,
    );
    await this.saveRefreshToken(user.id, new_refresh_token);

    this.logger.info('Token refreshed successfully', { user_id: user.id });
    return {
      access_token: new_access_token,
      refresh_token: new_refresh_token,
    };
  }

  async logout(request: LogOutUserDTO) {
    this.logger.info('Logout attempt', { user_id: request.user_id });
    const logoutRequest = this.validationService.validate(
      UserValidation.LOGOUT,
      request,
    ) as LogOutUserDTO;

    await this.blacklistService.blackListToken(logoutRequest.access_token);
    await this.redisService.del(`refresh_token:${logoutRequest.user_id}`);

    this.logger.info('User logged out successfully', {
      user_id: logoutRequest.user_id,
    });
    return { data: true };
  }
}
