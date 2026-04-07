import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from 'src/common/database/database.service';
import { JwtBlacklistService } from '../service/jwt-blacklist.service';
import { JwtPayload } from '../model/jwt-payload.model';
import { Request } from 'express';
import { Role } from '../model/role.model';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private db: DatabaseService,
    private blacklist: JwtBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
      passReqToCallback: true,
    });
  }
  async validate(req: Request, payload: JwtPayload) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) throw new UnauthorizedException('Token not found');

    const isBlackListed = await this.blacklist.IsBlackListed(token);
    if (isBlackListed) {
      throw new UnauthorizedException('Token has been blacklisted');
    }

    const users = await this.db.query<{
      id: string;
      email: string;
      role: string;
    }>('SELECT id, email, role FROM users WHERE id = ? LIMIT 1', [payload.sub]);

    const user = users[0];

    if (!user) throw new UnauthorizedException();

    payload = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    };
    return payload;
  }
}
