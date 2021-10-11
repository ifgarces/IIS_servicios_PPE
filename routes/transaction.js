const { Router } = require('express');
const {
	ppePaymentRequest,
	ppeRefundRequest,
} = require('../controllers/transaction');

const router = Router();

router.post('/payment', ppePaymentRequest);
router.post('/refund', ppeRefundRequest);

module.exports = router;
