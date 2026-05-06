import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { REQUEST_TOKEN_PAYLOAD_NAME } from '../common/auth.constant';
import { PayloadTokenDto } from '../dto/payload-token.dto';

type RequestWithTokenPayload = Request & {
  [REQUEST_TOKEN_PAYLOAD_NAME]?: PayloadTokenDto;
};

export const TokenPayloadParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const context = ctx.switchToHttp();
    const request = context.getRequest<RequestWithTokenPayload>();

    return request[REQUEST_TOKEN_PAYLOAD_NAME];
  },
);
