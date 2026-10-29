# Clipmkr Cloud.ru deployment

## Current working deployment: r4, 2026-10-29

**Application is running on Cloud.ru.** VM `clipmkr-20261029-r4`, ID
`4a07fec2-e017-4f2c-bea8-3cf7069c2b99`, zone `ru.AZ-1`, public IP
`176.109.111.98`, private IP `10.0.0.8`. Cloudru Hub upgraded to 0.1.16 /
engine 0.2.7-20261029; all five self-tests pass. Plan `plan-f905ac5c9409`.

Seven containers run in `/home/user1/clipmkr`: web, STT/LLM/video workers,
PostgreSQL, Redis and Caddy. Original four private config files transferred
byte-for-byte; remote `.env` is the dedicated target override. SHA256 checks
match. Models are Cloud.ru FM / Yandex SpeechKit, storage is external Cloud.ru S3.
No old user database was migrated. Code archive is a full Git archive including docs.

Verified: public `http://176.109.111.98/health` returns 200. Chromium registration
reaches the authenticated dashboard on the remote VM through a private SSH tunnel;
390px dashboard has no horizontal overflow. Remote S3 HeadBucket succeeds. Public
5432/6379/3000/9000/2019 are unreachable. No paid recording processing test run.

**Pending public HTTPS:** set A record `c.clipmkr.ru -> 176.109.111.98`.
It still resolved to the old failed r2 IP when last checked. Caddy will obtain TLS
when DNS points to this server. Existing `clipmkr.ru` is unchanged. S3 CORS now
also permits `https://c.clipmkr.ru`; old production origins preserved, backup
stored privately under `/root/.config/clipmkr/` on the source VPS.

A temporary console password was set to diagnose boot/network access. It was
inadvertently visible in a diagnostic screenshot, then immediately invalidated
via `passwd -l user1`. Password and keyboard-interactive SSH authentication are
disabled; key-based login re-verified. Temporary password file and diagnostic
screenshot removed. Console access revealed a booted Ubuntu login screen; SSH
became available during diagnostics and the transfer proceeded normally.

Resources: 2 vCPU / 4GB RAM (10% CPU guarantee), 80GB SSD, 4GB swap, approximately
1,835 RUB per 31 days including public IP. Object storage, inference/STT, traffic
and prior stuck resources are outside this estimate. See `deployment-r4.json`.

### Previous attempts (historical evidence)


## Latest attempt: r3, 2026-10-28

Retry explicitly requested after the owner removed surplus VMs to release quota.
Cloudru Hub plan `plan-bd93e3be1739` created VM
`b63d0198-0d92-498d-af7f-34149844dd09` (`clipmkr-20261028-r3`),
`ru.AZ-2`, IP `87.242.87.61`. The task
`5aa4ceb9-03ac-421b-8a3d-df8e549b13d1` FAILED. Both VM and boot disk
`4ad59abf-fbaa-4065-b264-086cf081a085` are `error_creating`.

The API exposes no error reason. Quota exhaustion is a hypothesis, not confirmed.
Earlier failed/deleting resources remain visible, so deletion requests alone do
not establish that their quotas have been released. No application or secrets
were transferred to r3. Local containers remain running. See `deployment-r3.json`.

Provider support should inspect the failed task and actual compute/storage/IP
quotas and finish cleanup of stuck resources. No further creation is pending.
DNS still points to r2 (`c.clipmkr.ru -> 87.242.86.84`); it was intentionally
not changed to another failed VM. The preview origin also requires adding CORS
permission in the existing S3 bucket while preserving the old production origin;
that change has not been made.


## Current attempt: r2, 2026-10-28

VM `ea206b2d-ad99-4f1f-a91c-b039bb8e203d` (`clipmkr-20261028-r2`),
zone `ru.AZ-2`, IP `87.242.86.84`. Provisioning requested via Cloudru Hub MCP
with approved plan `plan-a04d0fe77d77`. Creation FAILED: VM, disk and interface are `error_creating`. Task
`3d3a9493-e4af-4209-811c-439d6a7bb7c8` is `failed`; no reason is exposed
by the API. Application transfer has NOT happened. See `deployment-r2.json`.
SSH/deployment polling was stopped after confirming the failed task. Do not replay
deploy_apply or create more VMs before understanding the provider failure.

Sizing and estimated cost remain 2 vCPU / 4 GB RAM (10% CPU guarantee),
80 GB SSD and public IP: about 1,835 RUB for 31 days. Inference/STT, existing
object storage, traffic and the previous stuck resources are outside this figure.

Four original private settings files were imported from the old server and
preserved byte-for-byte. Their ordered merge is local `.env`. Additional target
settings are in private `.env.cloudru-deploy`. Neither belongs in Git or images.
External Cloud.ru S3 is used; MinIO is not deployed in this attempt. Old database
accounts/media metadata have not been migrated. A fresh database is initialized.

Target startup: `bootstrap-vm.sh`, `docker load`, then `start-managed-vm.sh`.
The latter uses base Compose + `compose.images.yml` + `compose.cloudru-managed.yml`.
The original four settings files must be copied separately with mode 600. On the
VM, `.env` should contain `.env.cloudru-deploy`, not the unmodified old origin.
No DB/Redis/app ports are published. Caddy publishes 80/443; the IP serves only
`/health` for service diagnostics. A record `c.clipmkr.ru -> 87.242.86.84` is now
confirmed, but the failed VM cannot serve traffic.
No DNS change to the existing production `clipmkr.ru` has been performed.

Local acceptance: all six services running, Cloud.ru S3 HeadBucket authorized,
Chromium registration reaches authenticated dashboard, 390px dashboard has no
horizontal overflow. These checks do not prove remote VM deployment or paid
processing of a real recording. Snapshots: `/tmp/clipmkr-stage-{desktop,mobile}.png`.

If direct SSH port 22 is unreachable, the user's source VPS SSH port 2222 is an
available jump transport; the Cloud.ru private key stays on this VPS. Do not close
the temporary source port until remote provisioning and transfer are finished.

The earlier VM remains `error_deleting`; its disk is `error`. The owner/provider
must finish cleanup. No unrelated VMs, disks or security groups are modified.

## Earlier attempt (historical evidence)

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
