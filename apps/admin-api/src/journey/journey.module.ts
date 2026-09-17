import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { JourneyService } from './journey.service';
import { JourneyController } from './journey.controller';

@Module({
  imports: [AuditModule],
  controllers: [JourneyController],
  providers: [JourneyService],
  exports: [JourneyService],
})
export class JourneyModule {}
