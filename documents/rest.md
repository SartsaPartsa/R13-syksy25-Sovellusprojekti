# REST API – Dokumentaatio

**Base URL (dev):** `http://localhost:3001/api`  
**Sisältötyyppi:** `application/json`  
**Autentikointi:** JWT – `Authorization: Bearer <token>`

---

## Pisteytettävät ominaisuudet

| # | Ominaisuus                  | Pisteet |
|---|-----------------------------|---------|
| 1 | Rekisteröityminen (signup)  | 1 p.    |
| 2 | Kirjautuminen (signin)      | 1 p.    |
| 3 | Profiilin hakeminen         | 1 p.    |
| 4 | Käyttäjätilin poistaminen   | 1 p.    |
| 5 | Haku (genret, elokuvat)     | 1 p.    |
|   | **Yhteensä**                | **5 p.**|

---

## Endpointit

| Metodi | Polku                                      | Kuvaus                                   | Request Body | Response (onnistuu) | Virheet | cURL-esimerkki |
|--------|--------------------------------------------|------------------------------------------|--------------|----------------------|---------|----------------|
| **POST** | `/user/signup` | Luo uusi käyttäjä | `{ "user": { "email":"test@004.com", "password":"Aa1234566$" } }` | **201 Created**: `{ "id": 1, "email": "test@004.com" }` | 400 Bad Request<br>409 Conflict | `curl -X POST http://localhost:3001/api/user/signup -H "Content-Type: application/json" -d '{"user":{"email":"test@004.com","password":"Aa1234566$"}}'` |
| **POST** | `/user/signin` | Kirjautuminen, palauttaa JWT | `{ "user": { "email":"test@004.com", "password":"Aa1234566$" } }` | **200 OK**: `{ "token":"<JWT>", "user":{ "id":1,"email":"test@004.com" } }` | 401 Unauthorized | `curl -X POST http://localhost:3001/api/user/signin -H "Content-Type: application/json" -d '{"user":{"email":"test@004.com","password":"Aa1234566$"}}'` |
| **GET** | `/user/profile` | Palauttaa käyttäjän profiilitiedot (token vaaditaan) | – | **200 OK**: `{ "id":1, "email":"test@004.com" }` | 401 Unauthorized | `curl http://localhost:3001/api/user/profile -H "Authorization: Bearer <JWT>"` |
| **DELETE** | `/user/me` | Poistaa kirjautuneen käyttäjän | – | **204 No Content** | 401 Unauthorized<br>404 Not Found | `curl -X DELETE http://localhost:3001/api/user/me -H "Authorization: Bearer <JWT>"` |
| **PATCH** | `/user/me/password` | Vaihda salasana | `{ "currentPassword":"Aa1234567$", "newPassword":"AAA123456$" }` | **200 OK**: `{ "message":"Password updated" }` | 400 Bad Request<br>401 Unauthorized | `curl -X PATCH http://localhost:3001/api/user/me/password -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" -d '{"currentPassword":"Aa1234567$","newPassword":"AAA123456$"}'` |
| **GET** | `/search/genres?language=fi-FI` | Hae genret (TMDB API proxy) | – | **200 OK**: `{ "genres":[{"id":28,"name":"Toiminta"}] }` | 401 Unauthorized | `curl "http://localhost:3001/api/search/genres?language=fi-FI" -H "Authorization: Bearer <JWT>"` |
| **GET** | `/search/movies?q=inception&page=1&language=fi-FI` | Hae elokuvia hakusanalla | – | **200 OK**: `{ "results":[{"id":27205,"title":"Inception"}],"page":1 }` | 401 Unauthorized | `curl "http://localhost:3001/api/search/movies?q=inception&page=1&language=fi-FI" -H "Authorization: Bearer <JWT>"` |

---

## Virheiden yleisformaatti

| Muoto | Esimerkki |
|-------|-----------|
| JSON  | `{ "error": "Bad Request", "message": "Password must be at least 8 characters" }` |

---

## Yleiset statuskoodit

| Koodi | Selitys |
|-------|---------|
| 200   | OK – pyyntö onnistui |
| 201   | Created – resurssi luotu |
| 204   | No Content – ei sisältöä |
| 400   | Bad Request – virheellinen syöte |
| 401   | Unauthorized – puuttuu/virheellinen token |
| 404   | Not Found – resurssia ei löydy |
| 409   | Conflict – esim. duplikaatti |
| 500   | Internal Server Error – palvelinvirhe |

---

## Sekvenssi: miten endpointit toimivat

| Vaihe | Toimija          | Mitä tapahtuu                          | Esimerkki |
|-------|------------------|-----------------------------------------|-----------|
| 1     | Käyttäjä (React) | Syöttää email + salasanan ja painaa nappia | "Kirjaudu sisään" |
| 2     | Frontend (React) | Lähettää HTTP-pyynnön                   | `POST /api/user/signin` |
| 3     | Backend (Express)| Validoi datan, tarkistaa tietokannasta  | `SELECT * FROM users WHERE email=...` |
| 4     | Tietokanta (PG)  | Palauttaa käyttäjän hashatun salasanan ja tiedot | `{ id:1, email:"..." }` |
| 5     | Backend (Express)| Luo JWT ja palauttaa sen vastauksessa   | `200 OK { "token":"<JWT>" }` |
| 6     | Frontend (React) | Tallentaa tokenin ja päivittää UI:n     | Näyttää: "Kirjautuminen onnistui" |
