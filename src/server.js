require('dotenv').config();

const app = require('./app');
const sequelize = require('./config/database');

require('./models');

const PORT = process.env.PORT || 3003;

async function startServer() {
  try {
    await sequelize.authenticate();

    console.log('Order Service database connected');

    await sequelize.sync();

    console.log('Order Service database synced');

    app.listen(PORT, () => {
      console.log(`Order Service ready on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start Order Service:', error);
    process.exit(1);
  }
}

startServer();