import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Department,
  DepartmentDocument,
  DepartmentPermission,
} from './schema/department.schema';

@Injectable()
export class DepartmentSeedService implements OnModuleInit {
  private readonly logger = new Logger(DepartmentSeedService.name);

  constructor(
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
  ) {}

  async onModuleInit() {
    const departmentCount = await this.departmentModel.countDocuments();

    if (departmentCount === 0) {
      const hrDepartment = {
        name: 'HR',
        description: 'Human Resources department',
        permissions: Object.values(DepartmentPermission),
      };

      await this.departmentModel.create(hrDepartment);
      this.logger.log(
        'HR department seeded successfully with all permissions.',
      );
    } else {
      this.logger.log('HR department seed skipped: Departments already exist.');
    }
  }
}
