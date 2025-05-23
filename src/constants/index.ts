export const PRODUCTION_CLIENT = 'https://kudos.onemedicalfile.com/';
export const STAGING_CLIENT = 'https://kudos-staging.onemedtest.com/';
export const fieldsToMerge = [
  'team',
  'gender',
  'nationality',
  'joinDate',
  'dateOfBirth',
];
export const fieldsToRevert = [
  'team',
  'gender',
  'nationality',
  'joinDate',
  'dateOfBirth',
  'originalEmail',
];
export const CRON_EVERY_DAY_AT_HALF_PAST_MIDNIGHT = '30 0 * * *';
export const CRON_EVERY_DAY_AT_QUARTER_PAST_MIDNIGHT = '15 0 * * *';
export const CRON_EVERY_MARCH_8_0020 = '20 0 8 3 *';
export const CRON_EVERY_YEAR_ON_NOVEMBER_19_AT_0020 = '20 0 19 11 *';

export enum Cadence {
  MONTHLY = '0 0 1 * *', // 1st of every month at midnight
  DAILY = '0 0 * * *', // Every day at midnight
}
