# Flux-Mask Docker Example

This example demonstrates how to use the `winm2m/fluxmask-nginx` Docker image to protect an upstream service.

## Prerequisites

- Docker
- Docker Compose

## Structure

- `docker-compose.yml`: Defines the services (flux-mask and upstream).
- `flux-mask.conf`: Configuration for the flux-mask nginx instance (defines the upstream).
- `upstream/`: Contains the upstream Node.js service and web UI.

## Running the Example

1. The example uses the `winm2m/fluxmask-nginx` image. You can pull it from Docker Hub or build it if you have access to the main `flux-mask` repository:
   ```bash
   # If building from source (requires flux-mask repository)
   docker build -t winm2m/fluxmask-nginx -f ../../../packages/docker/Dockerfile ../../../
   ```

2. Start the services:
   ```bash
   docker-compose up
   ```

3. Access the Web UI:
   Open http://localhost:8080 in your browser.

   The Web UI is served by the upstream service through the flux-mask proxy.
   Requests to `/api/` are encrypted by the client (browser) and decrypted by flux-mask before reaching the upstream service.
   Responses are encrypted by flux-mask and decrypted by the client.

## Configuration

The `flux-mask.conf` file defines the upstream server:

```nginx
upstream backend {
    server upstream:8080;
}
```

The `winm2m/fluxmask-nginx` image is configured to proxy all requests to `http://backend`.

## License

This example runs in trial mode (max 10 connections) because no license file is provided.
To use a license, mount it to `/etc/flux-mask/license.key` and the public key to `/etc/flux-mask/license_pubkey.pem`.
