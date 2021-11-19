# IIS_servicios_PPE (Portal de Pago Electrónico)

> Introducción a la ingeniería en software, Universidad de los Andes, 2021

## 1. Project structure

When contributing, it is mandatory to follow the project structure for all systems, please don't rename these files or directories:

- `./`: Node.js project (and its subdirectories, `models`, `routes`, etc.) and Docker files are located here.
- `./database/`: strictly Postgres database-related files.
  - `tables.sql`: SQL `CREATE` statements for building the database model.
  - `data.sql`: SQL `INSERT` statements for populating the database.

For the API documentation (for all systems), go to the [base repo](https://github.com/ifgarces/IIS_servicios_base).

## 2. Dependencies

You can see detailed instructions regarding the installation of Docker [here](https://github.com/ifgarces/IIS_servicios_base#2-dependencies).

## 3. Build and run

Before anything, run `git submodule update --init` for initializing the nested GitHub repo with common resources for all `IIS_servicios_*` systems. Then, you can simply run the container with this system only with `make run`. The following table contains details of other useful Makefile rules:

| Makefile rule     | Description                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `build` (default) | Builds the Docker image.                                                                               |
| `run`             | Executes the Docker image (builds it if needed) as a container. Can be stopped by hitting `[ctrl]+[c]`.        |
| `run_detach`      | Like `run`, but detached (in background). To stop it, use the `stop` rule.                             |
| `stop`            | Terminate the container.                                                                               |
| `clean`           | Deletes Docker cache.                                                                                  |

You can view the currently running containers with `docker ps`.

Ports and other configuration for the system can be changed at the [`.env`](./.env) file.
