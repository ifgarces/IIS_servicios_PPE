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
			console.log(`http://localhost:${this.port} is alive`);
		});
	}
}

module.exports = Server;
