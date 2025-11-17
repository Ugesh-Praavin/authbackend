import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  get c() {
    return this.client;
  }

  async onModuleInit() {
    this.client = createClient({ url: process.env.REDIS_URL });
    this.client.on('error', (e) => console.error('Redis error', e));
    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit();
  }
}
