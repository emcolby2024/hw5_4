// user schema
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  user_name: { type: String, required: true, unique: true }, // Modified user_name field to be unique
  password: { type: String, required: true }, // Added password field
  balance: { type: Number, default: 100 },
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});

userSchema.set('toObject', { virtuals: true }); // Added line to retain virtual fields

module.exports = mongoose.model('User', userSchema);

