# Selphos
> This project is complete. Some features listed in the docs are not yet implemented, and I'm not sure if I'll add them in the future.

So, what is Selphos? It’s simple—I’m just experimenting with how cloud-based storage works, which is something you might use. So I’m trying to create something similar, but for now, Phoeos is designed to store videos and photos. However, I might add some new features later.

---

## Replacing the Frontend
The current design may not be up to the highest standard. Under the MIT License, you are free to use, modify, and adapt the frontend to suit your own needs. Please refer to the file below to review the API response structure for each endpoint.

[API & Frontend Docs](/docs/foryou.md)

---

# Setup
Make sure you follow this :
* Docker - you need this to run Selphos
* Nginx - recommended as a reverse proxy
* SSL Certificate - if you wanna deploy to VPS

### 1. Clone the Repository
 
```bash
git clone https://github.com/your-username/selphos.git
cd selphos
```

 ### 2. Configure Environment Variables
  
 Copy the example environment file and fill in your values:
  
 ```bash
 cp .env.example .env
 ```

### 3. Start the Services
   
```bash
docker compose up -d
```

or

```bash
docker-compose up --build
```
   
> The backend waits for MySQL, Redis, and RustFS to be healthy before starting. On first run, this may take up to 30–60 seconds.


## Useful Commands
 
```bash
# Start all services in the background
docker compose up -d
 
# View logs for all services
docker compose logs -f
 
# View logs for a specific service
docker compose logs -f backend
 
# Stop all services
docker compose down
 
# Stop and remove all volumes (WARNING: deletes all data)
docker compose down -v
 
# Rebuild images after code changes
docker compose up -d --build
```