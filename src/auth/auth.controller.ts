import { Body, Controller, Post } from '@nestjs/common';
import { SignInDto } from './dto/signin.dto';
import { AuthService } from './auth.service';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ResponseSignInDto } from './dto/response-signin.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @ApiOperation({ summary: 'Authenticate user' })
  @ApiOkResponse({
    description: 'User authenticated successfully',
    type: ResponseSignInDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.authenticate(signInDto);
  }
}
