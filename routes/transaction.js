const { Router } = require('express');
const { ppePaymentRequest } = require('../controllers/transaction');

const router = Router();

//POST
router.post('/payment', ppePaymentRequest);

module.exports = router;
