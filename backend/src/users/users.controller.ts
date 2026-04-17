import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Public } from 'src/security/decorators/public.decorator';
import { RegisterUserDTO, LoginUserDTO } from 'src/model/users.model';
import { JwtRefreshGuard } from 'src/security/guards/jwt-refresh.guard';

// Remember that earlier i set JwtAuthGuard as APP_GUARD
// which means all routes are automatically protected and require a token.
@Controller('/api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post('register')
  async register(@Body() request: RegisterUserDTO) {
    return this.usersService.register(request);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() request: LoginUserDTO) {
    return this.usersService.login(request);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@Request() request: { refresh_token: string }) {
    return this.usersService.refresh(request.refresh_token);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Request()
    request: {
      user: { id: string };
      headers: { authorization: string };
    },
  ) {
    const token = request.headers.authorization.split(' ')[1];
    return this.usersService.logout({
      user_id: request.user.id,
      access_token: token,
    });
  }
}
