#!/usr/bin/env bash
# k8s.io/kube-openapi has no tagged releases (pure date-based pseudo-versions),
# so `go get -u` always jumps it to the latest commit instead of the version
# k8s.io/client-go (and friends) actually depend on and were tested against.
# That drift breaks the build: newer kube-openapi commits have switched
# schemaconv to sigs.k8s.io/structured-merge-diff/v7, while k8s.io/apimachinery
# still expects /v6, so apimachinery fails to compile.
#
# Fix: drop our explicit require for kube-openapi after every upgrade and let
# `go mod tidy` recompute it via MVS from what client-go/apimachinery/api
# actually require — the version pairing upstream tested.
#
# Only plugins/helm depends on k8s.io/apimachinery (via client-go); plugins
# using only packages/core's DTOs/kube helpers (e.g. resources-monitor) never
# pull in kube-openapi, so `go mod edit -droprequire` there is a harmless no-op
# if the module isn't required at all — but we still guard it to keep this
# script cheap to extend if that changes.
set -euo pipefail

fix_module() {
  local dir="$1"
  if ! grep -q "k8s.io/kube-openapi" "$dir/go.mod" 2>/dev/null; then
    return 0
  fi
  go -C "$dir" mod edit -droprequire=k8s.io/kube-openapi
  go mod tidy -C "$dir"
}

fix_module "plugins/helm"
fix_module "plugins/resources-monitor"
