#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
required_node="$(cat .nvmrc)"
if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
  source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm use "$required_node"
elif [[ -x "$HOME/.local/opt/node-v${required_node}/bin/node" ]]; then
  export PATH="$HOME/.local/opt/node-v${required_node}/bin:$PATH"
elif [[ -x "$HOME/.local/opt/node-v${required_node}-linux-x64/bin/node" ]]; then
  export PATH="$HOME/.local/opt/node-v${required_node}-linux-x64/bin:$PATH"
fi
node -e 'const [major, minor, patch] = process.versions.node.split(".").map(Number); if (!((major === 22 && (minor > 22 || minor === 22 && patch >= 3)) || (major === 24 && minor >= 15) || major >= 26)) { console.error("Unsupported Node version. Install the version in .nvmrc, then rerun this launcher."); process.exit(1); }'
if [[ ! -d node_modules ]]; then npm ci; fi
exec npm start -- "$@"
