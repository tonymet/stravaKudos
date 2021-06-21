FROM node:16-buster-slim

RUN apt-get update \
    && apt-get install -y wget gnupg libxss1 chromium \
    # && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    # && sh -c 'echo "deb [arch=armhf] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    ## && apt-get update \
    # && apt-get install -y google-chrome\
    ##  --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

#RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    #&& sh -c 'echo "deb [arch=armhf] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  #  && sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    #&& apt-get install -y google-chrome-unstable
ADD package*.json /

RUN npm ci --no-scripts --production\
    # Add user so we don't need --no-sandbox.
    # same layer as npm install to keep re-chowned files from using up several hundred MBs more space
    && groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /node_modules

# Run everything after as non-privileged user.
USER pptruser

COPY strava.js strava.js
ENV STRAVA_USER="user@email.com"
ENV STRAVA_PWD="password"
ENV TERM xterm-256color

CMD ["node", "strava.js"]
