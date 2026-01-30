#!/bin/bash

cd "$(dirname "$0")/service" || {  exit 1; }

cargo run --release
