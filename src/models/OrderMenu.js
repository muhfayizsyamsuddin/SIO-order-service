'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrderMenu extends Model {
    static associate(models) {
      OrderMenu.belongsTo(models.Order, {
        foreignKey: 'OrderId'
      });
    }
  }

  OrderMenu.init(
    {
      quantity: DataTypes.INTEGER,
      priceAtOrder: DataTypes.INTEGER,
      OrderId: DataTypes.INTEGER,
      MenuId: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'OrderMenu'
    }
  );

  return OrderMenu;
};