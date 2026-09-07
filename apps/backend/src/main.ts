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

function assertRequiredEnv(): void {
  const required = ['DATABASE_URL', 'SUPABASE_URL'] as const;
  const missing = required.filter((k) => !process.env[k]?.trim());
  const hasAuthKey = Boolean(
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.SUPABASE_ANON_KEY?.trim(),
  );
  if (!hasAuthKey) {
    missing.push('SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    // Storage needs this in production; warn loudly but do not block if publishable exists
    // eslint-disable-next-line no-console
    console.warn(
      '[boot] SUPABASE_SERVICE_ROLE_KEY is missing — document upload to private buckets will fail',
    );
  }
  if (missing.length) {
    throw new Error(
      `[boot] Missing required env: ${missing.join(', ')}. Set them in Railway Variables.`,
    );
  }
}

async function bootstrap() {
  assertRequiredEnv();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: true,
    credentials: true,
  });
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

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API  http://0.0.0.0:${port}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`Swagger  http://0.0.0.0:${port}/docs`);
}
bootstrap();
