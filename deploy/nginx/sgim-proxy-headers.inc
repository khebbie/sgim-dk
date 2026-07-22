# Shared proxy headers for the sgim vhosts (sgim-0lt.4).
#
# X-Forwarded-Proto/Host are what adapter-node reads (PROTOCOL_HEADER /
# HOST_HEADER) to reconstruct the public origin. Without them SvelteKit builds
# http:// URLs behind the TLS-terminating proxy and rejects form POSTs, which
# breaks login and the duty actions.
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;

# Allow websocket upgrades (Strapi admin uses them for live reload/preview).
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;

proxy_connect_timeout 5s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
