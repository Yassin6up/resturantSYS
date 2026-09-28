# Stock Caddy images don't include DNS provider plugins, and a wildcard TLS
# cert (for *.{$APP_DOMAIN}) needs a DNS-01 challenge - so this builds Caddy
# with the Cloudflare DNS module via xcaddy. Swap the module below if you use
# a different DNS provider (see https://github.com/caddy-dns for the full list).
FROM caddy:2-builder-alpine AS builder

RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
