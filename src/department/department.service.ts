import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.tdo';
import { Department, DepartmentDocument } from './schema/department.schema';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const newDepartment = new this.departmentModel(createDepartmentDto);
    return newDepartment.save();
  }

  async findAll(): Promise<Department[]> {
    return this.departmentModel.find().exec();
  }

  async findOne(id: Types.ObjectId): Promise<Department> {
    return this.departmentModel.findById(id).exec();
  }

  async update(
    id: Types.ObjectId,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    return this.departmentModel
      .findByIdAndUpdate(id, updateDepartmentDto, { new: true })
      .exec();
  }

  async delete(id: Types.ObjectId): Promise<Department> {
    return this.departmentModel.findByIdAndDelete(id).exec();
  }
}
