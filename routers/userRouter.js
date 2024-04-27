const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Product = require('../models/product');

// Middleware function to hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// POST /users/register
router.post('/register', async (req, res) => {
  try {
    const { name, user_name, password } = req.body;
    
    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create a new user with hashed password
    const user = await User.create({
      name,
      user_name,
      password: hashedPassword,
      balance: req.body.balance || 100 // Default balance to 100 if not provided
    });

    // Remove password from user object before sending response
    user.password = undefined;

    // Send response with created user
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /users/login
router.post('/login', async (req, res) => {
  try {
    const { user_name, password } = req.body;

    // Find user by username
    const user = await User.findOne({ user_name });

    // If user not found or password incorrect, return error
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Error logging in. Incorrect username/password" });
    }

    // Set user_id session variable
    req.session.user_id = user._id;

    // Send success message
    res.json({ message: `Successfully logged in. Welcome ${user.name}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Middleware function to authenticate user
const authenticateUser = async (req, res, next) => {
  if (req.session.user_id) {
    try {
      // Find user by session user_id
      const user = await User.findById(req.session.user_id);

      // Attach user document to request object
      req.user = user;

      // Proceed to next middleware or route
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(401).json({ message: "This page requires you to be logged in" });
  }
};

// GET /users/me
router.get('/me', authenticateUser, async (req, res) => {
  try {
    // Find items owned by the user
    const items = await Product.find({ owner: req.user._id });

    // Construct user details with items
    const userDetails = {
      _id: req.user._id,
      name: req.user.name,
      user_name: req.user.user_name,
      balance: req.user.balance,
      items: items
    };

    // Send user details
    res.json(userDetails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users/logout
router.post('/logout', authenticateUser, (req, res) => {
  // Destroy session and send success message
  req.session.destroy(err => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: `Successfully logged out ${req.user.name}` });
    }
  });
});

// DELETE /users/me
router.delete('/me', authenticateUser, async (req, res) => {
  try {
    // Delete user and associated products
    await User.findByIdAndDelete(req.user._id);
    await Product.deleteMany({ owner: req.user._id });

    // Destroy session
    req.session.destroy(err => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: `User deleted successfully` });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
