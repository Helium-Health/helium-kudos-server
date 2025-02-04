import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebClient } from '@slack/web-api';

@Injectable()
export class SlackService {
  private slackClient: WebClient;

  constructor(private configService: ConfigService) {
    const slackToken = this.configService.get<string>('SLACK_BOT_TOKEN');

    // Initialize the Slack Web API client with your bot token
    this.slackClient = new WebClient(slackToken); // Replace with your bot token
  }

  async sendDirectMessage(userId: string, message: string) {
    try {
      const result = await this.slackClient.chat.postMessage({
        channel: userId, // The Slack user ID
        text: message,
      });
      console.log('Message sent:');
    } catch (error) {
      console.error('Error sending message to Slack:', error);
    }
  }

  async getUserIdByEmail(email: string): Promise<string | null> {
    try {
      const result = await this.slackClient.users.lookupByEmail({
        email: email,
      });

      // If the user is found, return their user ID
      return result.user ? result.user.id : null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }
}
