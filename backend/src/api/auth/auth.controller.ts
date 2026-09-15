import { AllConfigType } from '@/config/config.type';
import { Environment } from '@/constants/app.constant';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { CookieOptions, Request, Response } from 'express';
import ms from 'ms';
import { AuthService } from './auth.service';
import { LoginReqDto } from './dto/login.req.dto';
import { LoginResDto } from './dto/login.res.dto';
import { RefreshResDto } from './dto/refresh.res.dto';
import { RegisterReqDto } from './dto/register.req.dto';
import { RegisterResDto } from './dto/register.res.dto';
import { JwtPayloadType } from './types/jwt-payload.type';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  private refreshCookieOptions(): CookieOptions {
    const isProd =
      this.configService.get('app.nodeEnv', { infer: true }) ===
      Environment.PRODUCTION;
    const cookieDomain = this.configService.get('auth.cookieDomain', {
      infer: true,
    });
    const options: CookieOptions = {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: isProd,
      maxAge: ms(
        this.configService.getOrThrow('auth.refreshExpires', { infer: true }),
      ) as unknown as number,
    };
    if (cookieDomain) {
      options.domain = cookieDomain;
    }
    return options;
  }

  @ApiPublic({
    type: LoginResDto,
    summary: 'Sign in',
  })
  @Post('email/login')
  async signIn(
    @Body() userLogin: LoginReqDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResDto> {
    const result = await this.authService.signIn(userLogin);
    res.cookie(
      REFRESH_COOKIE,
      result.refreshToken,
      this.refreshCookieOptions(),
    );
    return {
      userId: result.userId,
      accessToken: result.accessToken,
      tokenExpires: result.tokenExpires,
    };
  }

  @ApiPublic()
  @Post('email/register')
  async register(@Body() dto: RegisterReqDto): Promise<RegisterResDto> {
    return await this.authService.register(dto);
  }

  @ApiAuth({
    summary: 'Logout',
    errorResponses: [400, 401, 403, 500],
  })
  @Post('logout')
  async logout(
    @CurrentUser() userToken: JwtPayloadType,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(userToken);
    const opts = this.refreshCookieOptions();
    res.clearCookie(REFRESH_COOKIE, { ...opts, maxAge: undefined });
  }

  @ApiPublic({
    type: RefreshResDto,
    summary: 'Refresh token',
  })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResDto> {
    const token = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException();
    }
    const result = await this.authService.refreshToken(token);
    res.cookie(
      REFRESH_COOKIE,
      result.refreshToken,
      this.refreshCookieOptions(),
    );
    return {
      userId: result.userId,
      accessToken: result.accessToken,
      tokenExpires: result.tokenExpires,
    };
  }

  @ApiPublic()
  @Post('forgot-password')
  async forgotPassword() {
    return 'forgot-password';
  }

  @ApiPublic()
  @Post('verify/forgot-password')
  async verifyForgotPassword() {
    return 'verify-forgot-password';
  }

  @ApiPublic()
  @Post('reset-password')
  async resetPassword() {
    return 'reset-password';
  }

  @ApiPublic()
  @Get('verify/email')
  async verifyEmail() {
    return 'verify-email';
  }

  @ApiPublic()
  @Post('verify/email/resend')
  async resendVerifyEmail() {
    return 'resend-verify-email';
  }
}
