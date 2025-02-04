import { Controller, Post, UseGuards } from '@nestjs/common';
import { SlackService } from './slack.service';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';

@Controller('slack')
@UseGuards(JwtAuthGuard)
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Post('send')
  async sendNotification() {
    const userId = await this.slackService.getUserIdByEmail('kerry@heliumhealth.com');
    if (userId) {
      await this.slackService.sendDirectMessage(userId, 'Hello, this is a direct message from NestJS!');
      return { message: 'Message sent successfully!' };
    }
    return { message: 'User not found!' };
  }
}
