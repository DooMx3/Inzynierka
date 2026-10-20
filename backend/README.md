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
Update db state(spring runs this automatically on app start) 
```bash
mvn clean compile liquibase:update
```
Generate new migration file
```bash
mvn clean compile liquibase:diff -Dliquibase.diffChangeLogFile=src/main/resources/db/changelog/changes/<new_migration_file>.xml
```

Namin convention for migration files: `YYYY-MM-DD-{XXX}-<description>.xml`
XXX - zero padded number of migration file for given day, e.g. 001, 002, 003 etc.
## Other
- In dev environment, the application uses a local mail server (Mailpit) to send emails. You can access the Mailpit web interface at http://localhost:8025 to view sent emails.
- Api documentation is available at http://localhost:8080/swagger-ui.html
- Code is formated using Spotless. You can run `mvn spotless:apply` to format the code. You can use open-java-format plugin in your IDE to format the code automatically on save.
