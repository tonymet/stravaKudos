# A minimal Docker image with Node and Puppeteer
#
# Based upon:
# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-puppeteer-in-docker

FROM node:13.10-stretch-slim

# # Add user so we don't need --no-sandbox.
# RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
#     && mkdir -p /home/pptruser/Downloads \
#     && chown -R pptruser:pptruser /home/pptruser 
    
RUN  apt-get update \
     && apt-get install -y chromium --no-install-recommends \
     && rm -rf /var/lib/apt/lists/* 

# WORKDIR /home/pptruser

# # Run everything after as non-privileged user.
# USER pptruser

# Install Puppeteer under /node_modules so it's available system-wide
# ADD package*.json /home/pptruser/
ADD package*.json /
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
RUN npm ci

COPY . .
ENV STRAVA_USER="user@email.com"
ENV STRAVA_PWD="password"

CMD ["node", "strava.js"]
