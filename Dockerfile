FROM node:16-buster-slim
ARG TARGETARCH amd64
RUN apt-get update \
    && apt-get install -y wget gnupg libxss1; \
	# google builds only for amd64 -- use open source chromium otherwise
	case $TARGETARCH in \
		arm) \
			apt-get install -y chromium \
			;;\
		amd64) \
			wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - ;\
			sh -c 'echo "deb [arch=$TARGETARCH] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' ;\
			apt-get update; \
			apt-get install -y google-chrome-unstable; \
			ln -s /usr/bin/google-chrome-unstable /usr/bin/chromium \
			;; \
		*) \
			echo "$TARGETARCH not supported"; \
			exit 1\
			;;\
	esac\
    && rm -rf /var/lib/apt/lists/*

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
