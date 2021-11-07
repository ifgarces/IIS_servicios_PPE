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

const TGR_PRENDAS_CONFIRMATION_PORT = process.env.TGR_PRENDAS_CONFIRMATION_PORT;
const TGR_CONFIRMATION_FAIL_RATIO = parseFloat(
	process.env.TGR_CONFIRMATION_FAIL_RATIO,
);
const TGR_WAIT_SECONDS_MIN = parseInt(process.env.TGR_WAIT_SECONDS_MIN);
const TGR_WAIT_SECONDS_MAX = parseInt(process.env.TGR_WAIT_SECONDS_MAX);
const TGR_CONFIRMATION_RETRY_SECONDS = parseInt(
	process.env.TGR_CONFIRMATION_RETRY_SECONDS,
);

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
 * @param {string} amount The payment amount of the transaction.
 * @param {string} person_id The id of the person who is trying to pay.
 * @param {string} repertorie_id The repertorie id.
 * @returns {boolean} Whether the given transacction was already attempted.
 */
function checkDoubledPayment(amount, person_id, repertorie_id) {
	//! Currently not working
	pool
		.query(
			'SELECT EXISTS(SELECT folio from TransaccionTGR WHERE id_persona=$1 AND numero_repertorio=$2 AND monto=$3)',
			[person_id, repertorie_id, amount],
		)
		.then((results) => {
			console.log(`The result fields are:${results.fields}`);
			console.log(`The rowCount is:${results.rowCount}`);
			if (results == 1) {
				console.log(`[ppePaymentRequest] Duplicated payment request found.`);
				return true;
			}
			console.log(
				`[ppePaymentRequest] No duplicated found for the current payment attempt.`,
			);
			return false;
		})
		.catch((error) => {
			console.error(
				`[ppePaymentRequest] Error checking duplicated payment: ${error}`,
			);
			/* res.status(500).json({
				msg: `Internal Server Error`,
				error: error.toString(),
			}); */
			return false;
		});
}

/**
 * @param {string} amount A given amount of money to check.
 * @returns {boolean} Whether the given amount is between 1-99999.
 */
function checkEnteredAmount(amount) {
	const oneToNinetyNineThousandRegex = new RegExp(
		'^([1-9]|[1-9][0-9]|[1-9][0-9][0-9]|[1-9][0-9][0-9][0-9]|[1-9][0-9][0-9][0-9][0-9])$',
	);
	return oneToNinetyNineThousandRegex.test(amount);
	//? will we have specific amounts for the payments?
}

/**
 * @param {string} id_persona A person ID to check.
 * @returns {boolean} Whether the given string matches the id_persona format.
 */
function checkIdPersona(person_id) {
	const idRegex = new RegExp('^[0-9]{7,8}-([0-9]|k)$');
	return idRegex.test(person_id);
	//?Does the TGR service has to check wether a person exists?
	//?Should we then call to our service in the SRCEI?
}

/**
 * @param {string} repertorie_id A repertorie ID to check.
 * @returns {boolean} Whether the given string matches the repertorie ID format "YEAR-NUMBER" or not.
 */
function checkRepertorieIdFormat(repertorie_id) {
	const numericalRegex = new RegExp(
		'^(18[0-9]{2}|19[0-9]{2}|200[0-9]|201[0-9]|202[0-1])-[0-9]{1,6}$',
	);
	return numericalRegex.test(repertorie_id);
	//* this should work, admits years from 1800 to 2021 only
	//? Does the repertorie number has to be an actual number of does something like 090 works too?
}

/**
 * Utility function for getting a random integer between a range (min, max].
 * References: https://stackoverflow.com/a/1527820/12684271
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randInt(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}

/**
 * Executes all the logic for the async TGR confirmation. Has to be invoked after a successfull
 * payment request.
 * @param {string} prendas_ip The IP to deliver the HTTP request.
 * @param {number} transaction_id ID of the payment to confirm.
 * @returns {void}
 */
async function tgrPaymentConfirmation(prendas_ip, transaction_id) {
	const prendasConfirmPaymentCall = async function (transactionId) {
		// see https://stackoverflow.com/a/68424993/12684271
		return new Promise((resolve, reject) => {
			fetch(
				`http://${prendas_ip}:${TGR_PRENDAS_CONFIRMATION_PORT}/api/tgr_confirmation`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: {
						transactionId: transactionId,
					},
				},
			)
				.then((response) => {
					console.log(
						`[tgrPaymentConfirmation] Got confirmation call response: ${response.toString()}`,
					);
					resolve(response.ok);
				})
				.catch((error) => {
					reject(error);
				});
		});
	};

	if (Math.random() < TGR_CONFIRMATION_FAIL_RATIO) {
		console.log(
			`[tgrPaymentConfirmation] Won't send confirmation for transaction ${transaction_id} to ${prendas_ip}`,
		);
		return; // confirmation won't be sent on purpose
	}

	let sleepTime = randint(TGR_WAIT_SECONDS_MIN, TGR_WAIT_SECONDS_MAX);
	console.log(
		`[tgrPaymentConfirmation] Will send confirmation of transaction ${transaction_id} after ${sleepTime} seconds`,
	);
	await new Promise((resolve) => setTimeout(resolve, sleepTime * 1000));

	// Now we send the transaction confirmation request to Prendas
	console.log(
		`[tgrPaymentConfirmation] Sending confirmation call of transaction ${transaction_id} to ${prendas_ip}...`,
	);
	prendasConfirmPaymentCall(transaction_id)
		.then((isResponseOk) => {
			//if (! isResponseOk) ...
		})
		.catch((error) => {
			// ...
		});
	//TODO: indefinetely retry until succeeded
	// console.log(`[tgrPaymentConfirmation] Confirmation call failed, will retry in ${TGR_CONFIRMATION_RETRY_SECONDS} seconds`);
	// await new Promise(resolve => // if the request failed, we retry after a set amount of time
	// 	setTimeout(resolve, TGR_CONFIRMATION_RETRY_SECONDS * 1000)
	// );
}

/**
 * API endpoint that registers a transaction attempt in the database and returns the ID of that
 * transaction. Also starts the asynchronous simulated TGR confirmation for that transaction.
 */
const ppePaymentRequest = (req, res = response) => {
	const { id_persona, numero_repertorio, monto } = req.body;

	if (!id_persona || !numero_repertorio || !monto) {
		res.status(400).json({
			msg: 'One of the following parameters are missing: id_persona, numero_repertorio, monto',
		});
		return;
	} else if (!checkRepertorieIdFormat(numero_repertorio)) {
		res.status(400).json({
			msg: "Invalid format for the param numero_repertorio. Must match 'YEAR-number' with a maximum total lenght of 11 characters and the year has to belong between 1800-2021",
		});
		return;
	} else if (!checkIdPersona(id_persona)) {
		res.status(400).json({
			msg: "Invalid format for the param id_persona. mind the format: 12345678-k the lenght has to be between 9 and 10 characters with the 'dash' included.",
		});
		return;
	} else if (!checkEnteredAmount(monto)) {
		res.status(400).json({
			msg: 'The amount entered is incorrect, remember it has to be positive and lower than 99999!',
		});
		return;
	}
	pool
		.query('SELECT folio FROM TransaccionTGR ORDER BY folio DESC LIMIT 1')
		.then((results) => {
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
						'esperando',
					],
				)
				.then((results) => {
					console.log('[ppePaymentRequest] Monto Ingresado');
					// tgrPaymentConfirmation( //TODO: implement
					// 	req.headers['x-forwarded-for'] || req.connection.remoteAddress // passing the IP of the request, i.e. of the Prendas server. Ref: https://codeforgeek.com/how-to-get-users-ip-details-in-express/
					// );
					res.status(200).json({
						msg: 'Pago Ingresado',
						transaction_id: new_folio,
					});
				})
				.catch((error) => {
					console.error(
						`[ppePaymentRequest] Error for request ${req}: ${error}`,
					);
					res.status(500).json({
						msg: `Internal Server Error`,
						error: error.toString(),
					});
				});
		})
		.catch((error) => {
			console.error(`[ppePaymentRequest] Error for request ${req}: ${error}`);
			res.status(500).json({
				msg: `Internal Server Error`,
				error: error.toString(),
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
