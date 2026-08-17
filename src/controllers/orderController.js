const PDFDocument = require('pdfkit');
const path = require('path');
const { Order, OrderMenu } = require('../models');
const { publishEvent } = require('../config/rabbitmq');

const MENU_SERVICE_URL =
  process.env.MENU_SERVICE_URL || 'http://localhost:3002';

async function getOwnedOrder(orderId, userId) {
  return Order.findOne({
    where: {
      id: orderId,
      UserId: userId
    },
    include: [OrderMenu]
  });
}

class OrderController {
  static async getOrders(req, res) {
    try {
      const orders = await Order.findAll({
        where: {
          UserId: req.user.id
        },
        include: [
          {
            model: OrderMenu
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json(orders);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: 'Failed to get orders'
      });
    }
  }

  static async postOrder(req, res) {
    try {
      const { menuId } = req.params;

      // sementara untuk testing microservice
      const UserId = req.user.id;

      // Ambil menu dari Menu Service
      const response = await fetch(
        `${MENU_SERVICE_URL}/menus/${menuId}`
      );

      if (!response.ok) {
        return res.status(404).json({
          message: 'Menu tidak ditemukan'
        });
      }

      const menu = await response.json();

      const order = await Order.create({
        UserId,
        statusOrder: 'active'
      });

      await OrderMenu.create({
        OrderId: order.id,
        MenuId: menu.id,
        quantity: 1,
        priceAtOrder: menu.price
      });

      const result = await Order.findByPk(order.id, {
        include: [OrderMenu]
      });

      await publishEvent('order.created', {
        orderId: result.id,
        userId: result.UserId,
        statusOrder: result.statusOrder,
        items: result.OrderMenus.map((item) => ({
          menuId: item.MenuId,
          quantity: item.quantity,
          priceAtOrder: item.priceAtOrder
        }))
      });

      res.status(201).json(result);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: 'Failed to create order'
      });
    }
  }

  static async handlerEdit(req, res) {
    try {
      const { menuId } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          message: 'Quantity harus lebih dari 0'
        });
      }

      const orderMenu = await OrderMenu.findByPk(menuId, {
        include: [Order]
      });

      if (!orderMenu) {
        return res.status(404).json({
          message: 'Item order tidak ditemukan'
        });
      }

      if (orderMenu.Order.UserId !== req.user.id) {
        return res.status(403).json({
          message: 'Forbidden'
        });
      }

      await orderMenu.update({
        quantity: Number(quantity)
      });

      res.json({
        message: 'Quantity updated',
        orderMenu
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: 'Failed to update order'
      });
    }
  }

  static async handlerDelete(req, res) {
    try {
      const { menuId } = req.params;

      const orderMenu = await OrderMenu.findByPk(menuId, {
        include: [Order]
      });

      if (!orderMenu) {
        return res.status(404).json({
          message: 'Item order tidak ditemukan'
        });
      }
      if (orderMenu.Order.UserId !== req.user.id) {
        return res.status(403).json({
          message: 'Forbidden'
        });
      }

      const orderId = orderMenu.OrderId;

      await orderMenu.destroy();

      const count = await OrderMenu.count({
        where: {
          OrderId: orderId
        }
      });

      if (count === 0) {
        await Order.destroy({
          where: {
            id: orderId
          }
        });
      }

      res.json({
        message: 'Item berhasil dihapus'
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: 'Failed to delete order item'
      });
    }
  }

  static async payOrder(req, res) {
    try {
      const { orderId } = req.params;

      const order = await getOwnedOrder(
        orderId,
        req.user.id
      );

      if (!order) {
        return res.status(404).json({
          message: 'Order tidak ditemukan'
        });
      }

      if (order.statusOrder === 'completed') {
        return res.status(400).json({
          message: 'Order sudah dibayar'
        });
      }

      await order.update({
        statusOrder: 'completed'
      });

      res.json({
        message: 'Order berhasil dibayar',
        order
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: 'Failed to pay order'
      });
    }
  }

  static async downloadPdf(req, res) {
    try {
      const { orderId } = req.params;

      const order = await getOwnedOrder(
        orderId,
        req.user.id
      );

      if (!order) {
        return res.status(404).json({
          message: 'Order tidak ditemukan'
        });
      }

      const doc = new PDFDocument();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="order_${orderId}.pdf"`
      );

      doc.pipe(res);

      doc
        .fontSize(20)
        .text('ORDER DETAIL', { align: 'center' });

      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Order ID    : ${order.id}`);
      doc.text(`User ID     : ${order.UserId}`);
      doc.text(`Status      : ${order.statusOrder}`);
      doc.text(`Tanggal     : ${order.createdAt}`);

      doc.moveDown();

      doc.text('Order Items');
      doc.moveDown();

      let total = 0;

      order.OrderMenus.forEach((item, index) => {
        const subtotal = item.quantity * item.priceAtOrder;
        total += subtotal;

        doc.text(
          `${index + 1}. Menu ID: ${item.MenuId}`
        );
        doc.text(
          `   Quantity: ${item.quantity}`
        );
        doc.text(
          `   Harga: Rp ${item.priceAtOrder}`
        );
        doc.text(
          `   Subtotal: Rp ${subtotal}`
        );

        doc.moveDown();
      });

      doc
        .fontSize(14)
        .text(`TOTAL: Rp ${total}`);

      doc.end();

    } catch (error) {
      console.error(error);

      if (!res.headersSent) {
        return res.status(500).json({
          message: 'Failed to generate PDF'
        });
      }
    }
  }

  static async getAdminOrders(req, res) {
    try {
      const orders = await Order.findAll({
        include: [
          {
            model: OrderMenu
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json(orders);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: 'Failed to get admin orders'
      });
    }
  }
}

module.exports = OrderController;