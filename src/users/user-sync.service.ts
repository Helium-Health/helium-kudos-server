import { Injectable } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';
import { GoogleSheetsService } from 'src/google/google-sheets/google-sheets.service';

@Injectable()
export class UserSyncService {
  constructor(
    private readonly usersService: UsersService,
    private readonly googleSheetsService: GoogleSheetsService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  @Cron('0 * * * * *', { name: 'runOnce' })
  async runOnce() {
    // TODO: remove this line after initial Production deployment
    console.log('RUNNING TEAM DATA UPDATE ONCE');

    await this.syncUsersWithGoogleSheet();
    const cronJob = this.schedulerRegistry.getCronJob('runOnce');
    cronJob.stop();
  }

  @Cron('0 0 */14 * *') // Runs every 14 days
  async syncUsersWithGoogleSheet() {
    console.log('RUNNING TEAM DATA UPDATE', new Date());
    const sheetData = await this.googleSheetsService.getEmployeeData();

    for (const row of sheetData) {
      const [
        id,
        firstName,
        lastName,
        email,
        team,
        workAnniversary,
        dob,
        gender,
        nationality,
      ] = row;

      await this.usersService.updateByEmail(email, {
        team,
        joinDate: new Date(workAnniversary),
        dateOfBirth: new Date(dob),
        gender,
        nationality,
      });
    }
  }
}
