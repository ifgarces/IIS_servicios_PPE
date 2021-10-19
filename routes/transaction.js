const { Router } = require('express');
const {
	ppePaymentRequest,
	ppeRefundRequest,
	ppePaymentConfirmation,
} = require('../controllers/transaction');

const router = Router();

//POST
router.post('/payment', ppePaymentRequest);
router.post('/refund', ppeRefundRequest);
//GET
router.get('/confirmation', ppePaymentConfirmation);

module.exports = router;