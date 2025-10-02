"use strict";
/**
 * MongoDB Connection Manager
 *
 * Provides a singleton connection to MongoDB with proper connection pooling
 * and error handling for Next.js environment.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.disconnectDB = disconnectDB;
exports.isConnected = isConnected;
exports.getConnectionStatus = getConnectionStatus;
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
if (!MONGODB_URI) {
    throw new Error('Please define the DATABASE_URL environment variable inside .env');
}
/**
 * Global cached connection for development hot reloading
 */
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}
/**
 * Connect to MongoDB with connection pooling
 *
 * @returns Promise<Mongoose> - Mongoose instance
 */
async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 10000,
            family: 4, // Use IPv4, skip IPv6
        };
        console.log('🔄 Connecting to MongoDB...');
        cached.promise = mongoose_1.default.connect(MONGODB_URI, opts)
            .then((mongoose) => {
            console.log('✅ MongoDB connected successfully');
            return mongoose;
        })
            .catch((error) => {
            console.error('❌ MongoDB connection error:', error);
            cached.promise = null;
            throw error;
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}
/**
 * Disconnect from MongoDB
 */
async function disconnectDB() {
    if (cached.conn) {
        await mongoose_1.default.disconnect();
        cached.conn = null;
        cached.promise = null;
        console.log('🔌 MongoDB disconnected');
    }
}
/**
 * Check if MongoDB is connected
 */
function isConnected() {
    return mongoose_1.default.connection.readyState === 1;
}
/**
 * Get connection status string
 */
function getConnectionStatus() {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    return states[mongoose_1.default.connection.readyState] || 'unknown';
}
// Handle process termination
if (process.env.NODE_ENV !== 'development') {
    process.on('SIGINT', async () => {
        await disconnectDB();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        await disconnectDB();
        process.exit(0);
    });
}
exports.default = connectDB;
