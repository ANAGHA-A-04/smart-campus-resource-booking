import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './environment.js';

// Resolve MongoDB Atlas SRV records reliably on Windows/local networks
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}
dns.setServers(['8.8.8.8', '1.1.1.1']);

let isConnected = false;

export async function connectDatabase() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('💡 TIP: If using MongoDB Atlas, make sure your current IP address is whitelisted in MongoDB Atlas Network Access (or add 0.0.0.0/0 for anywhere access).');
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('✅ MongoDB reconnected');
});
