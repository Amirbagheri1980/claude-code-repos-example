#!/usr/bin/env bash
# Deploys the fibonacci app to AWS: App Runner (backend) + Amplify Hosting (frontend).
# Three passes are needed because backend CORS and the frontend's API base URL
# each depend on the other stack's output:
#   1. Deploy the backend once so we know its App Runner URL.
#   2. Build the frontend against that URL and deploy Amplify Hosting.
#   3. Redeploy the backend with CORS locked to the real Amplify domain
#      (pass 1 used the local dev origin as a placeholder).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing infra dependencies"
(cd infra && npm install)

echo "==> Deploying backend (App Runner), pass 1"
(cd infra && npx cdk deploy FibonacciBackend --outputs-file outputs.json --require-approval never)
BACKEND_URL=$(node -pe "require('./infra/outputs.json').FibonacciBackend.ServiceUrl")
echo "    Backend URL: $BACKEND_URL"

echo "==> Building frontend against $BACKEND_URL"
(cd frontend && VITE_API_BASE_URL="$BACKEND_URL" npm run build)

echo "==> Deploying frontend (Amplify Hosting)"
(cd infra && npx cdk deploy FibonacciFrontend --outputs-file outputs.json --require-approval never)
FRONTEND_URL=$(node -pe "require('./infra/outputs.json').FibonacciFrontend.AppUrl")
echo "    Frontend URL: $FRONTEND_URL"

CORS_ORIGINS="https://fibonacci.aeyeit.com.au,$FRONTEND_URL"
echo "==> Deploying backend (App Runner), pass 2 — locking CORS to $CORS_ORIGINS"
(cd infra && CORS_ALLOWED_ORIGIN="$CORS_ORIGINS" npx cdk deploy FibonacciBackend --outputs-file outputs.json --require-approval never)

echo
echo "Done."
echo "  Frontend: $FRONTEND_URL"
echo "  Backend:  $BACKEND_URL"
