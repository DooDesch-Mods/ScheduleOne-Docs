# Serves the already-built site. Copied to the `deploy` branch by CI alongside the build output.
#
# There is deliberately no build stage: the ingest needs an authenticated `gh` and the .NET SDK to generate
# the API reference, and reproducing that inside a Docker build would mean a second copy of the pipeline and
# a GitHub token stored on the host. CI builds once, this image only serves what CI produced.

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY site /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
