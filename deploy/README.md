ssh -i <file>.pem ec2-user@<ip-addr>

	# update package list
	sudo dnf update -y

	# install Docker engine + CLI
	sudo dnf install -y docker

	# start the daemon and enable on boot
	sudo systemctl enable --now docker

	# let ec2‑user run docker without sudo
	sudo usermod -aG docker ec2-user

	exit

ssh -i <file>.pem ec2-user@<ip-addr>
	
	id -nG

	sudo mkdir -p /usr/local/lib/docker/cli-plugins
	
	sudo curl -L https://github.com/docker/compose/releases/download/v2.24.7/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
	
	sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
	
	docker compose version

	docker run --rm hello-world
	
	sudo dnf install -y git
	
	git --version
	
	ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -C "ec2-erp" -N ""
	
	cat ~/.ssh/id_ed25519.pub
	
	# add public key to github
	
	ssh -T git@github.com
	
	git clone git@github.com:mirsa-work/dcr-mvp.git
	
	cd dcr-mvp/deploy

	docker compose -f docker-compose.prod.yml up -d --build

    docker compose -f docker-compose.prod.yml down --volumes --rmi all
