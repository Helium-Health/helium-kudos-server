import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './utils/transform.interceptor';
import { CurrencySeeder } from './currency/seeds/currency.seed';
// import * as session from 'express-session';
// import * as passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const currencySeeder = app.get(CurrencySeeder);
  await currencySeeder.seed();
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: 'http://localhost:3000',
  });
  // app.use(
  //   session({
  //     secret: 'your-secret-key',
  //     saveUninitialized: false,
  //     resave: false,
  //     cookie: {
  //       maxAge: 60000,
  //     },
  //   }),
  // );
  // app.use(passport.initialize());
  // app.use(passport.session());

  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(3001);
}
bootstrap();
