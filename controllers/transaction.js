const { response } = require('express');
const Pool = require('pg').Pool;

const pool = new Pool({
	user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDB,
	password: process.env.DBPASSWORD,
	port: process.env.PGPORT,
});

// const pool = new Pool({
//     user: "desarrollogrupo3",
//     host: "grupo3-servicios.cxi5sdqvpga8.us-east-1.rds.amazonaws.com",
//     database: "postgres",
//     password: "QTBYUMWJ2aNcHt2",
//     port: 5432
// });

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

module.exports = { ppePaymentRequest, ppeRefundRequest };
