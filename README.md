# UNLOQ.io Node.js back-end cache for permission systems
## Full documentation will be available soon

### Full docs: https://docs.unloq.io

#### Docker info
```bash
docker pull snupa/uiamp
docker run --env APP_SECRET=YOUR_RANDOM_32_LENGTH_CHARACTER_APP_SECRET \
           --env UNLOQ_KEY=YOUR_UNLOQ_API_KEY \
           --env PORT=6801 \
           snupa/uiamp
```

#### How to create a UIAMP client key
```
docker exec -it CONTAINER_ID npm run token
```

#### Node.js client
- https://github.com/UNLOQIO/UIAMP-client
