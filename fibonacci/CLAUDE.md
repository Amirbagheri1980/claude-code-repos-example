# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MVP status: implemented and working, including a User/Facilitator role backend. The frontend lives in `frontend/` (Vite + React + TypeScript), the backend in `backend/` (.NET minimal API + AWS DynamoDB). See Architecture below before making changes.

## Business Requirements

- An MVP of a fibonacci style Project estimation application as a web app  
- The web app have first page named as landing page. the user enter the name and press enter button to go through the main page. 
- The landing page also has a User/Facilitator role radio button selection. Only the Facilitator can reveal the card each user has selected; users' picks stay hidden until revealed.
- When the Facilitator closes the chat, all recorded data for that chat is deleted.
- The Facilitator can Restart the current round: clears every participant's selection and re-hides them (undoes Reveal) so the group can estimate the next card, without deleting the chat or participants.
- The main page must have 2 columns. one sidebar that includes the users name in a stylish tabled column.
- Second column in main page should include Kanban estimate deck of card.
- No more functionality: no archive, no search/filter. Keep it simple.
- The priority is a slick, professional, gorgeous UI/UX with very simple features


## Technical Details

- Frontend: modern ReactJS app, client rendered, in subdirectory `frontend`
- Backend: .NET minimal API in subdirectory `backend`, backed by a real AWS DynamoDB table (see Architecture) — needed so a Facilitator can see other participants' picks
- No user management/auth beyond the name + role chosen at join time
- Use popular libraries
- As simple as possible but with an elegant UI

## Color Scheme

- Accent Yellow: `#ecad0a` - accent lines, highlights
- Blue Primary: `#209dd7` - links, key sections
- Purple Secondary: `#753991` - submit buttons, important actions
- Dark Navy: `#032147` - main headings
- Gray Text: `#888888` - supporting text, labels

## Commands

Frontend, run from `frontend/`:

- `npm run dev` - start dev server (Vite, default port 5173)
- `npm run build` - typecheck (`tsc -b`) then production build
- `npm run lint` - oxlint
- `npm run test` - unit tests (Vitest, single run). Single file: `npx vitest run src/components/__tests__/EstimateDeck.test.tsx`. Watch mode: `npx vitest`
- `npm run test:e2e` - Playwright e2e tests (auto-starts the dev server on port 5173). Single file: `npx playwright test e2e/app.spec.ts`

Backend, run from `backend/`:

- `dotnet run --project Api` - start the API (Kestrel, default port 5080)
- `dotnet build` - build the solution
- `dotnet test` - unit tests (xUnit, mocked DynamoDB — no real AWS calls). Single test: `dotnet test --filter FullyQualifiedName~ChatServiceTests.Close_DeletesAllChatItems`

## Architecture

- No router dependency, no client-side persistence — `App.tsx` holds the current session (`{chatId, participantId, name, role}`) in memory and toggles between `RoomStatus`/`LandingPage`/`MainPage`; a page reload loses the session (rejoin via the landing page or the room's URL). `src/routing.ts` handles the one URL shape the app needs (`/chat/{roomId}`) by parsing `window.location.pathname` and using `history.pushState` directly — a deliberate choice to avoid adding react-router for two routes.
- Visiting `/` with no room in the URL shows `LandingPage` in "create" mode: submitting calls `createRoom`, which starts a brand-new room and navigates to `/chat/{roomId}`. Visiting `/chat/{roomId}` directly runs a preflight `GET /api/chats/{roomId}` (no `participantId`) to check the room exists — `App.tsx` shows a `RoomStatus` "checking" state while that's in flight, `LandingPage` in "join" mode (submits via `joinRoom`) once confirmed, or a `RoomStatus` "invalid" friendly-error screen (with a link back to `/`) if the room is missing/expired, including if `joinRoom` itself later 404s in the race between preflight and submit.
- `LandingPage` collects a trimmed, non-empty name plus, when `allowRoleSelection` is true, a `User`/`Facilitator` role radio (defaults to `Facilitator` — intentional, locked in by a `LandingPage.test.tsx` case; don't "fix" this); when `allowRoleSelection` is false the radio isn't rendered at all and `role` is locked to `User`. `App.tsx` passes `allowRoleSelection={!roomId}` — creating a room (`/`) still lets you pick your role, but joining an existing one (`/chat/{roomId}`) never offers `Facilitator`, since a room can only ever have the one facilitator who created it (see `ChatService.JoinRoomAsync` below — enforced server-side too, not just hidden in the UI). `onSubmit(name, role)` (Enter key or button) is wired by `App.tsx` to either `createRoom` or `joinRoom` depending on whether a room ID is present in the URL. `LandingPage` itself has no concept of rooms.
- `MainPage` polls `GET /api/chats/{chatId}` every ~2s. A 404 means the Facilitator closed the chat; the poll also checks the response's `participants` list still contains the local `participantId` — if not (the Facilitator removed them), it's treated the same as a close. Either case bounces the client back to `LandingPage` via the same `onLeave` callback (no distinct "you were removed" messaging — kept intentionally simple). It's a two-column layout: `Sidebar` (name + role table) and either `EstimateDeck` (role `User`) or `FacilitatorPanel` (role `Facilitator`). `EstimateDeck` is keyed on `chatState.roundId`, so a Facilitator Restart remounts it and clears the participant's local pick in sync with the server-side reset.
- `EstimateDeck` is the single-select Fibonacci card picker (`0,1,2,3,5,8,13,21,?,☕`); selecting/deselecting calls the backend selection endpoint. `Card` is a presentational, controlled component.
- `FacilitatorPanel` shows a share-link banner (readonly input with `/chat/{chatId}` plus a "Copy link" button using `navigator.clipboard`) above the participant list, and Reveal / Restart / Close Chat buttons; selected values are only shown once revealed. Restart clears every participant's selection and re-hides the round without deleting the chat or participants. Each participant row except the viewer's own (compared via a `participantId` prop passed down from `MainPage`) gets a "Remove" button calling `removeParticipant`, which hard-deletes that participant's DynamoDB item; the removed participant's own client picks this up on its next poll (see `MainPage` above).
- `src/api.ts` is the fetch wrapper for all backend calls (`VITE_API_BASE_URL`, default `http://localhost:5080`).
- Backend (`backend/Api`): a minimal API with all DynamoDB access behind `ChatService`/`IChatService` (kept mockable for tests). Each chat is its own room, identified by a short 6-character unambiguous alphanumeric code (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`, excludes `0/O/1/I/L`) generated by `ChatService.CreateRoomAsync` and written via a conditional `PutItem` (`attribute_not_exists(ChatId)`), retried up to 5 times on collision — the code *is* the DynamoDB `ChatId`, there's no separate pointer item. `POST /api/chats` creates a room (caller picks their own role) and returns `{chatId, participantId, role}`. `POST /api/chats/{chatId}/join` joins an existing one — **`ChatService.JoinRoomAsync` always assigns `ParticipantRole.User` regardless of any role sent by the client** (the request body for join, `JoinRoomRequest`, doesn't even have a `Role` field), which is what guarantees a room can never end up with more than one facilitator: the only participant who can be `Facilitator` is whoever called `CreateRoomAsync`. Join 404s (surfaced by the frontend as the `RoomStatus` "invalid" screen) if the code is unknown. `DELETE /api/chats/{chatId}/participants/{participantId}` (`ChatService.RemoveParticipantAsync`) deletes a single participant's item — used by the Facilitator's "Remove" button; no role check server-side (matches the rest of the app's "Facilitator-only actions are a client-side gate only" posture). Table `FibonacciChats` (AWS region `ap-southeast-2`, account `806880856266`): PK `ChatId`, SK `SortKey`, storing a `META` item (`Revealed` flag, `RoundId` counter, `ExpiresAt`) and one `PARTICIPANT#{id}` item per participant (also stamped `ExpiresAt`). `POST /{chatId}/restart` removes every participant's `Selection`, resets `Revealed` to `false`, and increments `RoundId` (returned in `ChatStateResponse`, used by the frontend to key-remount `EstimateDeck`) — the chat and participants themselves are untouched. Closing a chat queries and batch-deletes every item for that `ChatId` — a real delete, not a soft-close flag, and frees the room code for reuse.
- Rooms self-expire via a DynamoDB TTL on `ExpiresAt`, set once at creation to 24h out (a flat window, not sliding/last-activity-based) and stamped identically on the `META` item and every `PARTICIPANT` item. This is a backstop for abandoned rooms nobody closes — TTL is enabled on the live table (see Deployment below).
- AWS credentials for local dev: the table lives in account `806880856266` because the original working account's IAM user (`amir`, account `484925740994`) has no DynamoDB permissions. `backend/Api/Properties/launchSettings.json` sets `AWS_PROFILE=dynamodb-backend`, a profile in `~/.aws/config` whose `credential_process` calls `aws configure export-credentials --profile agent-toolkit` (the browser-login profile created by the Agent Toolkit setup) to mint short-lived session credentials for `806880856266` — nothing is hardcoded, and this is machine-local config, not part of the repo. If DynamoDB permissions are later fixed on `484925740994`, the table would need to be recreated there and `AWS_PROFILE` pointed back at `default`.
- **All AWS CLI/tooling access for this project (this table, App Runner, Amplify, etc.) must target account `806880856266`**, using `--profile dynamodb-backend` (or `--profile agent-toolkit` for the underlying browser-login credentials). The AWS MCP server's default identity is a *different* identity — `amir` in account `484925740994` — which has no access to this project's resources and doesn't accept a `--profile` override; treat it as unusable for this project and fall back to the AWS CLI with the profile above instead. If the `agent-toolkit` session has expired (`aws sts get-caller-identity --profile agent-toolkit` errors with "session has expired"), it needs an interactive browser re-auth: run `aws login --profile agent-toolkit` and complete the browser flow it opens.
- Styling is Tailwind CSS v4 via the `@tailwindcss/vite` plugin — there is no `tailwind.config.js`; the theme colors from the Color Scheme section are defined as CSS variables in an `@theme` block in `src/index.css` (`--color-accent-yellow`, `--color-blue-primary`, `--color-purple-secondary`, `--color-dark-navy`, `--color-gray-text`), which generates matching utility classes (`bg-dark-navy`, `text-purple-secondary`, etc.). Framer Motion handles page-transition and card select/hover animations.
- Frontend unit tests (Vitest + React Testing Library) are colocated in `src/components/__tests__/`. Frontend e2e tests (Playwright) live in `frontend/e2e/`. Backend unit tests (xUnit) live in `backend/Api.Tests/`.
- Each e2e spec creates its own uniquely-coded room through the UI, so specs are naturally isolated from each other (no shared active-chat state, no per-spec reset helper needed). `playwright.config.ts` still sets `fullyParallel: false` and `workers: 1` — that's a separate, deliberate choice rather than a correctness requirement of the room model; relaxing it is expected to be safe but hasn't been changed as part of adding rooms.

## Deployment

Decided and deployed 2026-07-29. Local dev (`dotnet run` + `npm run dev`) still works unchanged and is the default workflow for iterating; the deployment below is a separately-updated environment, not the dev loop.

- Live backend: `https://bqdsbd3dc2.ap-southeast-2.awsapprunner.com`
- Live frontend: `https://fibonacci.aeyeit.com.au` (custom domain; the Amplify default `https://main.d2t14e70i84h2u.amplifyapp.com` still works too)
- Redeploy with `./scripts/deploy.sh` (needs Docker running locally and `AWS_PROFILE=dynamodb-backend` credentials — run `aws login --profile agent-toolkit` first if that profile has expired).
- Custom domain: `infra/lib/frontend-stack.ts` associates `fibonacci.aeyeit.com.au` via `app.addDomain(...)` (Amplify-managed ACM cert). DNS for `aeyeit.com.au` is authoritative at **Cloudflare** (nameservers `donovan.ns.cloudflare.com` / `hazel.ns.cloudflare.com`) even though the domain is registered at CrazyDomains — don't assume CrazyDomains' own DNS Zone Editor controls anything for this domain. Two CNAME records live in Cloudflare, both set to **DNS only** (not proxied, since Amplify terminates its own TLS via CloudFront): one for ACM certificate validation, one mapping `fibonacci` → the Amplify/CloudFront target. Record values are regenerated if the `Domain` construct is ever replaced; fetch current values with `aws amplify get-domain-association --app-id d2t14e70i84h2u --domain-name aeyeit.com.au --region ap-southeast-2 --profile dynamodb-backend`.

- Backend: **AWS App Runner**, deployed as-is from the existing .NET minimal API container (no Lambda adapter, no code changes). Smallest supported size (0.25 vCPU / 0.5 GB) — plenty for a small team's intermittent estimation sessions.
- Frontend: **AWS Amplify Hosting** serving the Vite production build, automatic HTTPS via ACM.
- Same account/region as the existing DynamoDB table — account `806880856266`, `ap-southeast-2` — to avoid cross-account IAM and keep latency low.
- IAM: a single auto-generated App Runner instance role scoped to the `FibonacciChats` table (read/write only, verified via `cdk synth`). No manually managed IAM users or groups — this was an explicit requirement.
- Cost: roughly $3-5/month, almost entirely App Runner's idle provisioned-instance floor (~$0.007-0.009/GB-hour, always keeps 1 instance warm — App Runner does not scale to zero automatically). Amplify Hosting and DynamoDB are negligible at this scale/free tier. Pause the App Runner service manually (console/CLI/API) between periods of no use to cut the idle cost further.
- Rejected alternative: API Gateway + Lambda. Would likely cost closer to $0/month (Lambda's free tier is 1M requests + 400,000 GB-seconds every month, permanently), but requires adding `Amazon.Lambda.AspNetCoreServer.Hosting` to adapt Kestrel to Lambda's event model and accepts occasional .NET cold starts. App Runner was chosen for zero code changes over the small extra cost.
- DynamoDB TTL on attribute `ExpiresAt` (see Architecture) was enabled once, manually, on 2026-07-31 — it's not part of `cdk deploy` since `infra/lib/backend-stack.ts` imports the table rather than managing it:
  ```
  aws login --profile agent-toolkit
  aws dynamodb update-time-to-live \
    --table-name FibonacciChats \
    --time-to-live-specification "Enabled=true,AttributeName=ExpiresAt" \
    --region ap-southeast-2 \
    --profile dynamodb-backend
  ```
  Only needs re-running if the table is ever recreated.

### Infra layout

- `infra/` is a standalone CDK v2 TypeScript app (own `package.json`, not part of the frontend/backend workspaces). `infra/bin/infra.ts` defines two stacks in account `806880856266` / `ap-southeast-2`: `FibonacciBackend` and `FibonacciFrontend`.
- `FibonacciBackend` (`infra/lib/backend-stack.ts`): references the existing `FibonacciChats` table with `dynamodb.Table.fromTableName` (CDK does not manage the table itself), builds `backend/Api/Dockerfile` into an ECR image asset, and runs it on App Runner via `@aws-cdk/aws-apprunner-alpha`. Takes an optional `corsAllowedOrigin` prop (from `CORS_ALLOWED_ORIGIN` env var), defaulting to the local dev origin.
- `FibonacciFrontend` (`infra/lib/frontend-stack.ts`): creates an Amplify Hosting `App` with **no `sourceCodeProvider`** — this repo has no git remote, so there is no CI/CD branch connection. Instead it uploads `frontend/dist` as an S3 asset and deploys it via Amplify's `addBranch({ asset })`, which CDK wires through a custom resource calling `startDeployment`. This means `frontend/dist` must already exist (from `npm run build`) before `cdk deploy` / `cdk synth` runs, or the stack throws. The `App` also sets `customRules: [amplify.CustomRule.SINGLE_PAGE_APPLICATION_REDIRECT]` — required once the app gained a real client-side route (`/chat/{roomId}`): without it, a direct/deep-link request to that path 404s at the S3/CloudFront layer (only in-app `pushState` navigation worked), since there's no matching S3 object for that path. Found and fixed during UAT on 2026-07-31.
- `backend/Api/Dockerfile`: multi-stage .NET 8 SDK build → `aspnet:8.0` runtime image, listens on port 8080 (the .NET 8+ container default and what App Runner's `imageConfiguration.port` is set to).
- Backend CORS (`Program.cs`) reads `Cors:AllowedOrigin` from config (the `Cors__AllowedOrigin` env var App Runner sets) and now supports a **comma-separated list of origins** (`policy.WithOrigins(...)` takes a `string[]`, split from the config value) — needed once the app had two legitimate origins (the Amplify default domain and the custom domain). A single-origin value still works fine.
- Deployed `Cors__AllowedOrigin` value: `https://fibonacci.aeyeit.com.au,https://main.d2t14e70i84h2u.amplifyapp.com`. If a browser client gets `TypeError: Failed to fetch` on join (visible in devtools console, not just a stuck landing page), check this env var on the App Runner service first — it silently blocks fetches from any origin not in this list, and the failure only shows up in the browser console, not as a visible error in the UI.
- Circular dependency between the two stacks (backend needs the frontend's origin(s) for CORS; the frontend build needs the backend's App Runner URL baked in via `VITE_API_BASE_URL`) is resolved by `scripts/deploy.sh`, which deploys in three passes: backend (placeholder CORS) → build+deploy frontend against the real backend URL → redeploy backend with CORS locked to the real origin(s). `scripts/deploy.sh` currently only locks CORS to the Amplify default domain in its third pass — if redeploying from scratch, manually include the custom domain too (see the `CORS_ALLOWED_ORIGIN` example above), or update the script to add it.
- `cdk synth` for both stacks succeeds without Docker (Docker is only invoked at `cdk deploy`/asset-publish time).
- **Apple Silicon gotcha**: `DockerImageAsset` in `backend-stack.ts` sets `platform: ecrAssets.Platform.LINUX_AMD64` explicitly. Without it, Docker Desktop on an ARM Mac builds an arm64 image by default, which App Runner (x86_64 only) fails to run — the App Runner service creation fails with `CREATE_FAILED` / `NotStabilized`, and the App Runner application log shows `exec /usr/bin/dotnet: exec format error`. Don't remove that `platform` line.

## Strategy

1. Write plan with success criteria for each phase to be checked off. Include project scaffolding, including .gitignore, and rigorous unit testing.
2. Execute the plan ensuring all criteria are met
3. Carry out extensive integration testing with Playwright or similar, fixing defects
4. Only complete when the MVP is finished and tested, with the server running and ready for the user

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal. IMPORTANT: no emojis ever
