import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserGender } from 'src/users/schema/User.schema';
import { UsersService } from 'src/users/users.service';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import { google } from 'googleapis';
import axios from 'axios';
@Injectable()
export class AuthService {
  private oauthClient: OAuth2Client;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private userService: UsersService,
  ) {
    this.oauthClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
  }

  async validateUser(
    token: string,
  ): Promise<{ user: User; accessToken: string }> {
    try {
      let userDetails = null; // Todo use correct type
      const googleAuth = await this.oauthClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = googleAuth.getPayload();

      const userExists = await this.userModel.findOne({
        email: payload.email,
      });

      if (userExists) {
        console.log('User exists. Getting...');
        userDetails = userExists;
      } else {
        console.log('User not found. Creating...');
        userDetails = await this.userService.createUser({
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          verified: payload.email_verified || false,
        });
      }

      const jwtToken = this.generateJwtToken(userDetails);

      console.log('Calling Function');
      const { birthday, gender } = await this.fetchUserDetails(token);
      console.log({ birthday, gender });

      return { user: userDetails, accessToken: jwtToken };
    } catch (e) {
      console.log('Error in validateUser', e);
      throw new Error('Error in validateUser');
    }
  }

  generateJwtToken(
    user: User & {
      _id: Types.ObjectId;
    },
  ) {
    const payload = { email: user.email, sub: user._id, role: user.role };
    return this.jwtService.sign(payload);
  }

  async fetchUserDetails(
    idToken: string,
  ): Promise<{ birthday?: Date; gender?: string }> {
    try {
      // Step 5: Exchange the id_token for access_token
      // const accessToken = await this.exchangeIdTokenForAccessToken(idToken);

      // Step 6: Set the access_token to oauthClient
      this.oauthClient.setCredentials({ access_token: idToken });

      // Step 7: Use the access_token to get the user details from Google People API
      const peopleApi = google.people({
        version: 'v1',
        auth: this.oauthClient,
      });

      const response = await peopleApi.people.get({
        resourceName: 'people/me',
        personFields: 'birthdays,genders',
      });

      const data = response.data;
      const birthday = data.birthdays?.[0]?.date
        ? new Date(
            data.birthdays[0].date.year,
            data.birthdays[0].date.month - 1, // Month is zero-indexed in JS Date
            data.birthdays[0].date.day,
          )
        : undefined;

      const gender = data.genders?.[0]?.value;

      return { birthday, gender };
    } catch (error) {
      console.error('Error fetching user details:', error.message);
      return {};
    }
  }

  // // Exchange the id_token for an access_token
  // async exchangeIdTokenForAccessToken(idToken: string): Promise<string> {
  //   try {
  //     const response = await axios.post('https://oauth2.googleapis.com/token', null, {
  //       params: {
  //         id_token: idToken, // Pass the id_token here
  //         client_id: process.env.GOOGLE_CLIENT_ID, // Your Google client ID
  //         client_secret: process.env.GOOGLE_CLIENT_SECRET, // Your Google client secret
  //         grant_type: 'authorization_code', // This grant type is used for exchanging an authorization code for tokens
  //       },
  //     });

  //     // The response will contain the access_token
  //     const accessToken = response.data.access_token;
  //     return accessToken;
  //   } catch (error) {
  //     console.error('Error exchanging id_token for access_token:', error.message);
  //     throw new Error('Error exchanging id_token for access_token');
  //   }
  // }
}
