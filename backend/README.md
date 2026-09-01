1. Start db server:
    ```bash
    docker run -d \
         --name inzynierka-psql \
         -e POSTGRES_USER=admin \
         -e POSTGRES_PASSWORD=password \
         -e POSTGRES_DB=backend \
         -p 5432:5432 \
         postgres:latest
    ```

2. Run app:

    ```bash
    maven spring-boot:run
    ```