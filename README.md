# MCP Server New Relic

MCP Server for New Relic - Platform-native schema-agnostic implementation

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- New Relic account with API access
- New Relic API Key (User or License key)

### Installation

```bash
# Clone the repository
git clone https://github.com/deepaucksharma/nr-mcp.git
cd nr-mcp

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your New Relic credentials
```

### Configuration

Edit the `.env` file with your New Relic settings:

```env
NEW_RELIC_API_KEY=your_api_key_here
NEW_RELIC_ACCOUNT_ID=your_account_id_here
NEW_RELIC_REGION=US  # or EU
```

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Check types
npm run typecheck

# Lint code
npm run lint
```

### Build

```bash
# Build for production
npm run build

# Run production build
node dist/index.js
```

## Project Status

This is the v2.0.0 implementation of the New Relic MCP server, featuring:

- ✅ Core MCP server infrastructure
- ✅ TypeScript with strict mode
- ✅ Environment-based configuration
- ✅ Structured logging with correlation IDs
- ✅ Health check endpoint
- 🚧 Platform discovery engine (in progress)
- 🚧 Tool enhancement layer (planned)
- 🚧 Adaptive dashboard generation (planned)

## Architecture

The server follows a modular architecture with clear separation of concerns:

- **config/**: Environment configuration management
- **types/**: TypeScript type definitions
- **utils/**: Utility functions (logging, etc.)
- **handlers/**: Request handlers for MCP tools

## License

MIT