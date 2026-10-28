#!/bin/sh
set -eu
if ss -H -lnt | awk '{print $4}' | grep -Eq ':(80|443)$'; then
  echo 'Refusing deployment: TCP 80 or 443 already in use' >&2
  exit 1
fi
printf 'TCP 80/443 are free\n'
