import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { SessionGuard } from '../common/session.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@UseGuards(SessionGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Roles('admin')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @Roles('admin')
  @Patch(':id/roles/add')
  addRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.users.addRole(id, body.role);
  }

  @Roles('admin')
  @Patch(':id/roles/remove')
  removeRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.users.removeRole(id, body.role);
  }
}
