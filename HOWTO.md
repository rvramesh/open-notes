# How to Run Open Notes

This guide will help you get the Open Notes application up and running locally.

---

## Prerequisites

Before you start, ensure you have the following installed:

- **Node.js** (v18 or higher)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`
- **npm** (v9 or higher, usually comes with Node.js)
  - Verify installation: `npm --version`
- **Git** (for cloning the repository)

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd open-notes
```

### 2. Install Dependencies

The project uses **npm workspaces** to manage multiple packages (client, server, electron).

```bash
npm install
```

This will automatically install dependencies for all workspaces:

- `packages/client` — Vite React frontend
- `packages/server` — Fastify backend server
- `packages/electron` — Electron main process

### 3. Post-Install

The postinstall hook automatically runs:

```bash
npm run check-licenses
```

This generates:

- `THIRD_PARTY_LICENSES.md` — Full license documentation
- `packages/client/public/libraries.json` — License data for the about dialog

---

## Development

### Start the Development Server

```bash
npm run dev
```

This will:

- Start the **Vite React client** on `http://localhost:5174` (or next available port)
- Start the **Fastify server** on `http://127.0.0.1:3000`
- Start the **Electron** main process
- Watch for file changes and hot-reload

The application should open automatically in an Electron window.

### Available Development Commands

| Command                  | Description                                     |
| ------------------------ | ----------------------------------------------- |
| `npm run dev`            | Start development server with hot reload        |
| `npm run build`          | Build the client for production                 |
| `npm run build:all`      | Build client, electron, and server              |
| `npm run lint`           | Run ESLint checks                               |
| `npm run preview`        | Preview the production build locally            |
| `npm run format`         | Format code with Prettier and organize imports  |
| `npm run format:check`   | Check if files are properly formatted           |
| `npm run check-licenses` | Audit dependencies and generate license reports |

---

## Workspace Commands

Since this is a **monorepo with npm workspaces**, you can run commands in specific workspaces:

### Client (Vite React App)

```bash
npm run dev -w packages/client
npm run build -w packages/client
npm run lint -w packages/client
```

### Server (Fastify Backend)

```bash
npm run build -w packages/server
```

### Electron (Desktop App)

```bash
npm run dev -w packages/electron
npm run build -w packages/electron
```

---

## Project Structure

```
open-notes/
├── packages/
│   ├── client/           # Vite React frontend
│   │   ├── src/
│   │   │   ├── App.tsx              # Main app component
│   │   │   ├── main.tsx             # Entry point
│   │   │   ├── api.ts               # API client
│   │   │   ├── components/          # React components
│   │   │   └── lib/                 # Utilities and types
│   │   ├── public/                  # Static assets
│   │   │   └── libraries.json       # Auto-generated license data
│   │   └── vite.config.ts           # Vite configuration
│   ├── server/           # Fastify backend
│   │   └── src/
│   │       └── index.ts             # Server entry point
│   └── electron/         # Electron desktop app
│       ├── main.ts                  # Electron main process
│       └── preload.ts               # Preload script for IPC
├── scripts/
│   └── check-licenses.cjs           # License compliance checker
├── .prettierrc.json                 # Prettier code formatting config
├── .editorconfig                    # EditorConfig for consistent formatting
├── package.json                     # Root package.json with workspaces
├── THIRD_PARTY_LICENSES.md          # Generated license documentation
├── LICENSE                          # MIT License
└── README.md                         # Project overview
```

---

## Configuration Files

### `eslint.config.js`

Modern ESLint 9 flat configuration (packages/client/):
- Uses the new flat config format (replaces `.eslintrc.cjs`)
- TypeScript support with `typescript-eslint` v8
- React Hooks rules with `eslint-plugin-react-hooks` v5
- React Refresh validation
- Configured to ignore dist folders and node_modules

### `.prettierrc.json`

Code formatting configuration:

- 2-space indentation
- Semicolons enabled (`semi: true`)
- Single quotes disabled (uses double quotes)
- Import organization enabled via `prettier-plugin-organize-imports`

### `.editorconfig`

Editor configuration for consistent formatting across different editors:

- UTF-8 charset
- LF line endings
- 2-space indentation for code files

### `tsconfig.json`

TypeScript configuration in `packages/client/`:

- Path alias: `@` → `./src`
- Target: ES2020
- Module: ESNext

---

## Technology Stack

### Frontend (Client)

- **Vite** — Fast build tool and dev server
- **React 18** — UI library
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility-first styling
- **Plate.js** — Rich text editor
- **Radix UI** — Accessible component primitives
- **Lucide React** — Icon library

### Backend (Server)

- **Fastify** — Fast web framework
- **TypeScript** — Type safety

### Desktop (Electron)

- **Electron** — Cross-platform desktop framework
- **electron-builder** — Build and package Electron apps

### Development Tools

- **ESLint 9** — Code quality checks with flat config
- **Prettier** — Code formatter with import organization
- **TypeScript** — Type checking

### Development Tools

- **Prettier** — Code formatter with import organization
- **ESLint** — Code quality checks
- **TypeScript** — Type checking

---

## Common Tasks

### Format Code

```bash
npm run format
```

This will:

- Format all code files with Prettier
- Organize and remove unused imports
- Fix code style issues

### Check Licenses

```bash
npm run check-licenses
```

This will:

- Scan all dependencies in all workspaces
- Validate licenses against approved list
- Generate or update `THIRD_PARTY_LICENSES.md`
- Update `packages/client/public/libraries.json`

### Run Linting

```bash
npm run lint
```

Check for code quality issues without fixing them.

---

## Troubleshooting

### Port Already in Use

If you see "Port 5173/5174 is in use" or "Port 3000 is in use":

**For the client (Vite):**
Vite automatically tries the next available port. Check the output for the actual URL.

**For the server (Fastify):**
Change the port in `packages/server/src/index.ts` or kill the process using the port:

```bash
# Find process using port 3000
lsof -i :3000
# Or on Windows:
netstat -ano | findstr :3000
```

### Dependencies Not Installing

Clear npm cache and reinstall:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

Ensure you're using the correct Node.js version:

```bash
node --version  # Should be v18+
npm --version   # Should be v9+
```

If issues persist, try:

```bash
npm run format  # Format code
npm run lint    # Check for errors
npm run build   # Rebuild
```

---

## Production Build

### Build All Packages

```bash
npm run build:all
```

This generates:

- `packages/client/dist/` — Optimized React app
- `packages/electron/dist-electron/` — Electron bundles
- `packages/server/dist/` — Server bundle (if applicable)

### Package for Distribution

The build process includes `electron-builder` which generates:

- Windows installers
- macOS DMG/APP
- Linux packages

Check `packages/client/electron-builder.json5` for packaging configuration.

---

## Useful Resources

- **Vite Documentation**: https://vite.dev/
- **React Documentation**: https://react.dev/
- **Plate.js Documentation**: https://platejs.org/
- **Fastify Documentation**: https://www.fastify.io/
- **Electron Documentation**: https://www.electronjs.org/docs
- **Tailwind CSS Documentation**: https://tailwindcss.com/docs

---

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Start development: `npm run dev`
3. ✅ Open the app in the Electron window
4. ✅ Edit code and watch it reload
5. ✅ Read [README.md](./README.md) for project philosophy and goals

---

## Getting Help

If you encounter issues:

1. Check this HOWTO.md file first
2. Review error messages carefully
3. Check the terminal output for clues
4. Ensure all prerequisites are met
5. Try cleaning and reinstalling: `npm install`

Happy coding! 🚀
