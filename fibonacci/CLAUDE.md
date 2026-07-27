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

- No router, no client-side persistence — `App.tsx` holds the current session (`{chatId, participantId, name, role}`) in memory and toggles between `LandingPage` and `MainPage`; a page reload loses the session (rejoin via the landing page).
- `LandingPage` collects a trimmed, non-empty name plus a `User`/`Facilitator` role radio (defaults to `Facilitator` — intentional, locked in by a `LandingPage.test.tsx` case; don't "fix" this), and calls `onSubmit(name, role)` (Enter key or button), which joins the chat via the backend.
- `MainPage` polls `GET /api/chats/{chatId}` every ~2s. A 404 means the Facilitator closed the chat, which bounces the client back to `LandingPage`. It's a two-column layout: `Sidebar` (name + role table) and either `EstimateDeck` (role `User`) or `FacilitatorPanel` (role `Facilitator`). `EstimateDeck` is keyed on `chatState.roundId`, so a Facilitator Restart remounts it and clears the participant's local pick in sync with the server-side reset.
- `EstimateDeck` is the single-select Fibonacci card picker (`0,1,2,3,5,8,13,21,?,☕`); selecting/deselecting calls the backend selection endpoint. `Card` is a presentational, controlled component.
- `FacilitatorPanel` lists all participants with a picked/waiting indicator, and Reveal / Restart / Close Chat buttons; selected values are only shown once revealed. Restart clears every participant's selection and re-hides the round without deleting the chat or participants.
- `src/api.ts` is the fetch wrapper for all backend calls (`VITE_API_BASE_URL`, default `http://localhost:5080`).
- Backend (`backend/Api`): a minimal API with all DynamoDB access behind `ChatService`/`IChatService` (kept mockable for tests). One chat is active at a time (no rooms/join-codes) — a pointer item in DynamoDB tracks the current chat. Table `FibonacciChats` (AWS region `ap-southeast-2`, account `806880856266`): PK `ChatId`, SK `SortKey`, storing a `POINTER` item, a `META` item (`Revealed` flag, `RoundId` counter) and one `PARTICIPANT#{id}` item per participant. `POST /{chatId}/restart` removes every participant's `Selection`, resets `Revealed` to `false`, and increments `RoundId` (returned in `ChatStateResponse`, used by the frontend to key-remount `EstimateDeck`) — the chat and participants themselves are untouched. Closing a chat queries and batch-deletes every item for that `ChatId` — a real delete, not a soft-close flag. There is no server-side role enforcement; Facilitator-only actions are a client-side gate only.
- AWS credentials for local dev: the table lives in account `806880856266` because the original working account's IAM user (`amir`, account `484925740994`) has no DynamoDB permissions. `backend/Api/Properties/launchSettings.json` sets `AWS_PROFILE=dynamodb-backend`, a profile in `~/.aws/config` whose `credential_process` calls `aws configure export-credentials --profile agent-toolkit` (the browser-login profile created by the Agent Toolkit setup) to mint short-lived session credentials for `806880856266` — nothing is hardcoded, and this is machine-local config, not part of the repo. If DynamoDB permissions are later fixed on `484925740994`, the table would need to be recreated there and `AWS_PROFILE` pointed back at `default`.
- Styling is Tailwind CSS v4 via the `@tailwindcss/vite` plugin — there is no `tailwind.config.js`; the theme colors from the Color Scheme section are defined as CSS variables in an `@theme` block in `src/index.css` (`--color-accent-yellow`, `--color-blue-primary`, `--color-purple-secondary`, `--color-dark-navy`, `--color-gray-text`), which generates matching utility classes (`bg-dark-navy`, `text-purple-secondary`, etc.). Framer Motion handles page-transition and card select/hover animations.
- Frontend unit tests (Vitest + React Testing Library) are colocated in `src/components/__tests__/`. Frontend e2e tests (Playwright) live in `frontend/e2e/`. Backend unit tests (xUnit) live in `backend/Api.Tests/`.
- The backend has only one global active chat (no per-test isolation), so e2e specs run serially — `playwright.config.ts` sets `fullyParallel: false` and `workers: 1` — and each spec resets the active chat in a `beforeEach` via `e2e/reset-chat.ts` (joins then closes via direct API calls, bypassing the UI). Running specs in parallel, or skipping the reset, causes cross-test participant pollution.

## Strategy

1. Write plan with success criteria for each phase to be checked off. Include project scaffolding, including .gitignore, and rigorous unit testing.
2. Execute the plan ensuring all criteria are met
3. Carry out extensive integration testing with Playwright or similar, fixing defects
4. Only complete when the MVP is finished and tested, with the server running and ready for the user

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal. IMPORTANT: no emojis ever
