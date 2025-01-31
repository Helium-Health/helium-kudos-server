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

      console.log(
        workAnniversary,
        workAnniversary && !isNaN(new Date(workAnniversary).getTime())
          ? new Date(workAnniversary)
          : undefined,
      );
      console.log(
        dob,
        dob && !isNaN(new Date(dob).getTime()) ? new Date(dob) : undefined,
      );

      await this.usersService.updateByEmail(email, {
        team,
        joinDate:
          workAnniversary && !isNaN(new Date(workAnniversary).getTime())
            ? new Date(workAnniversary)
            : undefined,
        dateOfBirth:
          dob && !isNaN(new Date(dob).getTime()) ? new Date(dob) : undefined,
        gender:
          gender &&
          [UserGender.Female, UserGender.Male].includes(gender.toLowerCase())
            ? gender.toLowerCase()
            : undefined,
        nationality,
      });
    }
  }
}
