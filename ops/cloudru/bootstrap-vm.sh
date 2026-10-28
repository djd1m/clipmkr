#!/usr/bin/env bash
set -euo pipefail
sudo cloud-init status --wait || true
if ! command -v docker >/dev/null || ! sudo docker compose version >/dev/null 2>&1; then
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2
fi
sudo systemctl enable --now docker
if ! swapon --show=NAME --noheadings | grep -q .; then
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
sudo install -d -m 755 /etc/docker
printf '%s\n' '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' | sudo tee /etc/docker/daemon.json >/dev/null
sudo systemctl restart docker
printf '%s\n' 'PasswordAuthentication no' 'KbdInteractiveAuthentication no' 'PermitRootLogin prohibit-password' | sudo tee /etc/ssh/sshd_config.d/60-clipmkr-key-only.conf >/dev/null
sudo sshd -t
sudo systemctl reload ssh
printf 'Docker, Compose and swap configured\n'
