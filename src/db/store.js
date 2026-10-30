import * as memory from './memory.js';
import * as mongo from './mongo.js';

function hasMongo() {
  const uri = String(process.env.MONGODB_URI || '').trim();
  return uri.length > 0;
}

export function storageMode() {
  return hasMongo() ? 'mongo' : 'memory';
}

export async function getStockMap() {
  return hasMongo() ? mongo.mongoGetStockMap() : memory.memoryGetStockMap();
}

export async function getPromo(code) {
  return hasMongo() ? mongo.mongoGetPromo(code) : memory.memoryGetPromo(code);
}

export async function getBooking(id) {
  return hasMongo() ? mongo.mongoGetBooking(id) : memory.memoryGetBooking(id);
}

export async function listBookings() {
  return hasMongo() ? mongo.mongoListBookings() : memory.memoryListBookings();
}

export async function findByIdempotency(key) {
  return hasMongo()
    ? mongo.mongoFindByIdempotency(key)
    : memory.memoryFindByIdempotency(key);
}

export async function createBooking(payload) {
  return hasMongo()
    ? mongo.mongoCreateBooking(payload)
    : memory.memoryCreateBooking(payload);
}
