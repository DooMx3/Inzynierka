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
   
2. Start dev mail server:

    ```bash
    docker run -d \
   --name inzynierka-mailpit \
   -p 1025:1025 \
   -p 8025:8025 \
   axllent/mailpit
   ```


2. Run app:

    ```bash
    maven spring-boot:run
    ```

# Additional information
- In dev environment, the application uses a local mail server (Mailpit) to send emails. You can access the Mailpit web interface at http://localhost:8025 to view sent emails.
- Api documentation is available at http://localhost:8080/swagger-ui.html
- Liquibase applies the database changes from `src/main/resources/db/changelog/db.changelog-master.xml` on application startup. The changelog currently reuses the existing SQL migration files under `src/main/resources/db/migration`.
- When switching an existing database from Flyway, back it up first. If its schema already includes all five migrations, run Liquibase `changelog-sync` once against that database with this changelog before starting the new application. This records the changesets as already applied; it does not execute or modify their SQL. Do not use this baseline on an empty or partially migrated database.