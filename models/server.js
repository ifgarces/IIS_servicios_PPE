const express = require('express');
const cors = require('cors');

class Server {
	constructor() {
		this.app = express();
		this.port = process.env.API_PORT;
		this.checkoutPath = '/api/transaction';

		//Middlewares
		this.middlewares();

		//Aplication routes
		this.routes();
	}

	middlewares() {
		//Cors
		this.app.use(cors());

		//Json parse body
		this.app.use(express.json());

		//Public directoru
		this.app.use(express.static('public'));
	}

	routes() {
		this.app.use(this.checkoutPath, require('../routes/transaction'));
	}

	listen() {
		this.app.listen(process.env.API_PORT, () => {
			console.debug("TGR parameters:");
			console.debug(`    TGR_PRENDAS_CONFIRMATION_PORT=${process.env.TGR_PRENDAS_CONFIRMATION_PORT}`);
			console.debug(`    TGR_CONFIRMATION_FAIL_RATIO=${process.env.TGR_CONFIRMATION_FAIL_RATIO}`);
			console.debug(`    TGR_WAIT_SECONDS_MIN=${process.env.TGR_WAIT_SECONDS_MIN}`);
			console.debug(`    TGR_WAIT_SECONDS_MAX=${process.env.TGR_WAIT_SECONDS_MAX}`);
			console.debug(`    TGR_CONFIRMATION_RETRY_SECONDS=${process.env.TGR_CONFIRMATION_RETRY_SECONDS}`);
			console.debug(`    TGR_PRENDAS_CONFIRMATION_PORT=${process.env.TGR_CONFIRMATION_RETRIES_COUNT}`);
			console.log('Running server on port', this.port);
		});
	}
}

module.exports = Server;
