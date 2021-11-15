include .env

# Builds the Docker image
build:
	docker build --tag ${IMAGE_NAME} \
		--build-arg UBUNTU_VERSION=${UBUNTU_VERSION} \
		--build-arg API_PORT=${API_PORT} \
		--file ./IIS_servicios_common/Dockerfile \
		.

# Runs a container from the image, outputting to stdout/stderr
run: build
	docker run -it --rm --name "${IMAGE_NAME}_container" \
		-p ${API_PORT}:${API_PORT} \
		-p ${TGR_PRENDAS_CONFIRMATION_PORT}:${TGR_PRENDAS_CONFIRMATION_PORT} \
		${IMAGE_NAME}

# Runs the container in the background
run_detach: build
	docker run -d --rm --name "${IMAGE_NAME}_container" -p ${API_PORT}:${API_PORT} ${IMAGE_NAME}

# Stop the running container
stop:
	docker stop "${IMAGE_NAME}_container"

# For debugging. Bash prompt while the container is running
debug_bash:
	docker exec -it "${IMAGE_NAME}_container" '/bin/bash'

# Clears cache
clean: stop
	docker builder prune --all --force
	docker rmi -f ${IMAGE_NAME}
