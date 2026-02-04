"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPersistedStore = readPersistedStore;
exports.schedulePersist = schedulePersist;
const fs = require("fs");
const path = require("path");
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "mock-store.json");
let writeTimer = null;
function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}
function readPersistedStore() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return {};
        }
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
function schedulePersist(payload) {
    ensureDir();
    if (writeTimer) {
        clearTimeout(writeTimer);
    }
    writeTimer = setTimeout(() => {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), "utf-8");
        }
        catch {
        }
    }, 500);
}
