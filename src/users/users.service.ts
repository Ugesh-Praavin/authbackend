import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
        emailVerified: true,
        roles: { select: { role: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return { ...user, roles: user.roles.map((r) => r.role.name) };
  }

  async addRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) throw new NotFoundException('Role not found');
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
    return this.findById(userId);
  }

  async removeRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) throw new NotFoundException('Role not found');
    await this.prisma.userRole
      .delete({ where: { userId_roleId: { userId, roleId: role.id } } })
      .catch(() => {});
    return this.findById(userId);
  }
}
