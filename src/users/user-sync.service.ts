import { Injectable } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';
import { GoogleSheetsService } from 'src/google/google-sheets/google-sheets.service';
import { UserGender } from './schema/User.schema';

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

      console.log('Processing row:', row);

      await this.usersService.updateByEmail(email, {
        team,
        joinDate: this.parseDate(workAnniversary),
        dateOfBirth: this.parseDate(dob),
        gender:
          gender &&
          [UserGender.Female, UserGender.Male].includes(gender.toLowerCase())
            ? gender.toLowerCase()
            : undefined,
        nationality,
      });
    }
  }

  parseDate(dateString: string | undefined): Date | undefined {
    if (!dateString) return undefined;
    if (isNaN(new Date(dateString).getTime())) return undefined;

    const currentYear = new Date().getFullYear();
    const [month, day] = dateString.split(' ');
    console.log('month, day', month, day);

    // const date = new Date(`${month} ${day}, ${currentYear}`);
    const date = new Date(
      Date.UTC(currentYear, new Date(`${month} 1`).getMonth(), parseInt(day)),
    );

    console.log('System timezone offset (minutes):', new Date(`${month} ${day}, ${currentYear}`).getTimezoneOffset());
    console.log(
      'System timezone offset (hours):',
      new Date(`${month} ${day}, ${currentYear}`).getTimezoneOffset() / -60,
    );
    console.log('date', date);

    return date;
  }
}
