const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const User = require('../models/user');

// Define a route handler for POST requests /
router.post('/', async (req, res) => {
  try {
    // Ensure user is logged in
    if (!req.session.user_id) {
      return res.status(401).json({ error: 'Unauthorized. Please log in' });
    }

    const { name, price } = req.body;
    const owner = req.session.user_id;

    // Create a new product with the provided data
    const product = await Product.create({ name, price, owner });

    // Send a JSON response containing the created product
    res.json(product);
  } catch (err) {
    // If an error occurs during the creation process, send a 400 status response with the error message
    res.status(400).json({ error: err.message });
  }
});

// GET /products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({}, { owner: 0 });
    res.json(products);
    //Returns all products
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /products/:id
router.delete('/:id', async (req, res) => {
  try {
    // Ensure user is logged in
    if (!req.session.user_id) {
      return res.status(401).json({ error: 'Unauthorized. Please log in' });
    }

    // Find the product by id
    const product = await Product.findById(req.params.id);

    // If product not found, return 404
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if the user is the owner of the product
    if (product.owner.toString() !== req.session.user_id) {
      return res.status(403).json({ error: 'You are not authorized to perform this operation' });
    }

    // Delete the product
    await product.remove();

    // Send success message
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    // If an error occurs during the deletion process, send a 500 status response with the error message
    res.status(500).json({ error: err.message });
  }
});

// POST /products/buy route
router.post('/buy', async (req, res) => {
  try {
    // Ensure user is logged in
    if (!req.session.user_id) {
      return res.status(401).json({ error: 'Unauthorized. Please log in' });
    }

    const { productID } = req.body;
    const buyer_id = req.session.user_id;

    // Find the product
    const product = await Product.findById(productID);

    // If product not found, return 404
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find the buyer
    const buyer = await User.findById(buyer_id);

    // Check if buyer exists
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    // Check if buyer already owns the product
    if (product.owner.toString() === buyer_id) {
      return res.json({ msg: `Oops, ${buyer.user_name} already owns this item` });
    }

    // Check if buyer has sufficient funds
    if (buyer.balance < product.price) {
      return res.json({ msg: `Oops, ${buyer.user_name} has insufficient funds` });
    }

    // Deduct the price from buyer's balance and add it to owner's balance
    buyer.balance -= product.price;
    const owner = await User.findById(product.owner);
    owner.balance += product.price;

    // Change ownership of the product
    product.owner = buyer_id;

    // Save changes
    await Promise.all([buyer.save(), owner.save(), product.save()]);

    // Send success message
    res.json({ msg: 'Transaction successful!' });
  } catch (err) {
    // If an error occurs during the buy process, send a 500 status response with the error message
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
