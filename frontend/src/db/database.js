import Dexie from 'dexie';

export class AppDatabase extends Dexie {
  constructor() {
    super('AppDatabase');
    
    this.version(4).stores({
      categories: '++localId, id, name, description, createdAt, updatedAt, synced, lastModified, adminId, employeeId',
      deletedCategories: 'id, deletedAt, adminId, employeeId',
      products: '++localId, id, productName, brand, categoryId, description, createdAt, updatedAt, synced, lastModified, adminId, employeeId',
      deletedProducts: 'id, deletedAt, adminId, employeeId',
      images: '++localId, entityLocalId, entityId, entityType, imageData, synced, from, createdAt, updatedAt',
      syncQueue: '++id, action, table, data, timestamp'
    });

    this.categories = this.table('categories');
    this.deletedCategories = this.table('deletedCategories');
    this.products = this.table('products');
    this.deletedProducts = this.table('deletedProducts');
    this.images = this.table('images');
    this.syncQueue = this.table('syncQueue');
  }
}

export const db = new AppDatabase();