import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './utils/transform.interceptor';
import { CurrencySeeder } from './currency/seeds/currency.seed';
import { AllocationSeeder } from './allocations/seeds/allocation.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const currencySeeder = app.get(CurrencySeeder);
  await currencySeeder.seedCurrency();
  const allocationSeeder = app.get(AllocationSeeder);
  await allocationSeeder.seedAllocations();
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['http://localhost:3000', 'https://kudos-staging.onemedtest.com'],
    credentials: true,
  });
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(3001);
}
bootstrap();
