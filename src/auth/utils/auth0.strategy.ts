import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

// TODO AUTH0 STRATEGY HARD Code till 14th Feb 
const STAGING_AUTH0_DOMAIN="dev-jzt0sqgp553oh8l0.us.auth0.com"
const STAGING_AUTH0_AUDIENCE="https://dev-jzt0sqgp553oh8l0.us.auth0.com/api/v2/"
const STAGING_AUTH0_CLIENT_SECRET='pZooTyhyezV4Zmn8SGsAEl1QQnl_ZEbec_NJ5kBSRpPjBU99UkiM4rPHPmPMesoT'

const PROD_AUTH0_DOMAIN="dev-jzt0sqgp553oh8l0.us.auth0.com"
const PROD_AUTH0_AUDIENCE="https://dev-jzt0sqgp553oh8l0.us.auth0.com/api/v2/"
const PROD_AUTH0_CLIENT_SECRET='EYs5cXdbnkvwFzNCNSG9YaCUdE3ki8mFoI60ftCSPSRvDeHa4gS6P9Y3Ek29vvfK'

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy, 'auth0') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // secretOrKey: process.env.AUTH0_CLIENT_SECRET,
      // audience: process.env.AUTH0_AUDIENCE,
      // issuer: `https://${process.env.AUTH0_DOMAIN}/`,

      secretOrKey: process.env.NODE_ENV === 'production' ? PROD_AUTH0_CLIENT_SECRET : STAGING_AUTH0_CLIENT_SECRET,
      audience: process.env.NODE_ENV === 'production' ? PROD_AUTH0_AUDIENCE : STAGING_AUTH0_AUDIENCE,
      issuer: `https://${process.env.NODE_ENV === 'production' ? PROD_AUTH0_DOMAIN : STAGING_AUTH0_DOMAIN}/`,
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
