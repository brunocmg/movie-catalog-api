import { plainToInstance } from 'class-transformer';
import { NormalizeEmail } from './normalize-email.transformer';

class Dto {
  @NormalizeEmail()
  email: unknown;
}

describe('NormalizeEmail', () => {
  it('trims and lower-cases strings', () => {
    const dto = plainToInstance(Dto, { email: '  Bruno@Teste.COM ' });
    expect(dto.email).toBe('bruno@teste.com');
  });

  it('leaves non-string values untouched for the validators to reject', () => {
    const dto = plainToInstance(Dto, { email: 123 });
    expect(dto.email).toBe(123);
  });
});
