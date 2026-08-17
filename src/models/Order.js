'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.hasMany(models.OrderMenu, {
        foreignKey: 'OrderId'
      });
    }
  }

  Order.init(
    {
      statusOrder: DataTypes.STRING,
      UserId: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'Order'
    }
  );

  return Order;
};