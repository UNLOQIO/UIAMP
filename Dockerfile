FROM snupa/node:latest

# Environment vars
ENV NODE_ENV production

# Create app directory
WORKDIR /$user/src/app
COPY . /$user/src/app
RUN npm install -qp
RUN chown -R $user:$user /$user/src/app/
USER $user

ENTRYPOINT [ "node", "launch.js" ]
