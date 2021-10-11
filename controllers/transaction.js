const { response } = require('express');
const Pool = require('pg').Pool;

const pool = new Pool({
	user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDB,
	password: process.env.DBPASSWORD,
	port: process.env.PGPORT,
});

const ppePaymentRequest = (req, res = response) => {
	const { persona_id, nro_repertorio, monto } = req.body;

	if (!persona_id || !nro_repertorio || !monto) {
		res.status(418).json({
			msg: 'Missing data in the request body (persona_id , nro_repertorio, monto).',
		});
	}
	//TODO
	res.status(200).json({
		msg: `Payment state TODO`,
	});
};

const ppeRefundRequest = (req, res = response) => {
	const { persona_id, nro_repertorio, monto } = req.body;

	if (!persona_id || !nro_repertorio || !monto) {
		res.status(418).json({
			msg: 'Missing data in the request body (persona_id , nro_repertorio, monto).',
		});
	}
	//TODO
	res.status(200).json({
		msg: `Refund state TODO`,
	});
};

const ppePaymentConfirmation = (req, res = response) => {
	const nro_repertorio = req.query.nro_repertorio;

	if (!nro_repertorio) {
		res.status(401).json({
			msg: 'Es necesario el numero de repertorio.',
		});
	}
	//TODO
	res.status(200).json({
		msg: `Estado de la solicitud TODO`,
	});
};

module.exports = {
	ppePaymentRequest,
	ppeRefundRequest,
	ppePaymentConfirmation,
};
