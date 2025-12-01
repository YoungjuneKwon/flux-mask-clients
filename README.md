# Flux-Mask Client Libraries

Client-side libraries for Flux-Mask encryption.

## Packages

### [@flux-mask/core](packages/core)
Core encryption utilities and shared types.

### [@flux-mask/axios-interceptor](packages/axios-interceptor)
Axios interceptor for automatic request/response encryption.

### [@flux-mask/fetch-wrapper](packages/fetch-wrapper)
Fetch API wrapper with built-in encryption.

## Installation

```bash
# Install specific package
npm install @flux-mask/axios-interceptor
npm install @flux-mask/fetch-wrapper

# Core is installed automatically as a dependency
```

## Usage

### Axios Interceptor

```typescript
import axios from 'axios';
import { setupFluxMaskInterceptor } from '@flux-mask/axios-interceptor';

const api = axios.create({
  baseURL: 'https://api.example.com'
});

setupFluxMaskInterceptor(api, {
  enabled: true,
  urlPatterns: ['/api/.*'],
  excludePatterns: ['/api/public/.*']
});

// Use axios as normal - encryption is automatic
const response = await api.post('/api/users', { name: 'John' });
```

### Fetch Wrapper

```typescript
import { createFluxMaskFetch } from '@flux-mask/fetch-wrapper';

const secureFetch = createFluxMaskFetch({
  enabled: true,
  urlPatterns: ['/api/.*']
});

// Use like regular fetch
const response = await secureFetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John' })
});
```

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Publish all packages
npm run publish:all
```

## License

MIT
