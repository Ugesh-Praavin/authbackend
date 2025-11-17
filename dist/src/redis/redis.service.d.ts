import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisClientType } from 'redis';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private client;
    get c(): RedisClientType;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
