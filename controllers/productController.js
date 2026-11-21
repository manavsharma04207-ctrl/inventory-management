const Product = require('../models/Product');

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const { category, search, sortBy, order = 'asc', page = 1, limit = 10 } = req.query;

    let query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let queryExec = Product.find(query);

    // Sorting
    if (sortBy) {
      const sortOrder = order === 'desc' ? -1 : 1;
      queryExec = queryExec.sort({ [sortBy]: sortOrder });
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await queryExec.skip(skip).limit(limitNum);

    res.status(200).json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      count: products.length,
      products,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
};

// @desc    Create new product
// @route   POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

// @desc    Update product details
// @route   PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({
      message: 'Product deleted',
      id: product._id,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Adjust stock level (increment/decrement)
// @route   PATCH /api/products/:id/stock
exports.adjustStock = async (req, res, next) => {
  try {
    const { change } = req.body; // e.g. +10 or -5
    if (typeof change !== 'number') {
      return res.status(400).json({ message: 'Stock change value must be a number' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newQuantity = product.quantity + change;
    if (newQuantity < 0) {
      return res.status(400).json({ message: 'Insufficient stock for this operation' });
    }

    product.quantity = newQuantity;
    await product.save();

    res.status(200).json({
      message: 'Stock updated',
      product,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get low-stock alert report
// @route   GET /api/products/low-stock
exports.getLowStockReport = async (req, res, next) => {
  try {
    // Find products where quantity <= reorderLevel
    const lowStockItems = await Product.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
    });

    res.status(200).json({
      count: lowStockItems.length,
      lowStockItems,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get category-wise inventory summary using Aggregation Pipeline
// @route   GET /api/products/summary
exports.getInventorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $avg: '$price' },
        },
      },
      {
        $project: {
          id: '$_id',
          _id: 0,
          totalItems: 1,
          totalQuantity: 1,
          totalStockValue: 1,
          avgPrice: 1,
        },
      },
    ]);

    res.status(200).json({
      categories: summary.length,
      summary,
    });
  } catch (err) {
    next(err);
  }
};