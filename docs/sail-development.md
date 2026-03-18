# Sail Development Guide

This guide explains how to create, test, and publish sails for the keel template (a codai project).

## What Are Sails?

Sails are self-contained feature packages that extend the base template. Unlike runtime plugins, sails modify the source code at install time using marker comments. This produces clean, readable code that developers own and can freely modify after installation.

Each sail contains:

- **addon.json** -- Manifest describing the sail, its dependencies, and what it modifies
- **install.ts** -- Installer script that copies files and modifies existing code
- **files/** -- New source files to copy into the project
- **README.md** -- Setup guide for the developer

## Sail Structure

```
sails/my-sail/
├── addon.json           # Manifest
├── install.ts           # Installer script
├── README.md            # Documentation
└── files/
    ├── backend/         # Files copied to packages/backend/src/
    │   ├── routes/
    │   ├── services/
    │   └── schema/
    └── frontend/        # Files copied to packages/frontend/src/
        ├── pages/
        ├── components/
        └── hooks/
```

## Manifest (addon.json)

The manifest describes everything about the sail:

```json
{
  "name": "my-sail",
  "displayName": "My Sail",
  "description": "What this sail does in one sentence",
  "version": "1.0.0",
  "compatibility": ">=1.0.0",
  "requiredEnvVars": [
    {
      "key": "MY_API_KEY",
      "description": "API key from the My Service dashboard"
    }
  ],
  "dependencies": {
    "backend": {
      "some-sdk": "^2.0.0"
    },
    "frontend": {
      "some-react-lib": "^1.0.0"
    }
  },
  "modifies": {
    "backend": ["src/index.ts", "src/env.ts"],
    "frontend": ["src/router.tsx"]
  },
  "adds": {
    "backend": ["src/routes/my-route.ts", "src/services/my-service.ts"],
    "frontend": ["src/pages/MyPage.tsx"]
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| name | string | Unique identifier (kebab-case) |
| displayName | string | Human-readable name |
| description | string | One-line description |
| version | string | Semver version of the sail |
| compatibility | string | Semver range for template version |
| requiredEnvVars | array | Environment variables the sail needs |
| dependencies | object | npm packages to install per workspace |
| modifies | object | Existing files the installer will modify |
| adds | object | New files the installer will copy |

## How Marker Comments Work

The base template includes specially formatted comments at strategic insertion points:

```typescript
// packages/backend/src/index.ts
import express from "express";
import { authRouter } from "./routes/auth";
// [SAIL_IMPORTS]

const app = express();

app.use("/api/auth", authRouter);
// [SAIL_ROUTES]

app.listen(3000);
```

When a sail installer runs, it inserts new code directly below the marker:

```typescript
// After installing the Stripe sail:
import express from "express";
import { authRouter } from "./routes/auth";
// [SAIL_IMPORTS]
import { stripeRouter } from "./routes/stripe";

const app = express();

app.use("/api/auth", authRouter);
// [SAIL_ROUTES]
app.use("/api/stripe", stripeRouter);

app.listen(3000);
```

### Available Markers

**Backend markers:**

| Marker | File | Purpose |
|--------|------|---------|
| `// [SAIL_IMPORTS]` | src/index.ts | Import statements for route modules |
| `// [SAIL_ROUTES]` | src/index.ts | Express route mounting |
| `// [SAIL_SCHEMA]` | src/db/schema/index.ts | Schema re-exports |
| `// [SAIL_ENV_VARS]` | src/env.ts | Zod env var validation |
| `// [SAIL_SOCIAL_PROVIDERS]` | src/auth/index.ts | BetterAuth social providers |

**Frontend markers:**

| Marker | File | Purpose |
|--------|------|---------|
| `// [SAIL_IMPORTS]` | src/router.tsx | Page component imports |
| `// [SAIL_ROUTES]` | src/router.tsx | React Router route definitions |
| `// [SAIL_IMPORTS]` | src/components/auth/*.tsx | Component imports |
| `{/* [SAIL_SOCIAL_BUTTONS] */}` | src/components/auth/*.tsx | Social login buttons |

### Insertion Rules

1. Code is inserted on the line immediately after the marker
2. The marker comment itself is preserved (multiple sails can use the same marker)
3. Insertion is idempotent -- running the installer twice won't duplicate code
4. Indentation of the inserted code should match the surrounding context

## Step-by-Step: Creating a New Sail

### Step 1: Create the directory structure

```bash
mkdir -p sails/my-sail/files/backend/{routes,services,schema}
mkdir -p sails/my-sail/files/frontend/{pages,components,hooks}
```

### Step 2: Write addon.json

Start from the template:

```bash
cp sails/_template/addon.json sails/my-sail/addon.json
```

Edit it to describe your sail. Be precise about which files are modified and added.

### Step 3: Create the source files

Write the actual feature code in `files/`. These files should be production-ready and follow the project's coding conventions:

- Use the same import style (`@/` aliases for frontend, relative for backend)
- Follow the existing patterns for routes, services, and components
- Include proper TypeScript types
- Add JSDoc comments for exported functions

### Step 4: Write the installer

Start from the template:

```bash
cp sails/_template/install.ts sails/my-sail/install.ts
```

Customize the installer for your sail. Key operations:

```typescript
// Copy a file
copyFileSync(
  join(SAIL_DIR, "files/backend/routes/my-route.ts"),
  join(BACKEND_ROOT, "src/routes/my-route.ts")
);

// Insert at a marker
insertAtMarker(
  join(BACKEND_ROOT, "src/index.ts"),
  "// [SAIL_IMPORTS]",
  'import { myRouter } from "./routes/my-route";'
);

insertAtMarker(
  join(BACKEND_ROOT, "src/index.ts"),
  "// [SAIL_ROUTES]",
  'app.use("/api/my-route", myRouter);'
);

// Install dependencies
execSync("npm install some-sdk@^2.0.0 --workspace=packages/backend", {
  cwd: PROJECT_ROOT,
  stdio: "inherit",
});
```

### Step 5: Write the README

Document:

1. What the sail does
2. Prerequisites (accounts, API keys, etc.)
3. Step-by-step setup instructions for external services
4. API reference (if the sail adds API routes)
5. Component reference (if the sail adds UI components)
6. Troubleshooting common issues

### Step 6: Register the sail

Add an entry to `sails/registry.json`:

```json
{
  "name": "my-sail",
  "displayName": "My Sail",
  "description": "One-line description",
  "category": "feature",
  "version": "1.0.0"
}
```

### Step 7: Add to CLI (optional)

If the sail should be available during project scaffolding, add it to `cli/src/prompts.ts`:

```typescript
const sails = await checkbox({
  message: "Select sails to install:",
  choices: [
    // ... existing choices
    {
      name: "My Sail -- description",
      value: "my-sail",
    },
  ],
});
```

And add the installation logic to `cli/src/sail-installer.ts`.

## Testing Sails

### Manual Testing

1. Create a fresh project from the template
2. Run the sail installer
3. Verify all files are copied correctly
4. Verify all marker insertions are correct
5. Run `npm run build` to check for TypeScript errors
6. Run `npm run dev` and test the feature end-to-end

### Automated Testing

Create a test script that:

1. Scaffolds a temporary project
2. Runs the installer
3. Checks that expected files exist
4. Checks that marker insertions are present
5. Runs the TypeScript compiler
6. Cleans up

```bash
#!/bin/bash
# sails/my-sail/test.sh

set -e

TEMP_DIR=$(mktemp -d)
echo "Testing in $TEMP_DIR"

# Clone template
cp -r . "$TEMP_DIR/test-project"
cd "$TEMP_DIR/test-project"

# Install dependencies
npm install

# Run sail installer (non-interactive for testing)
GOOGLE_CLIENT_ID=test GOOGLE_CLIENT_SECRET=test \
  npx tsx sails/my-sail/install.ts

# Check files exist
test -f packages/backend/src/routes/my-route.ts
test -f packages/frontend/src/pages/MyPage.tsx

# Check TypeScript compiles
npm run build

echo "All tests passed!"
rm -rf "$TEMP_DIR"
```

### Idempotency Testing

Run the installer twice and verify:

- No duplicate code insertions
- No file copy errors
- No duplicate npm installs
- The project still builds and runs

## Publishing Sails

### In-repo Sails

Sails that ship with the template live in the `sails/` directory. They are maintained alongside the template and guaranteed to be compatible.

### Community Sails

For third-party sails:

1. Create a standalone repository with the sail structure
2. Include a `compatibility` field in addon.json
3. Provide installation instructions that reference your repo
4. Test against the latest template version before publishing

### Versioning

- Use semver for sail versions
- Increment the major version when the sail changes in a breaking way
- Update the `compatibility` range when the template makes breaking changes

## Best Practices

### Code Quality

- Follow the same coding conventions as the base template
- Use TypeScript strictly (no `any` types, proper error handling)
- Include JSDoc comments for all exported functions and types
- Use the existing patterns (e.g., route structure, service layer, component style)

### Minimal Footprint

- Only modify files that absolutely need changing
- Prefer adding new files over modifying existing ones
- Keep marker insertions small and focused
- Don't introduce unnecessary dependencies

### Error Handling

- The installer should validate prerequisites before making changes
- Use try/catch around file operations and provide helpful error messages
- Make the installer idempotent (safe to run multiple times)
- Provide rollback guidance if installation fails partway through

### Environment Variables

- Always add new env vars to `.env.example`
- Provide clear descriptions for each variable
- Use Zod validation in `src/env.ts` so missing vars fail fast at startup
- Never commit actual secret values

### Documentation

- Write a comprehensive README for every sail
- Include screenshots or diagrams where helpful
- Document every API endpoint and component prop
- List common issues and their solutions
- Explain what external setup is needed (accounts, API keys, etc.)
