import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// Prisma / adapters read process.env — load .env with override so
// STORAGE_* etc. win even if a parent shell left empty/stale values.
loadEnv({
  path: resolve(__dirname, '../.env'),
  override: true,
  quiet: true,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DYN CRM API')
    .setDescription(
      'Modular monolith — `/api/v1`. Auth: POST /auth/login|signup (Supabase BFF). Dev also accepts `Bearer test:<userId>` when AUTH_MODE=test.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT / test:<userId>' },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API  http://localhost:${port}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`Swagger  http://localhost:${port}/docs`);
}
bootstrap();
