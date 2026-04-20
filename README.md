# Inzynierka

## Database visual editor

- We are using new God's editor named dbdiagram.io
- Each of us need's to have their own project on this God's website
- Till we finish nothing matter, just place the tables randomly on grid, in the end God's unfortunate will need to move relations lines to be visible

[Editor](https://dbdiagram.io/)

###### Good practices

- Export SQL and push it to git (just to be sure that we have a backup if site goes down).
- Always wait for other team member to finish their work before you start your's (to prevent bugs).

###### Disclamer

This visual editor is not supporting live editing sessions in real time.

[![Build status](https://github.com/DooMx3/Inzynierka/actions/workflows/latex-release.yml/badge.svg)](https://github.com/DooMx3/Inzynierka/actions/workflows/latex-release.yml)

## Database and User Stories compatibility

### Guest User
1. winery’s website offerings: todo
2. create an account: adds record to user
3. reset password: todo
4. log in: uses passwordHash and email fields in the users table
5. open a page with info about the wine batch: qrCodeKey field in wine_batch

### Logged-in user
1. log out: done
2. change password: modifies passwordHash in user
3. change email: modifies email in user
4. change phone number: modifies phoneNumber in user
5. delete account: removes record from user
6. create an organization: checks if user's role != owner; creates record in organization; assigns organizationId in user; assigns role = owner
7. join organization: reads user.email; owner adds user; user.membershipStatus = PENDING; ...

### Vineyard Worker

### Oenologist

### Vineyard Owner
1. production efficiency report: uses harvest.amount, 
job.startedAt, job.completedAt, job.harvestId, field.area, wine_batch.spoiled, job.completedAt (where jobType = 'BOTTLING')
2. diversity of grapevine varieties: grape_type.name, field.area, job.startedAt, job.completedAt, wine_batch.quantity
3. vineyard operations report: frequency of job.jobType (releted to vineyard), equipment (unitCost, name), harvest, dates
4. historical trend report: report table

All reports are to be saved in reports table

5. 

### Administrator
