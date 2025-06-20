import { Inject, Injectable } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';
import { GoogleSheetsService } from 'src/google/google-sheets/google-sheets.service';
import { UserGender } from './schema/User.schema';

@Injectable()
export class UserSyncService {
  constructor(
    private readonly usersService: UsersService,
    private readonly googleSheetsService: GoogleSheetsService,
    @Inject('AUTH_SERVICE') private readonly authService,
  ) {}

  async createInitialUsers() {
    console.log('RUNNING USER CREATION UPDATE');
    const sheetData = await this.googleSheetsService.getEmployeeData();
    const batchSize = 10;
    const timeout = 1000; // 1 second timeout between batches

    const results = {
      created: [],
      existing: [],
      failed: [],
    };

    for (let i = 0; i < sheetData.length; i += batchSize) {
      const batch = sheetData.slice(i, i + batchSize);

      for (const row of batch) {
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

        try {
          const existingUser = await this.usersService.findByEmail(email);

          if (existingUser === null) {
            await this.usersService.createUser({
              email,
              name: `${firstName} ${lastName}`,
              department: team,
              joinDate: workAnniversary ? new Date(workAnniversary) : null,
              dateOfBirth: dob ? new Date(dob) : null,
              gender:
                gender &&
                [UserGender.Female, UserGender.Male].includes(
                  gender.toLowerCase(),
                )
                  ? gender.toLowerCase()
                  : undefined,
              nationality,
              verified: false,
            });
            results.created.push({ email, name: `${firstName} ${lastName}` });
          } else {
            await this.usersService.updateByEmail(email, {
              department: team,
              joinDate: workAnniversary ? new Date(workAnniversary) : null,
              dateOfBirth: dob ? new Date(dob) : null,
              gender:
                gender &&
                [UserGender.Female, UserGender.Male].includes(
                  gender.toLowerCase(),
                )
                  ? gender.toLowerCase()
                  : undefined,
              nationality,
            });
            results.existing.push({ email });
          }
        } catch (error) {
          console.log(`Error processing row ${row}:`, error);
          results.failed.push({ email, error: error.message });
          continue;
        }
      }

      // Add timeout between batches, but not after the last batch
      if (i + batchSize < sheetData.length) {
        await new Promise((resolve) => setTimeout(resolve, timeout));
      }

      console.log(
        `Processed batch ${i / batchSize + 1} of ${Math.ceil(sheetData.length / batchSize)}`,
      );
    }

    console.log('User Creation Summary:', {
      created: results.created.length,
      existing: results.existing.length,
      failed: results.failed.length,
    });

    return results;
  }

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

      // Skip rows with missing workAnniversary or dob
      if (!workAnniversary || !dob) {
        continue;
      }

      await this.usersService.updateByEmail(email, {
        department: team,
        joinDate: workAnniversary ? new Date(workAnniversary) : null,
        dateOfBirth: dob ? new Date(dob) : null,
        gender:
          gender &&
          [UserGender.Female, UserGender.Male].includes(gender.toLowerCase())
            ? gender.toLowerCase()
            : undefined,
        nationality,
      });
      return;
    }
  }

  async syncUserWorkAnniversary() {
    console.log('RUNNING WORK ANNIVERSARY UPDATE', new Date());
    const skippedUsers = [];
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
      // Skip rows with missing workAnniversary or dob
      if (!workAnniversary) {
        skippedUsers.push(email);
        continue;
      }
      const result = await this.usersService.updateByEmail(email, {
        joinDate: workAnniversary ? new Date(workAnniversary) : null,
      });
    }
    console.log('skippedUsers', skippedUsers);
  }
}
