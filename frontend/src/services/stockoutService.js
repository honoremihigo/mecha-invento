import api, { API_URL } from '../api/api';

/**
 * StockOut Service for Frontend
 * Fully synchronized with backend bulk transaction + soldPrice requirement
 */
class StockOutService {
  /**
   * Create a single stock-out entry (converted to bulk format)
   * soldPrice is now REQUIRED per item
   */
  async createStockOut(stockOutData) {
    try {
      if (!stockOutData.stockinId || !stockOutData.quantity || stockOutData.soldPrice == null) {
        throw new Error('Stock-in ID, quantity, and sold price are required');
      }

      const requestData = {
        sales: [
          {
            stockinId: stockOutData.stockinId,
            quantity: Number(stockOutData.quantity),
            soldPrice: Number(stockOutData.soldPrice), // REQUIRED by backend
          },
        ],
        clientName: stockOutData.clientName || undefined,
        clientEmail: stockOutData.clientEmail || undefined,
        clientPhone: stockOutData.clientPhone || undefined,
        paymentMethod: stockOutData.paymentMethod || undefined,
        adminId: stockOutData.adminId || undefined,
        employeeId: stockOutData.employeeId || undefined,
      };

      const response = await api.post('/stockout/create', requestData);
      return response.data;
    } catch (error) {
      console.error('Error creating stock-out:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to create stock-out'
      );
    }
  }

  /**
   * Create multiple stock-out entries in one transaction
   * Each sale MUST include soldPrice
   */
  async createMultipleStockOut(salesArray, clientInfo = {}, userInfo = {}) {
    try {
      if (!Array.isArray(salesArray) || salesArray.length === 0) {
        throw new Error('At least one sale is required');
      }

      const formattedSales = salesArray.map((sale, index) => {
        if (!sale.stockinId || sale.quantity == null || sale.soldPrice == null) {
          throw new Error(
            `Sale at index ${index}: stockinId, quantity, and soldPrice are required`
          );
        }
        return {
          stockinId: sale.stockinId,
          quantity: Number(sale.quantity),
          soldPrice: Number(sale.soldPrice),
        };
      });

      const requestData = {
        sales: formattedSales,
        clientName: clientInfo.clientName || undefined,
        clientEmail: clientInfo.clientEmail || undefined,
        clientPhone: clientInfo.clientPhone || undefined,
        paymentMethod: clientInfo.paymentMethod || undefined,
        adminId: userInfo.adminId || undefined,
        employeeId: userInfo.employeeId || undefined,
      };

      const response = await api.post('/stockout/create', requestData);
      return response.data;
    } catch (error) {
      console.error('Error creating multiple stock-out:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to create multiple stock-out'
      );
    }
  }

  async getAllStockOuts() {
    try {
      const response = await api.get('/stockout/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching all stock-outs:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch stock-outs');
    }
  }

  async getStockOutById(id) {
    try {
      if (!id) throw new Error('Stock-out ID is required');
      const response = await api.get(`/stockout/getone/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stock-out by ID:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch stock-out');
    }
  }

  async getStockOutByTransactionId(transactionId) {
    try {
      if (!transactionId) throw new Error('Transaction ID is required');
      const response = await api.get(`/stockout/transaction/${transactionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching by transaction ID:', error);
      throw new Error(
        error.response?.data?.message ||
          'Failed to fetch stock-out by transaction ID'
      );
    }
  }

  async updateStockOut(id, updateData) {
    try {
      if (!id) throw new Error('Stock-out ID is required');
      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('Update data is required');
      }

      const formattedData = { ...updateData };
      if (updateData.quantity !== undefined) formattedData.quantity = Number(updateData.quantity);
      if (updateData.soldPrice !== undefined) formattedData.soldPrice = Number(updateData.soldPrice);

      const response = await api.put(`/stockout/update/${id}`, formattedData);
      return response.data;
    } catch (error) {
      console.error('Error updating stock-out:', error);
      throw new Error(error.response?.data?.message || 'Failed to update stock-out');
    }
  }

  // Fixed: Removed nested try block
  async deleteStockOut(id, userData = {}) {
    try {
      if (!id) throw new Error('Stock-out ID is required');

      const response = await api.delete(`/stockout/delete/${id}`, {
        data: userData, // Axios DELETE with body
      });

      return response.data;
    } catch (error) {
      console.error('Error deleting stock-out:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete stock-out');
    }
  }

  // Helper: Generate barcode image URL
  getBarCodeUrlImage(code) {
    if (!code) return null;
    return `${API_URL}/uploads/barcodes/${code}.png`;
  }

  // Validation helper
  validateStockOutData(stockOutData) {
    const errors = [];
    if (!stockOutData.stockinId) errors.push('Stock-in ID is required');
    if (stockOutData.quantity == null || stockOutData.quantity <= 0)
      errors.push('Valid quantity is required');
    if (stockOutData.soldPrice == null) errors.push('Sold price is required');
    if (stockOutData.clientEmail && !this.isValidEmail(stockOutData.clientEmail))
      errors.push('Invalid email format');

    if (errors.length > 0) throw new Error(errors.join(', '));
    return true;
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  calculateTotalAmount(sales) {
    return sales.reduce((sum, item) => sum + item.quantity * item.soldPrice, 0);
  }
}

// Singleton instance
const stockOutService = new StockOutService();
export default stockOutService;
export { StockOutService };