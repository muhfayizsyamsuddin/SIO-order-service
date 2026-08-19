const express = require('express');
const cors = require('cors');
const orderRouter = require('./routers/order');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.json({
    message: 'Order Service is running'
  });
});

app.use('/orders', orderRouter);

module.exports = app;