# MCP I Use

**MCP compatibility tables for IDEs and AI assistants.**

A community-maintained reference for [Model Context Protocol (MCP)](https://modelcontextprotocol.io) client support across different development environments.

Live site: [mcpiuse.com](https://mcpiuse.com)

## What is MCP?

The Model Context Protocol is an open standard that enables AI assistants to connect to external data sources and tools. MCP support varies significantly across different IDE and AI assistant combinations.

This project tracks:
- **MCP Features**: Tools, Resources, Prompts, Sampling, Elicitation, Roots
- **Transport Support**: stdio (local), Streamable HTTP (remote), SSE (deprecated)
- **Changelog**: Spec updates and client releases

## Data Structure

```
data/
├── ides/              # IDE definitions
│   ├── vscode.json
│   ├── cursor.json
│   └── ...
├── ai-clients/        # AI assistant definitions
│   ├── github-copilot.json
│   ├── claude-code.json
│   └── ...
├── features/          # MCP feature support matrices
│   ├── tools.json
│   ├── resources.json
│   └── ...
├── transports/        # Transport support matrices
│   ├── stdio.json
│   ├── http.json
│   └── ...
└── changelog.json     # Spec and client updates
```

## Support Codes

| Code | Meaning |
|------|---------|
| `y` | Yes, fully supported |
| `a` | Almost/partial support |
| `n` | No support |
| `u` | Unknown/untested |
| `d` | Disabled by default |
| `#n` | Reference to numbered note |

## Contributing

We welcome contributions! To update support data:

1. Fork this repository
2. Edit the relevant JSON file in `data/`
3. Submit a pull request with evidence (docs, release notes, testing)

### Adding a new IDE

Create `data/ides/your-ide.json`:

```json
{
  "id": "your-ide",
  "name": "Your IDE",
  "vendor": "Vendor Name",
  "category": "ide",
  "website": "https://...",
  "mcp_docs": "https://...",
  "config_paths": [".your-ide/mcp.json"],
  "min_mcp_version": "1.0",
  "compatible_ai_clients": ["github-copilot", "cline"],
  "notes": {
    "1": "Any relevant notes"
  }
}
```

### Adding a new AI client

Create `data/ai-clients/your-client.json`:

```json
{
  "id": "your-client",
  "name": "Your AI Client",
  "vendor": "Vendor Name",
  "website": "https://...",
  "docs": "https://...",
  "compatible_ides": ["vscode", "jetbrains"],
  "notes": {
    "1": "Any relevant notes"
  }
}
```

### Updating feature support

Edit the relevant file in `data/features/` or `data/transports/`:

```json
{
  "stats": {
    "vscode+github-copilot": "y",
    "jetbrains+jetbrains-ai": "n #1"
  },
  "notes": {
    "1": "Explanation for the limitation"
  }
}
```

The key format is `ide-id+ai-client-id`.

### Adding changelog entries

Add to `data/changelog.json`:

```json
{
  "date": "2025-01-15",
  "type": "client",
  "client": "vscode+github-copilot",
  "title": "VS Code adds new feature",
  "description": "Description of the update",
  "links": [
    {"title": "Announcement", "url": "https://..."}
  ]
}
```

## Local Development

This is a static site with no build step. To run locally:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Using PHP
php -S localhost:8000
```

Then open http://localhost:8000

## Deployment

The site is deployed via GitHub Pages from the `main` branch.

## Related Resources

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [Official MCP Clients List](https://modelcontextprotocol.io/clients)
- [MCP GitHub Organization](https://github.com/modelcontextprotocol)

## License

MIT License - see [LICENSE](LICENSE)

## Acknowledgments

Inspired by [caniuse.com](https://caniuse.com) and the [Fyrd/caniuse](https://github.com/Fyrd/caniuse) data repository.
