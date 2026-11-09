import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResponseSignInDto, TokensDto } from './dto/response-signin.dto';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/authenticated-user';
import { StrictThrottle } from '../common/throttling/throttling';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @StrictThrottle()
  @ApiOperation({
    summary: 'Log in: returns an access token and a refresh token',
  })
  @ApiOkResponse({ type: ResponseSignInDto })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many login attempts from this IP',
    type: ErrorResponseDto,
  })
  login(@Body() signInDto: SignInDto) {
    return this.authService.authenticate(signInDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a refresh token for new tokens (the old one is revoked)',
  })
  @ApiOkResponse({ type: TokensDto })
  @ApiUnauthorizedResponse({
    description:
      'Unknown, expired or revoked refresh token. Reusing a rotated token revokes the whole session.',
    type: ErrorResponseDto,
  })
  refresh(@Body() { refreshToken }: RefreshTokenDto) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the session of this refresh token' })
  @ApiNoContentResponse({ description: 'Session revoked (idempotent)' })
  logout(@Body() { refreshToken }: RefreshTokenDto) {
    return this.authService.logout(refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth()
  @ApiOperation({ summary: 'Revoke every session of the current user' })
  @ApiNoContentResponse({ description: 'All sessions revoked' })
  logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logoutEverywhere(user.id);
  }
}
