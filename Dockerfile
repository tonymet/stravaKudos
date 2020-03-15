FROM node:13.10-stretch-slim
    
RUN  apt-get update \
     && apt-get install -y chromium --no-install-recommends \
     && rm -rf /var/lib/apt/lists/* 

ADD package*.json /
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
RUN npm ci

COPY . .
ENV STRAVA_USER="user@email.com"
ENV STRAVA_PWD="password"

CMD ["node", "strava.js"]
