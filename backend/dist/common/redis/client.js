"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
const ioredis_1 = require("ioredis");
let client = null;
let initFailed = false;
function getRedisClient() {
    if (initFailed) {
        return null;
    }
    if (client) {
        return client;
    }
    const url = process.env.REDIS_URL;
    if (!url) {
        return null;
    }
    try {
        client = new ioredis_1.default(url, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
        });
        return client;
    }
    catch (err) {
        initFailed = true;
        console.warn("[redis] init failed", err);
        return null;
    }
}
