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
export const CRON_EVERY_DAY_AT_11AM = '0 10 * * *'; // 10 here is 11AM UTC+1
export const CRON_EVERY_DAY_AT_QAUTER_PAST_10AM_TEST = '30 9 27 11 *';
export const CRON_EVERY_DAY_AT_HALF_PAST_11AM = '30 10 * * *';
export const CRON_EVERY_MARCH_8_0020 = '20 11 8 3 *';
export const CRON_EVERY_YEAR_ON_NOVEMBER_19_AT_0020 = '0 9 19 11 *';
export const CRON_EVERY_YEAR_ON_NOV_13_AT_0020 = '30 14 13 11 *';

export enum Cadence {
  MONTHLY = '0 0 1 * *', // 1st of every month at midnight
  DAILY = '0 0 * * *', // Every day at midnight
}
