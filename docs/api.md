# API aplikacji

## Informacje podstawowe

Adres bazowy środowiska lokalnego:

```text
http://localhost:8080
```

Wszystkie przykłady używają formatu JSON:

```http
Content-Type: application/json
```

Endpointy `/api/auth/**` oraz `/api/organisations/**` są obecnie dostępne bez
uwierzytelnienia. Dostęp do organizacji jest otwarty wyłącznie na potrzeby
testów i powinien zostać zmieniony przed wdrożeniem.

## Uwierzytelnianie

### Rejestracja użytkownika

```http
POST /api/auth/register
```

Body:

```json
{
  "firstname": "Jan",
  "email": "jan@example.com",
  "password": "haslo123"
}
```

Odpowiedź:

- `200 OK`
- puste body,
- odpowiedź ustawia cookie `jwt` zawierające token JWT.

Błędy:

- `500 Internal Server Error` — błąd zapisu użytkownika lub bazy danych.

Notatki:

- Hasło jest zapisywane jako hash.
- Cookie `jwt` jest ustawiane jako `HttpOnly`.

### Logowanie

```http
POST /api/auth/authenticate
```

Body:

```json
{
  "email": "jan@example.com",
  "password": "haslo123"
}
```

Odpowiedź:

- `200 OK`
- puste body,
- odpowiedź ustawia cookie `jwt`.

Błędy:

- `403 Forbidden` — uwierzytelnienie zostało odrzucone przez Spring Security,
  np. z powodu niepoprawnych danych logowania,
- `500 Internal Server Error` — inny błąd aplikacji lub bazy danych.

### Wylogowanie

```http
POST /api/auth/logout
```

Body: brak.

Odpowiedź:

- `200 OK`,
- puste body,
- cookie `jwt` zostaje usunięte.

## Organizacje

Organizacja jest identyfikowana przez `UUID`.

### Utworzenie organizacji

```http
POST /api/organisations
```

Body:

```json
{
  "name": "Winnica Nad Wisłą",
  "taxId": "1234567890",
  "street": "ul. Winna 1",
  "postalCode": "20-001",
  "city": "Lublin",
  "logoPath": "/logos/winnica.png",
  "motto": "Tradycja w każdej butelce"
}
```

Pola:

| Pole | Typ | Wymagane | Opis |
|---|---|---:|---|
| `name` | `string` | tak | nazwa organizacji |
| `taxId` | `string` | nie | numer podatkowy |
| `street` | `string` | nie | ulica i numer |
| `postalCode` | `string` | nie | kod pocztowy |
| `city` | `string` | tak | miasto |
| `logoPath` | `string` | nie | ścieżka do logo |
| `motto` | `string` | nie | motto organizacji |

Odpowiedź:

- `200 OK`

```json
{
  "id": "c0a86510-a080-161c-81a0-801935740000",
  "name": "Winnica Nad Wisłą",
  "taxId": "1234567890",
  "street": "ul. Winna 1",
  "postalCode": "20-001",
  "city": "Lublin",
  "logoPath": "/logos/winnica.png",
  "motto": "Tradycja w każdej butelce",
  "active": true,
  "createdAt": "2026-09-08T10:18:50.872933"
}
```

Błędy:

- `400 Bad Request` — brak `name` lub `city`, albo puste wartości,
- `500 Internal Server Error` — błąd zapisu organizacji.

Notatki:

- `id`, `active` i `createdAt` są ustawiane przez backend.
- Nowa organizacja jest aktywna (`active = true`).

### Pobranie organizacji

```http
GET /api/organisations/{id}
```

Przykład:

```http
GET /api/organisations/c0a86510-a080-161c-81a0-801935740000
```

Body: brak.

Odpowiedź:

- `200 OK` — obiekt organizacji w formacie pokazanym przy tworzeniu.

Błędy:

- `500 Internal Server Error` — organizacja nie istnieje lub identyfikator
  ma nieprawidłowy format.

### Pełna aktualizacja organizacji

```http
PUT /api/organisations/{id}
```

Body musi zawierać cały obiekt edytowalnych danych:

```json
{
  "name": "Winnica Nad Wisłą - Oddział Lublin",
  "taxId": "1234567890",
  "street": "ul. Nowa 10",
  "postalCode": "20-002",
  "city": "Lublin",
  "logoPath": "/logos/nowe-logo.png",
  "motto": "Nowe motto"
}
```

Odpowiedź:

- `200 OK` — zaktualizowana organizacja.

Błędy:

- `400 Bad Request` — brak `name` lub `city`,
- `500 Internal Server Error` — organizacja nie istnieje albo jest nieaktywna.

Notatki:

- `PUT` zastępuje wszystkie edytowalne pola wartościami z requestu.
- Do zmiany pojedynczych pól użyj `PATCH`.
- Nie przesyłaj `id`, `active` ani `createdAt`.

### Częściowa aktualizacja organizacji

```http
PATCH /api/organisations/{id}
```

Body może zawierać tylko pola, które mają zostać zmienione:

```json
{
  "motto": "Nowe motto"
}
```

Odpowiedź:

- `200 OK` — zaktualizowana organizacja.

Błędy:

- `500 Internal Server Error` — organizacja nie istnieje albo jest nieaktywna.

Notatki:

- Pominięte pola pozostają bez zmian.
- W aktualnej implementacji przesłanie wartości `null` jest traktowane tak
  samo jak pominięcie pola, więc nie służy do czyszczenia danych.
- Nie przesyłaj `id`, `active` ani `createdAt`.

### Usunięcie organizacji

```http
DELETE /api/organisations/{id}
```

Body: brak.

Odpowiedź:

- `204 No Content`.

Notatki:

- Jest to soft delete.
- Rekord organizacji pozostaje w bazie.
- `id` i pozostałe dane organizacji pozostają zachowane.
- Zmieniane jest tylko `active` na `false`.
- Nie należy wywoływać fizycznego `delete` bezpośrednio na repozytorium.

Błędy:

- `500 Internal Server Error` — organizacja nie istnieje lub identyfikator
  ma nieprawidłowy format.

## Zasady wspólne

Wartości generowane przez backend (`id`, `active`, `createdAt`) nie powinny być
przesyłane w requestach tworzenia ani aktualizacji.

Aktualne kody błędów są zgodne z obecną implementacją.
