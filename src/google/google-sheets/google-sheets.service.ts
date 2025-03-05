import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { JWT } from 'google-auth-library';
import { SHEET_NAME } from 'src/constants/companyValues';

@Injectable()
export class GoogleSheetsService {
  private readonly sheets;
  private readonly spreadsheetId = this.configService.get<string>(
    'GOOGLE_TEAM_SHEET_ID',
  );

  constructor(private configService: ConfigService) {
    this.sheets = google.sheets({ version: 'v4', auth: this.getAuthClient() });
  }

  private getAuthClient(): JWT {
    return new google.auth.JWT({
      email: this.configService.get<string>('GOOGLE_CLIENT_EMAIL'),
      key: this.configService
        .get<string>('GOOGLE_PRIVATE_KEY')
        .replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  async getEmployeeData() {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_NAME}!A2:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    return response.data.values;
  }
}
