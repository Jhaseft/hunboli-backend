import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KycStatus } from '@prisma/client';
import { KYC_VERIFIED_KEY } from '../decorators/kyc-verified.decorator';

@Injectable()
export class KycVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requireKyc = this.reflector.getAllAndOverride<boolean>(
      KYC_VERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireKyc) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user.isVerified) {
      throw new ForbiddenException(
        'Debes Realizar el proceso de verificacion antes de continuar',
      );
    }

    if (user.kycStatus !== KycStatus.VERIFIED) {
      throw new ForbiddenException(
        'Debes completar la verificación KYC antes de continuar',
      );
    }

    return true;
  }
}
