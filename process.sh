#!/bin/bash

cd "$(dirname "$0")" || exit 1

./service/target/release/whatsaly-api
