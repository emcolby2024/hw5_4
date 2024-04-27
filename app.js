const express = require('express');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const userRouter = require('./routers/userRouter');
const productRouter = require('./routers/productRouter');
const User = require('./models/user');
const Product = require('./models/product');
const dotenv = require('dotenv') 
dotenv.config()

const app = express();

app.listen(process.env.PORT);

const url = process.env.MONGOURL

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Configure session middleware
app.use(session({
  secret: process.env.SESSIONKEY,
  resave: false,
  saveUninitialized: false,
  //store:MongoStore.create({mongoURL:url})
}));

app.use('/users', userRouter);
app.use('/products', productRouter);

//const url = "mongodb+srv://emcolby:test1234@cluster3.2ohuwuj.mongodb.net/hw5?retryWrites=true&w=majority";
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Successfully connected to DB.."))
  .catch(err => console.error("Error connecting to DB:", err));

// Define a route handler for GET requests to /summary
app.get('/summary', async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user_id) {
      return res.status(401).json({ error: 'Unauthorized. Please log in' });
    }

    // Retrieve all users from the database
    const users = await User.find();

    // Retrieve items for each user in parallel
    const usersWithItems = await Promise.all(users.map(async (user) => {
      // Find all products/items associated with the current user
      const items = await Product.find({ owner: user._id });

      // Return an object containing user details along with their items
      return {
        _id: user._id, // User ID
        name: user.name, // User's name
        user_name: user.user_name, // User's username
        balance: user.balance, // User's balance
        items: items.map(item => ({
          _id: item._id, // Item ID
          name: item.name, // Item name
          price: item.price // Item price
        }))
      };
    }));

    // Send the response containing the summary information
    res.json(usersWithItems);
  } catch (err) {
    // If an error occurs, send a 500 status response with the error message
    res.status(500).json({ error: err.message });
  }
});
