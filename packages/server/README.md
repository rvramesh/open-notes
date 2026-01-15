# Server-Side Settings

This package provides server-side settings management for Open Notes, enabling strongly-typed configuration access on the server.

## Architecture

### Shared Types (`@open-notes/shared`)
- Common settings types shared between client and server
- `Settings` - Full settings structure
- `ServerConfig` - Server-specific configuration subset
- `ModelConfiguration` - AI model configuration
- `Category` - Note category definitions

### Server Settings Manager
Located in `packages/server/src/settings-manager.ts`, provides:
- Singleton instance for consistent config access
- Async loading from file system
- Type-safe configuration access
- Automatic validation

### File System Adapter
Located in `packages/server/src/adapters/FileSystemSettingsAdapter.ts`, handles:
- Reading/writing settings from JSON file
- Default location: `~/.open-notes/settings.json`
- Merging with default values
- Server config extraction

## Usage

### Basic Server Usage

```typescript
import { getSettingsManager } from './settings-manager.js';

// In your server initialization
const settingsManager = getSettingsManager();
await settingsManager.load();

// Access configuration
const config = await settingsManager.getConfig();
console.log('Language Model:', config.languageModel);
console.log('Categories:', config.categories);

// Synchronous access (after loading)
const configSync = settingsManager.getConfigSync();
```

### API Endpoints

The server exposes two endpoints:

#### Get Server Configuration
```
GET /api/settings
```
Returns the current server configuration as JSON.

#### Reload Settings
```
POST /api/settings/reload
```
Reloads settings from the file system.

### Custom Settings Location

```typescript
import { FileSystemSettingsAdapter } from './adapters/FileSystemSettingsAdapter.js';
import { getSettingsManager } from './settings-manager.js';

const adapter = new FileSystemSettingsAdapter('/custom/path/settings.json');
const settingsManager = getSettingsManager(adapter);
await settingsManager.load();
```

## Settings File Format

The settings file (`~/.open-notes/settings.json`) follows this structure:

```json
{
  "theme": "dark",
  "fontSize": "md",
  "languageModel": {
    "provider": "openai",
    "modelName": "gpt-4",
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-..."
  },
  "embeddingModel": {
    "provider": "openai",
    "modelName": "text-embedding-3-small",
    "apiKey": "sk-..."
  },
  "categories": [
    {
      "id": "cat-001",
      "name": "Work",
      "color": "blue",
      "enrichmentPrompt": "Add professional context and insights",
      "noEnrichment": false
    }
  ],
  "genericEnrichmentPrompt": "Enhance the note with relevant context...",
  "categoryRecognitionPrompt": "Analyze the note and determine...",
  "editorSettings": {
    "autoSave": true,
    "autoSaveInterval": 10
  }
}
```

## Server Config vs Full Settings

### ServerConfig (Server-Side)
Includes only what the server needs:
- `languageModel` - AI model for text generation
- `embeddingModel` - AI model for embeddings
- `categories` - Note categories for classification
- `genericEnrichmentPrompt` - Default enrichment prompt
- `categoryRecognitionPrompt` - Category classification prompt

### Settings (Full)
Includes both server and client preferences:
- All ServerConfig fields
- `theme` - UI theme preference (client-only)
- `fontSize` - UI font size (client-only)
- `editorSettings` - Editor preferences (client-only)

## Client Integration

### Hybrid Adapter
The client can use `HybridSettingsAdapter` to sync with the server:

```typescript
import { HybridSettingsAdapter } from './adapters/HybridSettingsAdapter';

const adapter = new HybridSettingsAdapter('http://localhost:3001');
// Settings are saved locally and synced to server
```

### Type Safety
All settings are strongly typed using TypeScript interfaces:

```typescript
import type { ServerConfig, ModelConfiguration } from '@open-notes/shared/settings-types';

function processConfig(config: ServerConfig) {
  if (config.languageModel) {
    const model: ModelConfiguration = config.languageModel;
    // Full type safety and IntelliSense
  }
}
```

## Default Values

Settings fall back to sensible defaults defined in `DEFAULT_SETTINGS`:
- Theme: `system`
- Font size: `md`
- Categories: `[]` (empty)
- Generic enrichment prompt: Predefined template
- Category recognition prompt: Predefined template
- Editor auto-save: `true`
- Auto-save interval: `10` seconds

## Best Practices

1. **Load settings on server start**
   ```typescript
   const settingsManager = getSettingsManager();
   await settingsManager.load();
   ```

2. **Use async getConfig() for safety**
   ```typescript
   // Ensures settings are loaded
   const config = await settingsManager.getConfig();
   ```

3. **Cache configuration in request handlers**
   ```typescript
   fastify.get('/api/enrich', async (request, reply) => {
     const config = settingsManager.getConfigSync(); // Fast, after initial load
     // Use config...
   });
   ```

4. **Reload on file changes**
   ```typescript
   // Manual reload
   await settingsManager.reload();
   
   // Or expose reload endpoint
   fastify.post('/api/settings/reload', async () => {
     await settingsManager.reload();
     return { success: true };
   });
   ```

## Security Considerations

- API keys in settings files should be protected with appropriate file permissions
- Consider environment variables for sensitive data:
  ```typescript
  const config = await settingsManager.getConfig();
  const apiKey = process.env.OPENAI_API_KEY || config.languageModel?.apiKey;
  ```
- Settings file location can be customized to secure locations
- Server endpoints should be protected with authentication in production

## Testing

```typescript
import { SettingsManager } from './settings-manager';
import { FileSystemSettingsAdapter } from './adapters/FileSystemSettingsAdapter';

// Reset singleton for tests
SettingsManager.resetInstance();

// Use test adapter
const testAdapter = new FileSystemSettingsAdapter('/tmp/test-settings.json');
const manager = SettingsManager.getInstance(testAdapter);
await manager.load();
```
