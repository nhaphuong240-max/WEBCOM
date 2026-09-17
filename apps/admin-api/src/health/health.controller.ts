import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'admin-api',
      phase: 'W5',
      wave: 'B2',
      time: new Date().toISOString(),
    };
  }
}
