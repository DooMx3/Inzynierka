<div align="center">

  <h1>TODO</h1>

  <p>Vinary and vineyard management software.</p>

</div>

| Workflow | Status | What it checks |
| --- | --- | --- |
| [Backend tests](https://github.com/DooMx3/Inzynierka/actions/workflows/backend-tests.yml) | [![Backend tests](https://github.com/DooMx3/Inzynierka/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/DooMx3/Inzynierka/actions/workflows/backend-tests.yml) | `mvn test` against PostgreSQL 16, on pull requests that change `backend/` |
| [Frontend tests](https://github.com/DooMx3/Inzynierka/actions/workflows/frontend.yml) | [![Frontend tests](https://github.com/DooMx3/Inzynierka/actions/workflows/frontend.yml/badge.svg)](https://github.com/DooMx3/Inzynierka/actions/workflows/frontend.yml) | `bun run test`, on pull requests that change `frontend/` |
| [Release containers](https://github.com/DooMx3/Inzynierka/actions/workflows/release.yml) | [![Release containers](https://github.com/DooMx3/Inzynierka/actions/workflows/release.yml/badge.svg)](https://github.com/DooMx3/Inzynierka/actions/workflows/release.yml) | Tag `vX.Y.Z`, build & push changed images to GHCR on push to `main` |

---

# About
Simple yet powerfull app made to help everyone involved in making wine. It allows to track harvests, wine batches, botteling and a lot more. It can also serve as a task management software for your vinary.

# Screenshots

# Run Locally

## Clone the project

```bash
git clone git@github.com:DooMx3/Inzynierka.git && cd Inzynierka
```

## Running the containers

With Docker or Podman installed, start the stack:

```bash
docker compose up
```

or for podman

```bash
podman compose up
```

## Stopping the containers

To stop the containers you can run:

```bash
docker compose down
```

or for podman

```bash
podman compose down
```

# Running Tests

Backend tests need Maven. Frontend tests need Bun. Install frontend dependencies with Bun, npm, or pnpm.

## Frontend

```bash
cd frontend
```

Install dependencies:

```bash
bun install
```

or with npm:

```bash
npm install
```

or with pnpm:

```bash
pnpm install
```

Then run the tests:

```bash
bun test
```

## Backend

```bash
cd backend && mvn test
```

---

# Versioning

Container images use `x.y.z` (also tagged `latest`). Source of truth is **git tags** — CI never pushes to `main` (branch protection).

| Part | Meaning | Who bumps it |
| --- | --- | --- |
| `x` / `y` | Major / minor | Developers: `git tag v0.2 && git push origin v0.2` |
| `z` | Patch | CI: creates `vX.Y.Z` on every push to `main` before image builds |

Normal merge to `main` → CI publishes `vX.Y.(z+1)` and builds only changed images.

To bump major/minor (resets `z` to `0`):

```bash
git checkout main && git pull
git tag v0.2
git push origin v0.2
```

CI then creates `v0.2.0` and rebuilds both images.

Pin a release locally with:

```bash
IMAGE_TAG=0.2.0 docker compose up -d
```

---

# Why
We made this app as a engineering thesis project, but maybe you can use it to make some lovely wine, who knows.

# License
All right reserved for now
