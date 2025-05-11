import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseBoolPipe,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @Roles('ADMIN')
  create(
    @Body()
    createBranchDto: {
      name: string;
      address: string;
      phone: string;
      email?: string;
    },
  ) {
    return this.branchService.create(createBranchDto);
  }

  @Get()
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive = false,
  ) {
    return this.branchService.findAll(includeInactive);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body()
    updateBranchDto: {
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
      isActive?: boolean;
    },
  ) {
    return this.branchService.update(id, updateBranchDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.branchService.deactivate(id);
  }

  @Get(':id/summary')
  getSummary(@Param('id') id: string) {
    return this.branchService.getBranchSummary(id);
  }
}
