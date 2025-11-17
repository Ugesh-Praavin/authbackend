"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecoveryCodes = generateRecoveryCodes;
exports.hashRecoveryCode = hashRecoveryCode;
exports.verifyRecoveryCode = verifyRecoveryCode;
const crypto_1 = require("crypto");
const argon2 = __importStar(require("argon2"));
function generateRecoveryCodes(n = 10, partLen = 4, parts = 3) {
    const codes = [];
    for (let i = 0; i < n; i++) {
        const raw = (0, crypto_1.randomBytes)(Math.ceil((partLen * parts) / 2))
            .toString('hex')
            .slice(0, partLen * parts);
        const groups = [];
        for (let p = 0; p < parts; p++) {
            groups.push(raw.slice(p * partLen, (p + 1) * partLen));
        }
        codes.push(groups.join('-').toUpperCase());
    }
    return codes;
}
async function hashRecoveryCode(code) {
    return argon2.hash(code, { type: argon2.argon2id });
}
async function verifyRecoveryCode(code, hash) {
    return argon2.verify(hash, code);
}
//# sourceMappingURL=recovery.util.js.map