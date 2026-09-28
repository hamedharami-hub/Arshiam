#!/usr/bin/env bash
# Bridge: supervisor runs `yarn expo start --port 3000` in /app/frontend.
# ARSHNAZ is a Vite app living at /app, so we ignore the args and start Vite.
cd /app && exec node_modules/.bin/vite --host 0.0.0.0 --port 3000
