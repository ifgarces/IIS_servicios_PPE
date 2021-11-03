const { response } = require('express');
const Pool = require('pg').Pool;
require('log-timestamp');

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
		res.status(400).json({
			msg: 'One of the following parameters are missing: id_persona, numero_repertorio, monto'
		});
	} else {
		pool
			.query(
				'SELECT folio FROM TransaccionTGR ORDER BY folio DESC LIMIT 1'
			)
			.then(results => {
				new_folio = results.rows[0].folio + 1;
				
				pool
					.query(
						'INSERT INTO TransaccionTGR (folio,id_persona,numero_repertorio,timestamp_recepcion,monto,estado_transaccion,fecha_aprobacion,ingreso,estado_TGR) VALUES (cast((SELECT folio FROM TransaccionTGR ORDER BY folio DESC LIMIT 1) as INT)+1,$1,$2,$3,$4,$5,$6,$7,$8)',
						[
							id_persona,
							numero_repertorio,
							getCurrentServerTimestamp(),
							monto,
							'ingresado',
							null,
							true,
							'esperando'
						]
					)
					.then((results) => {
						console.log('[ppePaymentRequest] Monto Ingresado');
						res.status(200).json({
							msg: 'Pago Ingresado',
							t_id: new_folio
						});
					})
					.catch((error) => {
						console.error(`[ppePaymentRequest] Error for request ${req}: ${error}`);
						res.status(500).json({
							msg: `Internal Server Error ${error}`
						});
					});
			})
			.catch((error) => {
				console.error(`[ppePaymentRequest] Error for request ${req}: ${error}`);
				res.status(500).json({
					msg: `Internal Server Error ${error}`
				});
			});
		}
};

/**
 ** This is wrong, see the PPE API documentation.
 */
// const ppePaymentConfirmation = (req, res = response) => {
// 	const nro_repertorio = req.body.nro_repertorio;

// 	if (!nro_repertorio) {
// 		res.status(401).json({
// 			msg: 'Es necesario el numero de repertorio.',
// 		});
// 	} else {
// 		pool
// 			.query(
// 				`SELECT estado_TGR FROM TransaccionTGR WHERE numero_repertorio = $1`,
// 				[nro_repertorio],
// 			)
// 			.then((results) => {
// 				if (results.rowCount == 0) {
// 					// transaccion no existe
// 					console.log(
// 						`[ppePaymentConfirmation] POST ---  transaccion NO existe`,
// 					);
// 					res.status(200).json({
// 						valid: false,
// 					});
// 					return;
// 				}
// 				console.log(`[ppePaymentConfirmation] POST --- transaccion SI existe`);
// 				let status = results.rows[0];
// 				res.status(200).json({
// 					valid: true,
// 					msg: status,
// 				});
// 			});
// 	}
// };

/**
 ** Won't be implemented, unless the client changes his mind.
 */
// const ppeRefundRequest = (req, res = response) => {
// 	const { persona_id, nro_repertorio, monto } = req.body;

// 	if (!persona_id || !nro_repertorio || !monto) {
// 		res.status(418).json({
// 			msg: 'Missing data in the request body (persona_id , nro_repertorio, monto).',
// 		});
// 	}
// 	//TODO
// 	res.status(200).json({
// 		msg: `Refund state TODO`,
// 	});
// };

module.exports = {
	ppePaymentRequest,
	//// ppeRefundRequest,
	//// ppePaymentConfirmation,
};
