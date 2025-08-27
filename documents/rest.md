# REST API -dokumentaatio (taulukko)

**Base URL (dev):** `http://localhost:3000/api`  
**Sisältötyyppi:** `application/json`  
**Autentikointi:** JWT `Authorization: Bearer <token>`

---

## Testattavat toiminnot ja pisteytys

| # | Ominaisuus                    | Pisteet |
|---|-------------------------------|---------|
| 1 | Kirjautuminen                 | 1 p.    |
| 2 | Uloskirjautuminen             | 1 p.    |
| 3 | Rekisteröityminen             | 1 p.    |
| 4 | Rekisteröitymisen poistaminen | 1 p.    |
| 5 | Arvostelujen selaaminen       | 1 p.    |
|   | **Yhteensä**                  | **5 p.**|

---

## Endpointit

| Metodi | Polku              | Kuvaus | Request Body | Response (onnistuu) | Virheet | cURL-esimerkki |
|--------|--------------------|--------|--------------|----------------------|---------|----------------|
| **POST** | `/auth/register` | Rekisteröityminen (luo uusi käyttäjä) | ```json\n{ "email": "user@example.com", "password": "Secret123!", "name": "Matti" }\n``` | **201** Created:<br>```json\n{ "id": 42, "email": "user@example.com", "name": "Matti" }\n``` | 400 Bad Request<br>409 Conflict | ```bash\ncurl -X POST http://localhost:3000/api/auth/register \\\n -H "Content-Type: application/json" \\\n -d '{"email":"user@example.com","password":"Secret123!","name":"Matti"}'\n``` |
| **POST** | `/auth/login` | Kirjautuminen (palauttaa JWT) | ```json\n{ "email": "user@example.com", "password": "Secret123!" }\n``` | **200** OK:<br>```json\n{ "token":"<JWT>", "user": { "id":42, "email":"user@example.com", "name":"Matti" } }\n``` | 401 Unauthorized | ```bash\ncurl -X POST http://localhost:3000/api/auth/login \\\n -H "Content-Type: application/json" \\\n -d '{"email":"user@example.com","password":"Secret123!"}'\n``` |
| **POST** | `/auth/logout` | Uloskirjautuminen (vaatii tokenin) | – (vain header) | **204** No Content | 401 Unauthorized | ```bash\ncurl -X POST http://localhost:3000/api/auth/logout \\\n -H "Authorization: Bearer <JWT>"\n``` |
| **DELETE** | `/auth/account` | Käyttäjätilin poistaminen | – (vain header) | **204** No Content | 401 Unauthorized<br>404 Not Found | ```bash\ncurl -X DELETE http://localhost:3000/api/auth/account \\\n -H "Authorization: Bearer <JWT>"\n``` |
| **GET** | `/reviews` | Arvostelujen selaaminen (julkinen) | – (query-parametrit optionaalisia: `?page=1&limit=20`) | **200** OK:<br>```json\n{ "items":[ { "id":1,"movie_id":"603692","title":"John Wick","rating":5,"text":"Tykkäsin!","author_email":"user@example.com","created_at":"2025-08-20T12:00:00Z"} ], "page":1,"limit":20,"total":37 }\n``` | – | ```bash\ncurl "http://localhost:3000/api/reviews?page=1&limit=10"\n``` |

---

## Virheiden yleisformaatti

| Muoto | Esimerkki |
|-------|-----------|
| **JSON** | ```json\n{ "error": "Bad Request", "message": "password must be at least 8 characters" }\n``` |

**Yleiset statuskoodit**

| Koodi | Selitys |
|-------|---------|
| 200   | OK – pyyntö onnistui |
| 201   | Created – resurssi luotu |
| 204   | No Content – ei sisältöä |
| 400   | Bad Request – virheellinen syöte |
| 401   | Unauthorized – ei/virheellinen token |
| 404   | Not Found – resurssia ei löydy |
| 409   | Conflict – ristiriita (esim. duplikaatti) |
| 500   | Internal Server Error – palvelinvirhe |

---

## Miten endpointit toimivat

| Vaihe | Toimija            | Mitä tapahtuu | Esimerkki |
|-------|--------------------|----------------|-----------|
| 1     | **Käyttäjä (React)** | Syöttää tietonsa UI:hin ja painaa nappia | "Kirjaudu" painike |
| 2     | **Frontend (React)** | Lähettää HTTP-pyynnön endpointille | `POST /api/auth/login` body: `{ "email":"u@test.fi","password":"Secret123!" }` |
| 3     | **Backend (Express)** | Vastaanottaa pyynnön, validoi datan ja kysyy tietokannasta | SQL: `SELECT * FROM users WHERE email=...` |
| 4     | **Tietokanta (Postgres)** | Palauttaa käyttäjätiedot jos löytyy | `{ id:1, email:"u@test.fi", password_hash:"..." }` |
| 5     | **Backend (Express)** | Luo vastauksen (esim. token) ja palauttaa sen frontille | `200 OK { "token":"<JWT>" }` |
| 6     | **Frontend (React)** | Saa vastauksen ja päivittää käyttöliittymän | Näyttää: "Kirjautuminen onnistui" |
