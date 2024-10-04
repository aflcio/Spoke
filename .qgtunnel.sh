#!/bin/sh
cat > .qgtunnel << EOL
[qgtunnel.0]
accept = "127.0.0.1:5439"
connect = "${WAREHOUSE_DB_HOST_REAL}:${WAREHOUSE_DB_PORT}"
encrypted = false
transparent = true
EOL
echo "Saved .qgtunnel config for ${WAREHOUSE_DB_HOST_REAL}:${WAREHOUSE_DB_PORT}"
