const express = require('express');
const OrderController = require('../controllers/orderController');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', authenticate, isAdmin, OrderController.getAdminOrders);

router.get('/', authenticate, OrderController.getOrders);
router.post('/:menuId', authenticate, OrderController.postOrder);
router.post('/:menuId/edit', authenticate, OrderController.handlerEdit);
router.post('/:menuId/delete', authenticate, OrderController.handlerDelete);
router.post('/:orderId/pay', authenticate, OrderController.payOrder);
router.get('/:orderId/pdf', authenticate, OrderController.downloadPdf);

module.exports = router;