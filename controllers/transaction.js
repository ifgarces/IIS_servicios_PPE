const { response } = require('express');
const Pool = require('pg').Pool;

const pool = new Pool({
	user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDB,
	password: process.env.DBPASSWORD,
	port: process.env.PGPORT,
});

/**
 * Source: https://gist.github.com/jczaplew/f055788bf851d0840f50#gistcomment-3237674
 * @returns {string} The current server datetime, converted to SQL timestamp format.
 */
function getCurrentServerTimestamp() {
	return new Date(Date.now() + 1000 * 60 * -new Date().getTimezoneOffset())
		.toISOString()
		.replace('T', ' ')
		.replace('Z', '');
}

const ppePaymentRequest = (req, res = response) => {
	const { id_persona, numero_repertorio, monto } = req.body;

	if (!id_persona || !numero_repertorio || !monto) {
		res.status(418).json({
			msg: 'Missing data in the request body (persona_id , nro_repertorio, monto).',
		});
	} else {
		pool
			.query(
				'INSERT INTO TransaccionTGR (folio,id_persona,numero_repertorio,timestamp_recepcion,monto,estado_transaccion,fecha_aprobacion,ingreso,estado_TGR) VALUES (cast((SELECT folio FROM TransaccionTGR ORDER BY folio DESC LIMIT 1) as INT)+1,$1,$2,$3,true)',
				[
					id_persona,
					numero_repertorio,
					getCurrentServerTimestamp(),
					monto,
					'ingresado',
					null,
					true,
					'esperando',
				],
			)
			.then((results) => {
				console.log('Monto Ingresado');
				res.status(200).json({
					msg: 'Pago Ingresado',
				});
			})
			.catch((error) => {
				console.error(`Error on ppePaymentRequest call: ${error}`);
				res.status(500).json({
					msg: 'Internal Server Error',
				});
			});
	}
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
