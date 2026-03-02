import { HttpException, HttpStatus } from '@nestjs/common';

/** Custom exception thrown when the BigBlueButton API returns an error or is unreachable. */
export class BbbApiException extends HttpException {
  constructor(message: string, bbbMessageKey?: string) {
    super(
      { message, bbbMessageKey, error: 'BBB API Error' },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
