#!/bin/bash
set -e

cd /home/martinhorak/githubActions

echo "Building React app inside Docker..."

# Restore Vite source index.html (build overwrites it with the dist version)
cat > index.html << 'TEMPLATE'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Actions Dashboard — DEAPCZ</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
TEMPLATE

# Build inside a Node container
docker run --rm \
  -v "$(pwd)":/app \
  -w /app \
  node:20-alpine \
  sh -c "rm -rf dist && npm ci && npm run build"

# Clean old build artifacts from the serve directory
rm -rf assets 2>/dev/null || true

# Copy built files (overwrites index.html with the built version containing hashed asset refs)
cp -r dist/* .

echo "Build complete. Files deployed to $(pwd)"
echo "Run: cd /home/martinhorak/n8n && docker compose exec nginx nginx -s reload"
