// components/dashboard/product/ProductManagement.js
import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Package,
  Tag,
  Image,
  Check,
  AlertTriangle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import UpsertProductModal from '../../components/dashboard/product/UpsertProductModal';
import DeleteProductModal from '../../components/dashboard/product/DeleteProductModal';
import productService from '../../services/productService';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';

const ProductManagement = ({ role }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const navigate = useNavigate();
  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Filter products
  useEffect(() => {
    const filtered = products.filter((product) =>
      product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchTerm, products]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await productService.getAllProducts();
      const fetchedProducts = response.products || response || [];
      setProducts(fetchedProducts);
      setFilteredProducts(fetchedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      showNotification('Failed to load products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsAddModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleDeleteProduct = (product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleViewProduct = (product) => {
    if (!product.id) return;
    const path = role === 'admin'
      ? `/admin/dashboard/product/${product.id}`
      : `/employee/dashboard/product/${product.id}`;
    navigate(path);
  };

  // Create product
  const handleProductSubmit = async (productData) => {
    setIsLoading(true);
    try {
      if (role === 'admin') productData.adminId = adminData.id;
      if (role === 'employee') productData.employeeId = employeeData.id;

      const response = await productService.createProduct(productData);
      const newProduct = response.product;

      setProducts((prev) => [newProduct, ...prev]);
      showNotification('Product added successfully!');
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding product:', error);
      showNotification(`Failed to add product: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Update product
  const handleUpdateProduct = async (productData) => {
    setIsLoading(true);
    try {
      if (role === 'admin') productData.adminId = adminData.id;
      if (role === 'employee') productData.employeeId = employeeData.id;

      const response = await productService.updateProduct(selectedProduct.id, productData);
      const updatedProduct = response.product;

      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? updatedProduct : p))
      );

      showNotification('Product updated successfully!');
      setIsEditModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      showNotification(`Failed to update product: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete product
  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      await productService.deleteProduct(selectedProduct.id);

      setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
      showNotification('Product deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      showNotification(`Failed to delete product: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredProducts.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <p className="text-sm text-gray-600">
        Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} entries
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${
              currentPage === 1
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          {getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                currentPage === page
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${
              currentPage === totalPages
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const getFirstImage = (imageUrls) => {
    if (!imageUrls || imageUrls.length === 0) return null;
    return productService.getFullImageUrl(imageUrls[0]);
  };

  const parseDescription = (description) => {
    if (!description) return '';
    try {
      if (productService.parseDescription) return productService.parseDescription(description);
      const parsed = typeof description === 'string' ? JSON.parse(description) : description;
      return parsed.details || (typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
    } catch {
      return description;
    }
  };

  const CardView = () => (
    <div className="md:hidden space-y-6">
      {currentItems.map((product) => (
        <div
          key={product.id}
          className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getFirstImage(product.imageUrls) ? (
                  <img
                    src={getFirstImage(product.imageUrls)}
                    alt={product.productName}
                    className="w-12 h-12 object-cover rounded-lg shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                    <Package size={24} />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 truncate">{product.productName || 'Unnamed Product'}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Available</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleViewProduct(product)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                  <Eye size={16} />
                </button>
                <button onClick={() => handleEditProduct(product)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDeleteProduct(product)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Tag size={14} /> {product.brand || 'No brand'}</div>
              <div className="flex items-center gap-2"><Package size={14} /> {product.category?.name || 'No category'}</div>
              <div className="flex items-center gap-2"><Image size={14} /> {product.imageUrls?.length || 0} image(s)</div>
            </div>
            {product.description && (
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-700 mb-1">Description</div>
                <div
                  className="text-sm text-gray-600 line-clamp-2 prose prose-sm"
                  dangerouslySetInnerHTML={{ __html: parseDescription(product.description) }}
                />
              </div>
            )}
            <div className="pt-4 border-t border-gray-100 mt-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={12} />
                <span>Added {formatDate(product.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <PaginationComponent />
      </div>
    </div>
  );

  const TableView = () => (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((product, idx) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {startIndex + idx + 1}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {getFirstImage(product.imageUrls) ? (
                      <img src={getFirstImage(product.imageUrls)} alt={product.productName} className="w-10 h-10 object-cover rounded-lg shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white">
                        <Package size={16} />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{product.productName || 'Unnamed'}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div> Available
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{product.brand || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{product.category?.name || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{product.imageUrls?.length || 0}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(product.createdAt)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleViewProduct(product)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleEditProduct(product)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDeleteProduct(product)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationComponent />
    </div>
  );

  return (
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } animate-in slide-in-from-top-2 duration-300`}
        >
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="h-full overflow-y-auto mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-600 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            </div>
          </div>
          <p className="text-gray-600">Manage your product catalog and inventory</p>
        </div>

        {/* Search & Add */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <button
              onClick={handleAddProduct}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} />
              Add Product
            </button>
          </div>
        </div>

        {/* Products List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first product.'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddProduct}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Add Product
              </button>
            )}
          </div>
        ) : (
          <>
            <CardView />
            <TableView />
          </>
        )}
      </div>

      {/* Modals */}
      <UpsertProductModal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedProduct(null);
        }}
        onSubmit={isEditModalOpen ? handleUpdateProduct : handleProductSubmit}
        product={selectedProduct}
        isLoading={isLoading}
        title={isEditModalOpen ? 'Edit Product' : 'Add New Product'}
      />

      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleConfirmDelete}
        product={selectedProduct}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ProductManagement;