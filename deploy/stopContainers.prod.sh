#!/bin/bash

echo "[INFO] Stopping Docker Compose"

docker compose -f docker-compose.prod.yml down --rmi all
