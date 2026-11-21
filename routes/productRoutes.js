const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockReport,
  getInventorySummary,
} = require('../controllers/productController');

const router = express.Router();

// Specific report routes must come before parameterized :id routes
router.get('/low-stock', getLowStockReport);
router.get('/summary', getInventorySummary);

router.route('/')
  .get(getProducts)
  .post(createProduct);

router.route('/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

router.patch('/:id/stock', adjustStock);

module.exports = router;