# Agente

Carpeta de trabajo del agente de Abdi.

## MCP conectados

### Apify

Servidor MCP remoto de Apify (HTTP). Da acceso a los actores de Apify para
scraping y extracción de datos.

- URL: `https://mcp.apify.com`
- Transporte: HTTP
- Scope: local (registrado para esta carpeta)

Instalación:

```bash
claude mcp add --transport http apify https://mcp.apify.com
```

El servidor pide autenticación con cuenta de Apify. Se resuelve con el comando
`/mcp` desde una terminal interactiva de Claude Code abierta en esta carpeta:
ahí se lanza el flujo de login en el navegador.

Para verificar el estado:

```bash
claude mcp list
```
