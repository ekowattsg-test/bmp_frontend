#!/bin/sh
# Load .env variables into environment and start Vite dev server
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi
npm run dev
