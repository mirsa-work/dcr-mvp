#!/bin/bash

echo "[INFO] Starting Docker Compose with inline secrets"

NODE_ENV=production
DB_HOST=db
DB_NAME=erpdb
DB_ROOT_PWD=$(aws ssm get-parameter --name /prod/erp/db/rootpwd --with-decryption --query Parameter.Value --output text)

DB_USER=erpdb_user
DB_USER_PWD=$(aws ssm get-parameter --name /prod/erp/db/userpwd --with-decryption --query Parameter.Value --output text)

DB_APP_USER=erpdb_app
DB_APP_PWD=$(aws ssm get-parameter --name /prod/erp/db/apppwd --with-decryption --query Parameter.Value --output text)

JWT_SECRET=$(aws ssm get-parameter --name /prod/erp/jwt/secret --with-decryption --query Parameter.Value --output text)

NODE_ENV=$NODE_ENV DB_HOST=$DB_HOST DB_NAME=$DB_NAME DB_ROOT_PWD=$DB_ROOT_PWD DB_USER=$DB_USER DB_USER_PWD=$DB_USER_PWD DB_APP_USER=$DB_APP_USER DB_APP_PWD=$DB_APP_PWD JWT_SECRET=$JWT_SECRET docker compose -f docker-compose.prod.yml up -d
