import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'admin-api',
      phase: 'W5',
      wave: 'C6',
      time: new Date().toISOString(),
    };
  }
}
