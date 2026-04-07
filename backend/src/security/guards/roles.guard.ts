import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../model/role.model';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithUser } from '../model/request-with-user.model';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) throw new ForbiddenException('Dont have access');

    return true;
  }
}
