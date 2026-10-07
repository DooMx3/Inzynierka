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

[README.md](../README.md)
2. Run app:

    ```bash
    maven spring-boot:run
    ```

# Additional information

## Creating SQL migrations with Liquibase

Create a new SQL file under `src/main/resources/db/migration`, for example `V6__add_organisation_website.sql`:

```sql
ALTER TABLE organisation
    ADD COLUMN website VARCHAR(255);
```

Then add a new changeset to `src/main/resources/db/changelog/db.changelog-master.xml`:

```xml
<changeSet id="V6" author="inzynierka">
    <sqlFile path="../migration/V6__add_organisation_website.sql"
             relativeToChangelogFile="true"/>
</changeSet>
```

Give every changeset a unique ID and add a new migration instead of editing one that may already have been applied. Liquibase records executed changesets and does not run them again.

## Other
- In dev environment, the application uses a local mail server (Mailpit) to send emails. You can access the Mailpit web interface at http://localhost:8025 to view sent emails.
- Api documentation is available at http://localhost:8080/swagger-ui.html