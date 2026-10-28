# Clipmkr Cloud.ru deployment — 2026-10-28

Deployment is NOT live. VM `805df7cc-ec31-4c77-bd8f-2ac78256b9ef`
(`clipmkr-20261028`, IP `87.242.87.168`) is now `running`; disk is `in_use`, interface is `created` and the floating IP is `in_use`.
SSH still times out despite the existing ingress TCP 22 rule. The generated serial
console hostname `iaas-serial-pd34.evolution.cloud.ru` returns NXDOMAIN through
system DNS and two public resolvers. Guest OS boot/network state is not verified. Do not repeat deploy_apply or create a second VM.

Cloudru Hub 0.1.15 installed; all five self-tests passed. Approved plan
`plan-b5324b32bd7d`, cap 3,000 RUB/month. Official tariff estimate for
2 vCPU / 4 GB RAM (10% CPU guarantee), 80 GB SSD and one public IP:
1,835.03 RUB per 744 hours, including VAT. Inference/STT and optional paid
services are additional. CPU is shared; video rendering may be slow.
Tariff: https://cdn.cloud.ru/docs/legal/tariffs/evolution/current-version/evolution-compute.pdf

## Pending prerequisites

1. Restore SSH connectivity or inspect guest boot in the virtual console.
   Compute now reports running, but SSH times out. The generated serial console
   endpoint is not resolvable. Cause is unconfirmed; do not assume the VM is
   still provisioning.
2. Proposed app hostname `c.clipmkr.ru` requires its owner's DNS A record
   pointing to `87.242.87.168`. Do NOT change the existing `clipmkr.ru` record.
   Media hostname `media-clipmkr.87.242.87.168.sslip.io` already resolves.
   App hostnames based on this IP and sslip.io/nip.io exceed the existing
   watermark geometry guard (even `57f257a8.nip.io`: 975px > 972px).
   No source guard was removed. The proposed hostname passes preflight.
3. Verify security group allows TCP 80/443 and restricted SSH. Current
   assigned group is `SSH-access_ru.AZ-1`. Do not blindly alter shared rules.

## Artifacts and secrets

Local image tags: `clipmkr:20261028-web`, `clipmkr:20261028-worker`,
`clipmkr:20261028-minio`. MinIO built from official source, pinned commit
`9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a`, license included.
The old MinIO image tag was no longer downloadable.
Transfer bundle: `/tmp/clipmkr-cloudru-images.tar.gz` (includes infrastructure).
Private `.env` is local only; transfer separately with SCP and mode 600.
SSH key is `/root/.ssh/clipmkr-cloudru-20261028`; VM login `user1`.
Cloud credentials are in `/root/.config/cloudru-hub/credentials.json`.
Never commit these credentials.

On the VM, unpack sources into `/home/user1/clipmkr`, install `.env`, run
`bash ops/cloudru/bootstrap-vm.sh`, load images via `sudo docker load`, then
`bash ops/cloudru/start-vm.sh`. No database/account/media migration from the
old server is included. PostgreSQL, Redis and MinIO have no host port mappings.

## Verification completed locally

Both app images built successfully. PostgreSQL migrations applied; private
bucket initialized. All workers start. HTTP health, home, registration and
authenticated dashboard return 200. S3 object put/get/delete succeeds;
anonymous object access returns 403. Caddy config validates. Infrastructure
containers publish no host ports. Isolated preflight data is disposable.

Still required: SSH/bootstrap on the target, TLS and browser acceptance over
the public hostname, closed external infrastructure ports, and a real paid
STT/LLM/video processing test. No inference calls were made in local smoke tests.
