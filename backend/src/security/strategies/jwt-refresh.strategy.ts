import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../model/jwt-payload.model';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET as string,
      passReqToCallback: true,
    });
  }
  validate(req: Request, payload: JwtPayload) {
    const authHeader = req.headers.authorization;
    const refreshToken = authHeader?.split(' ')[1];
    if (!refreshToken) throw new UnauthorizedException();
    return { id: payload.sub, refreshToken };
  }
}
