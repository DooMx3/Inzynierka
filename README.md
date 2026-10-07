<div align="center">

  <h1>TODO</h1>

  <p>Vinary and vineyard management software.</p>

  <p>
    <a href="https://github.com/DooMx3/Inzynierka/actions/workflows/backend-tests.yml">
      <img src="https://github.com/DooMx3/Inzynierka/actions/workflows/backend-tests.yml/badge.svg" alt="Backend Tests" />
    </a>
    <a href="https://github.com/DooMx3/Inzynierka/actions/workflows/latex-release.yml">
      <img src="https://github.com/DooMx3/Inzynierka/actions/workflows/latex-release.yml/badge.svg" alt="Doc build status" />
    </a>
  </p>

</div>

---
# About
Simple yet powerfull app made to help everyone involved in making wine. It allows to track harvests, wine batches, botteling and a lot more. It can also serve as a task management software for your vinary.

# Screenshots

## Run Locally
Firstly, setup postgres database and some kind of mail server and configure connection in [application.properties](backend/src/main/resources/application.properties)
Clone the project

```bash
  git clone https://github.com/DooMx3/Inzynierka/
```

Go to the project directory

```bash
  cd Inzynierka
```

Run backend

```bash
  cd backend
  mvn spring-boot:run
```

Run frontnend

```bash
  cd frontend
  bun dev
```

After that app should be available at localhost:3000


## Running Tests

To run backend tests, run the following commands:

```bash
  cd backend
  mvn test
```

To run frontend tests, run the following commands:

```bash
  cd frontend
  bun test
```

# Why
We made this app as a engineering thesis project, but maybe you can use it to make some lovely wine, who knows.

## License
All right reserved for now
