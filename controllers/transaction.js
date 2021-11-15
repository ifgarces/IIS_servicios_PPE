const { response } = require('express');
const Pool = require('pg').Pool;
const axios = require('axios');
require('log-timestamp');

const pool = new Pool({
	user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDB,
	password: process.env.DBPASSWORD,
	port: process.env.PGPORT,
});

const TGR_PRENDAS_CONFIRMATION_PORT = process.env.TGR_PRENDAS_CONFIRMATION_PORT;
const TGR_CONFIRMATION_FAIL_RATIO = parseFloat(process.env.TGR_CONFIRMATION_FAIL_RATIO);
const TGR_WAIT_SECONDS_MIN = parseInt(process.env.TGR_WAIT_SECONDS_MIN);
const TGR_WAIT_SECONDS_MAX = parseInt(process.env.TGR_WAIT_SECONDS_MAX);
const TGR_CONFIRMATION_RETRY_SECONDS = parseInt(process.env.TGR_CONFIRMATION_RETRY_SECONDS);
const TGR_CONFIRMATION_RETRIES_COUNT = parseInt(process.env.TGR_CONFIRMATION_RETRIES_COUNT);

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
 * For avoiding unwanted duplicated transactions.
 * @param {string} amount The payment amount of the transaction.
 * @param {string} person_id The id of the person who is trying to pay.
 * @param {string} repertorie_id The repertorie id.
 * @returns {boolean} Whether the given transaction was already attempted.
 */
function checkDuplicatedPayment(amount, person_id, repertorie_id) {
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
			return false;
		});
}

/**
 * @param {string} amount A given amount of money to check.
 * @returns {boolean} Whether the given amount is numberic and positive.
 */
function checkEnteredAmount(amount) {
	let amountFloat = parseFloat(amount);
	return !isNaN(amountFloat) && amountFloat > 0;
}

/**
 * @param {string} id_persona A person ID to check.
 * @returns {boolean} Whether the given string matches the format of a RUN, RUT or passport ID.
 */
function checkIdPersona(person_id) {
	const runRegex = new RegExp('^[0-9]{7,8}-([0-9]|K)$'); // warning: case sensitive
	const passportRegex = new RegExp('^P[0-9]{7,8}$');
	return runRegex.test(person_id) || passportRegex.test(person_id);
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
}

/**
 * Utility function for getting a random integer between a range (min, max].
 * References: https://stackoverflow.com/a/1527820/12684271
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}

/**
 * Executes all the logic for the async TGR confirmation. Has to be invoked after a successfull
 * payment request. If the confirmation request to `target_host` fails, will wait for a time and
 * retry. See the `.env` file to view parameters related to this feature.
 * @param {string} target_host The IP to deliver the HTTP request.
 * @param {number} transaction_id ID of the payment to be confirmed.
 * @returns {void}
 */
async function tgrPaymentConfirmation(target_host, transaction_id) {
	const target_url = `http://${target_host}:${TGR_PRENDAS_CONFIRMATION_PORT}/api/tgr_confirmation`;
	// console.debug(`[tgrPaymentConfirmation] target_url=${target_url}`);

	/**
	 * Performs the confirmation API call itself.
	 * @returns {boolean} Wether the response status is 200 OK or not.
	 */
	const prendasConfirmPaymentCall = async function () {
		let callResult = await axios.post(target_url, {
			body: {
				"transaction_id": transaction_id
			}
		});
		return (callResult.status == 200);
	};

	/**
	 * For when waiting for the next confirmation attempt after request failure (auxiliar function
	 * to avoid dupplicated code)
	 * @param {number} tryNumber The current try number.
	 */
	const waitAndLogRetry = async function (tryNumber) {
		console.debug(
			`[tgrPaymentConfirmation] Will wait ${TGR_CONFIRMATION_RETRY_SECONDS} seconds until next try for transaction ${transaction_id}`
		);
		await new Promise((resolve) => setTimeout(resolve, TGR_CONFIRMATION_RETRY_SECONDS * 1000));
		console.debug(
			`[tgrPaymentConfirmation] Try number ${tryNumber} for transaction ${transaction_id}`
		);
	};

	if (Math.random() < TGR_CONFIRMATION_FAIL_RATIO) {
		// Confirmation will never be sent on purpose (simulated TGR failure)
		console.warn(
			`[tgrPaymentConfirmation] Won't send confirmation for transaction ${transaction_id} to ${target_host}`
		);
		return;
	}

	let sleepTime = getRandomInt(TGR_WAIT_SECONDS_MIN, TGR_WAIT_SECONDS_MAX);
	console.log(
		`[tgrPaymentConfirmation] Will send confirmation of transaction ${transaction_id} after ${sleepTime} seconds`
	);
	await new Promise((resolve) => setTimeout(resolve, sleepTime * 1000));

	console.log(
		`[tgrPaymentConfirmation] Sending confirmation call of transaction ${transaction_id} to ${target_url}...`
	);
	let currentTry = 0;
	while (true) {
		currentTry++;
		if (currentTry > TGR_CONFIRMATION_RETRIES_COUNT) {
			console.warn(
				`[tgrPaymentConfirmation] Transaction ${transaction_id} could not get confirmed: maximum retries reached (${currentTry - 1})`
			);
			return;
		}
		try {
			if (await prendasConfirmPaymentCall()) {
				console.log(
					`[tgrPaymentConfirmation] Transaction ${transaction_id} successfully confiremd to ${target_host} after ${currentTry} tries`
				);
				return;
			}
			console.debug(
				`[tgrPaymentConfirmation] Confirmation for transaction ${transaction_id} got error response`
			);
			await waitAndLogRetry(currentTry);
		} catch (error) {
			console.debug(
				`[tgrPaymentConfirmation] Confirmation for transaction ${transaction_id} could not be sent: ${error}`
			);
			await waitAndLogRetry(currentTry);
		}
	}
}

/**
 * API endpoint that registers a transaction attempt in the database and returns the ID of that
 * transaction. Also starts the asynchronous TGR confirmation "callback" for that transaction.
 */
const ppePaymentRequest = (req, res = response) => {
	const { id_persona, numero_repertorio, monto, confirmation_ip } = req.body;

	if ([id_persona, numero_repertorio, monto, confirmation_ip].includes(undefined)) {
		res.status(400).json({
			msg: 'One of the following parameters are missing: id_persona, numero_repertorio, monto, confirmation_ip',
		});
		return;
	}
	if (!checkRepertorieIdFormat(numero_repertorio)) {
		res.status(400).json({
			msg: "Invalid parameter 'numero_repertorio': bad format. Must match 'YEAR-number' with a maximum total lenght of 11 characters, and the YEAR must be in range [1800, 2021]",
		});
		return;
	}
	if (!checkIdPersona(id_persona.toString().toUpperCase())) {
		res.status(400).json({
			msg: "Invalid parameter 'id_persona': must be a RUN/RUT (e.g. '12345678-k') or a passport number (e.g. 'P0123456')",
		});
		return;
	}
	if (!checkEnteredAmount(monto)) {
		res.status(400).json({
			msg: "invalid paremeter 'monto': must be numberic and positive",
		});
		return;
	}
	pool
		.query('SELECT folio FROM TransaccionTGR ORDER BY folio DESC LIMIT 1')
		.then((results) => {
			let paymentNewFolio = results.rows[0].folio + 1;

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
						id_persona.toUpperCase(),
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
					// console.debug(`[ppePaymentRequest] IP of request is ${req.headers['x-forwarded-for']} or ${req.connection.remoteAddress}`); Ref: https://codeforgeek.com/how-to-get-users-ip-details-in-express/
					tgrPaymentConfirmation(confirmation_ip, paymentNewFolio); // invoking async confirmation task
					res.status(200).json({
						msg: 'Pago Ingresado',
						transaction_id: paymentNewFolio
					});
				})
				.catch((error) => {
					console.error(
						`[ppePaymentRequest] Error for request ${req}: ${error}`,
					);
					res.status(500).json({
						msg: 'Internal Server Error',
						error: error.toString(),
					});
				});
		})
		.catch((error) => {
			console.error(`[ppePaymentRequest] Error for request ${req}: ${error}`);
			res.status(500).json({
				msg: 'Internal Server Error',
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
};
