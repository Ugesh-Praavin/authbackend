"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } });
    await prisma.role.upsert({ where: { name: 'user' }, update: {}, create: { name: 'user' } });
}
main().finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map