#!/bin/bash

cd "$(dirname "$0")/api" || { echo "Error: api directory not found"; exit 1; }

# Supports Linux and MacOS
go run .