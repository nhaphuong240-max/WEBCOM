import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { initObservability } from './observability';

async function bootstrap() {
  initObservability('admin-api');
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.setGlobalPrefix('api');

  const port = Number(process.env.ADMIN_API_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[admin-api] W0 listening on http://127.0.0.1:${port}/api/health`);
}

bootstrap();
