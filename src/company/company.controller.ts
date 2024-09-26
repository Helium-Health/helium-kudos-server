import { Controller, Get } from '@nestjs/common';
import { CompanyService } from './company.service';
import { COMPANY_VALUES } from 'src/constants/companyValues';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('values')
  getCompanyValues() {
    return COMPANY_VALUES;
  }
}
