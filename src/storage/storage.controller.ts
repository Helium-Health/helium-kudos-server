import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from 'src/auth/utils/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@Controller('storage')
@UseGuards(JwtAuthGuard, AdminGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Delete()
  deleteFile(@Body('url') fileUrl: string) {
    return this.storageService.deleteFile(fileUrl);
  }

  @Post('restore')
  restoreFile(@Body('publicId') publicId: string) {
    return this.storageService.restoreFile(publicId);
  }
}
