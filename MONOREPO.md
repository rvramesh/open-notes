# Open Notes Monorepo

This is a monorepo project using npm workspaces, structured with three main packages:

## Project Structure

```
open-notes/
├── packages/
│   ├── client/        # React + Vite + Electron Renderer
│   ├── electron/      # Electron Main Process
│   └── server/        # Backend Server
├── package.json       # Root workspace configuration
└── ... config files
```

## Packages

### Client (`packages/client`)

The frontend application built with React, TypeScript, and Vite.

- React 18 with TypeScript
- Vite for fast development and building
- Electron integration for desktop app

**Commands:**

```bash
npm run dev -w packages/client      # Start dev server
npm run build -w packages/client    # Build for production
npm run lint -w packages/client     # Run ESLint
npm run preview -w packages/client  # Preview build
```

### Electron (`packages/electron`)

The Electron main process and preload scripts.

- Electron main process entry point
- IPC communication bridge via preload
- Native desktop app features

**Commands:**

```bash
npm run build -w packages/electron  # Compile TypeScript
```

### Server (`packages/server`)

Backend server (Node.js + Express or similar).

- Backend API
- Database integration
- Business logic

**Commands:**

```bash
npm run dev -w packages/server      # Start development server
npm run build -w packages/server    # Build for production
```

## Getting Started

### Installation

```bash
npm install
```

This will install all dependencies for all workspaces.

### Development

```bash
npm run dev
```

This runs the client workspace in development mode with Vite.

### Building

```bash
npm run build
```

This builds the client and Electron app for distribution.

### Linting

```bash
npm run lint
```

This runs ESLint on the client workspace.

## Workspaces

This project uses npm workspaces to manage multiple packages. Benefits include:

- Shared dependencies at the root level
- Easy cross-workspace references
- Simplified dependency management

### Root Dependencies

- TypeScript (shared across all workspaces)

### Workspace-specific Dependencies

Each workspace has its own `package.json` with specific dependencies.

## Monorepo Scripts

Root-level scripts can be run from the project root:

```bash
npm run dev          # Dev build for client (with hot reload)
npm run build        # Production build (client + electron-builder)
npm run build:all    # Build all packages in parallel (client, electron, server)
npm run lint         # Lint all code
npm run preview      # Preview built app
```

### Build Script Details

**`npm run dev`** - Starts the client in development mode with Vite's hot module reloading

- Runs: `npm run dev -w packages/client`

**`npm run build`** - Full production build with electron packaging

- Compiles TypeScript files
- Builds electron process (`packages/electron`)
- Bundles client with Vite
- Packages with electron-builder
- Runs: `tsc && npm run build -w packages/electron && vite build && electron-builder`

**`npm run build:all`** - Builds all packages concurrently (useful for CI/CD)

- Uses `concurrently` to run builds in parallel
- Builds client, electron, and server packages simultaneously

**`npm run lint`** - Runs ESLint on the client workspace

- Checks TypeScript and TSX files

**`npm run preview`** - Preview the built application

- Shows the production build locally before distribution

## Configuration Files

- **tsconfig.json** - Root TypeScript configuration (includes all packages)
- **electron-builder.json5** - Electron builder configuration (in client package)
- **.eslintrc.cjs** - ESLint configuration
- **.gitignore** - Git ignore rules

## Next Steps

1. Update workspace package names and descriptions
2. Configure the server with your preferred backend framework
3. Set up environment variables for each package
4. Configure CI/CD pipelines
5. Add additional workspaces as needed
