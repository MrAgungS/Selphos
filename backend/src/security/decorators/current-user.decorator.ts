import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from 'src/users/interfaces/user.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;

    if (!user) throw new UnauthorizedException('User not authenticated');

    return user;
  },
);
