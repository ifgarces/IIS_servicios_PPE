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

/**
 * @param {string} repertorie_id A repertorie ID to check.
 * @returns {boolean} Whether the given string matches the repertorie ID format "YEAR-NUMBER" or not.
 */
function checkRepertorieIdFormat(repertorie_id) {
	const numericalRegex = new RegExp('^[0-9]+$'); // regex to tell if a string has only digits on it
	let spltId = repertorie_id.split("-"); // don't know how to use a single regex for all of this
	return spltId.length == 2 &&
		spltId[0].length == 4 &&
		spltId[1].length > 0 &&
		spltId[1].length <= 6 &&
		numericalRegex.test(spltId[0]) &&
		numericalRegex.test(spltId[1]);
}

/**
 * API endpoint that registers a transaction attempt in the database and returns the ID of that
 * transaction. Also starts the asynchronous simulated TGR confirmation for that transaction.
 */
const ppePaymentRequest = (req, res = response) => {
	const { id_persona, numero_repertorio, monto } = req.body;

	if (!id_persona || !numero_repertorio || !monto) {
		res.status(400).json({
			msg: "One of the following parameters are missing: id_persona, numero_repertorio, monto"
		});
		return;
	}
	if (! checkRepertorieIdFormat(numero_repertorio)) {
		res.status(400).json({
			msg: "Invalid format for the param numero_repertorio. Must match 'YEAR-number' with a maximum total lenght of 11 characters"
		});
		return;
	}
	pool
		.query(
			'SELECT folio FROM TransaccionTGR ORDER BY folio DESC LIMIT 1'
		)
		.then(results => {
			new_folio = results.rows[0].folio + 1;

			pool
				.query(
					`INSERT INTO TransaccionTGR(
						folio, id_persona, numero_repertorio, timestamp_recepcion, monto,
						estado_transaccion, ingreso, estado_TGR
					) VALUES (
						cast(
							(SELECT folio FROM TransaccionTGR ORDER BY folio DESC LIMIT 1) as INT
						)+1, $1, $2, $3, $4, $5, $6, $7
					)`,
					[
						id_persona,
						numero_repertorio,
						getCurrentServerTimestamp(),
						monto,
						'ingresado',
						true,
						'esperando'
					]
				)
				.then((results) => {
					console.log('[ppePaymentRequest] Monto Ingresado');
					res.status(200).json({
						msg: 'Pago Ingresado',
						transaction_id: new_folio
					});
				})
				.catch((error) => {
					console.error(`[ppePaymentRequest] Error for request ${req}: ${error}`);
					res.status(500).json({
						msg: `Internal Server Error`,
						error: error.toString()
					});
				});
		})
		.catch((error) => {
			console.error(`[ppePaymentRequest] Error for request ${req}: ${error}`);
			res.status(500).json({
				msg: `Internal Server Error`,
				error: error.toString()
			});
		});
};

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
// 	...
// 	res.status(200).json({
// 		msg: `Refund state TODO`,
// 	});
// };

module.exports = {
	ppePaymentRequest,
	//// ppeRefundRequest,
	//// ppePaymentConfirmation,
};
