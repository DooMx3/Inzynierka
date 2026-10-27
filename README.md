<div align="center">

  <h1>TODO</h1>

  <p>Vinary and vineyard management software.</p>

</div>

| Workflow | Status | What it checks |
| --- | --- | --- |
| [Backend tests](https://github.com/DooMx3/Inzynierka/actions/workflows/backend-tests.yml) | [![Backend tests](https://github.com/DooMx3/Inzynierka/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/DooMx3/Inzynierka/actions/workflows/backend-tests.yml) | `mvn test` against PostgreSQL 16, on pull requests that change `backend/` |
| [Frontend tests](https://github.com/DooMx3/Inzynierka/actions/workflows/frontend.yml) | [![Frontend tests](https://github.com/DooMx3/Inzynierka/actions/workflows/frontend.yml/badge.svg)](https://github.com/DooMx3/Inzynierka/actions/workflows/frontend.yml) | `bun run test`, on pull requests that change `frontend/` |
| [Release containers](https://github.com/DooMx3/Inzynierka/actions/workflows/release.yml) | [![Release containers](https://github.com/DooMx3/Inzynierka/actions/workflows/release.yml/badge.svg)](https://github.com/DooMx3/Inzynierka/actions/workflows/release.yml) | Bump `VERSION`, build & push changed images to GHCR on push to `main` |

---
# Versioning

Container images are tagged with `x.y.z` from the root [`VERSION`](VERSION) file (and also `latest`).

| Part | Meaning | Who bumps it |
| --- | --- | --- |
| `x` | Major | Developers, via git tag `vX.Y` / `vX.Y.Z` |
| `y` | Minor (larger feature / component) | Developers, via git tag `vX.Y` / `vX.Y.Z` |
| `z` | Patch (small change) | CI, on every push to `main` before image builds |

Normal merges to `main` increment `z`. To bump `x` or `y`, push a version tag on the commit (CI sets `z` to `0`):

```bash
# after your feature commit (merge commit on main, or a commit included in the merge)
git tag v0.2.0
git push origin v0.2.0
```

You can also push the tag together with the branch:

```bash
git push origin HEAD
git push origin v0.2.0
```

With a regular merge commit, the tag on a PR commit is picked up when that commit lands on `main`. With squash merges, tag the squash commit on `main` after merge.

Only the frontend image is rebuilt when `frontend/` changed, only backend when `backend/` changed — they may end up on different tags. Pushing a version tag rebuilds both images at `X.Y.0`.

Pin a release locally with:

```bash
IMAGE_TAG=0.1.0 docker compose up -d
```

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

# Why
We made this app as a engineering thesis project, but maybe you can use it to make some lovely wine, who knows.

# License
All right reserved for now
