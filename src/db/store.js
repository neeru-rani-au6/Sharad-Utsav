import * as memory from './memory.js';
import * as neon from './neon.js';

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function storageMode() {
  return hasDatabaseUrl() ? 'neon' : 'memory';
}

export async function getStockMap() {
  return hasDatabaseUrl() ? neon.neonGetStockMap() : memory.memoryGetStockMap();
}

export async function getPromo(code) {
  return hasDatabaseUrl() ? neon.neonGetPromo(code) : memory.memoryGetPromo(code);
}

export async function getBooking(id) {
  return hasDatabaseUrl() ? neon.neonGetBooking(id) : memory.memoryGetBooking(id);
}

export async function findByIdempotency(key) {
  return hasDatabaseUrl()
    ? neon.neonFindByIdempotency(key)
    : memory.memoryFindByIdempotency(key);
}

export async function createBooking(payload) {
  return hasDatabaseUrl()
    ? neon.neonCreateBooking(payload)
    : memory.memoryCreateBooking(payload);
}
