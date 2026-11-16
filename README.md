# Assignment 8 – Node.js and Express Information Server

A small Express 5 server for a made-up study programme (Northbridge Software
Engineering). It serves a web page from `public/`, answers a handful of text,
JSON, error and redirect routes, logs every request and counts how many
requests it has served since it started. All data is hard-coded in
`server.js`; there is no database and nothing is persisted.

## How to install and run

Requirements: Node.js (current LTS, tested with v22.14.0) and npm.

```bash
git clone https://github.com/windium/web-lab8.git
cd web-lab8
npm install        # installs Express 5 from package-lock.json
npm start          # node server.js
```

Then open <http://localhost:3000>.

- `npm run dev` starts the server with `node --watch`, which restarts it
  automatically when a file changes (built into Node, no nodemon).
- The port comes from the `PORT` environment variable and falls back to 3000:
  `PORT=8080 npm start`.
- The server can be started from any folder, for example
  `node web-lab8/server.js` from the parent directory, because the path to
  `public/` is built from `import.meta.dirname`.

## File organization

```
/web-lab8
 ├─ public/
 │   ├─ index.html      Programme page with one button per API route
 │   ├─ styles.css      External stylesheet for the page
 │   └─ app.js          fetch() calls, shows status code and formatted body
 ├─ server.js           Express app: constants, middleware, static files, routes, 404
 ├─ package.json        "type": "module", express dependency, start/dev scripts
 ├─ package-lock.json   Exact dependency versions (committed)
 ├─ .gitignore          Excludes node_modules/ and .env
 └─ README.md
```

`server.js` is ordered top to bottom the same way a request travels through it:

1. Constants (`PORT`, `PUBLIC_DIR`, `COURSES`, `ROBOTS_TXT`)
2. Middleware: request logger, then request counter
3. `express.static(PUBLIC_DIR)`
4. Routes
5. 404 fallback (always last)
6. `app.listen`

## Routes

| Method and path        | Response |
| ---------------------- | -------- |
| `GET /`                | `public/index.html` (served by `express.static`) |
| `GET /hello`           | `200`, `text/plain`: `Hello from Selim's server` |
| `GET /robots.txt`      | `200`, `text/plain`: robots rules (disallow `/api/`) |
| `GET /old-page`        | `301` redirect to `/hello` |
| `GET /api/courses`     | `200`, JSON array of 4 courses (`id`, `title`, `credits`) |
| `GET /api/status`      | `200`, JSON `{ status, nodeVersion, uptimeSeconds }` from `process` |
| `GET /api/headers`     | `200`, JSON `{ userAgent, accept }` echoed from the request |
| `POST /api/subscribe`  | `201`, JSON `{ "subscribed": true }` |
| `GET /api/admin`       | `403`, JSON `{ "error": "Forbidden" }` |
| `GET /api/stats`       | `200`, JSON `{ "requestsServed": <number> }` |
| anything else          | `404`: JSON `{ "error": "Not found" }` under `/api`, plain text otherwise |

`/old-page` uses **301 Moved Permanently** rather than the default 302,
because the page has moved for good and will never come back at the old
address.

## Middleware

Both middleware functions are registered with `app.use()` at the very top,
before `express.static`, the routes and the 404 fallback, and both call
`next()`.

- **Request logger** prints one line per request:
  `[2026-11-16T18:02:19.300Z] GET /api/courses` (ISO timestamp, method, URL).
- **Request counter** adds 1 to `requestsServed`, a module-level `let`
  variable. It does not attach anything to `req` or `res`, because those are
  objects Express created, not us.

### Why this order

Middleware and routes run in the order they are registered, and the first one
that sends a response ends the chain. If the logger or counter came after
`express.static`, requests for `index.html`, `styles.css` and `app.js` would be
answered by the static middleware and never reach them. If they came after the
routes, they would only see requests that no route matched. Putting them first
guarantees that **every** request passes through them. The logger comes before
the counter so that a request is printed even if something later goes wrong.

### Which requests are counted

**Every request that reaches the server is counted**: API calls, the HTML
page and its static files (`/`, `/styles.css`, `/app.js`, and also
`/favicon.ico` when the browser asks for it), redirects, 403s, 404s, and the
`GET /api/stats` request itself. "Requests served" means exactly that: every
request the server answered, whatever the answer was. A 404 still costs the
server work, and leaving out static files would hide most of the traffic a
real visitor causes. Because the counter runs before the stats route, the
number returned already includes the request that asked for it.

Example: after the eight `curl` calls in the testing section below, on a
freshly started server, `/api/stats` returned `{"requestsServed":8}`. The
two 404s and the stats call itself were included.

## Self-study notes

**Node version and uptime (`process` object).** The Node.js docs for the
global `process` object list `process.version`, a string such as `"v22.14.0"`,
and `process.uptime()`, which returns the number of seconds (with decimals)
the current Node process has been running. `/api/status` returns
`process.version` as `nodeVersion` and `Math.floor(process.uptime())` as
`uptimeSeconds`, so the values are real and change on every call.

**Sending a specific content type.** `res.send()` with a string defaults to
`text/html`. The Express docs for `res.type()` explain that it sets the
`Content-Type` header from a MIME type or file extension. `/hello`,
`/robots.txt` and the non-API 404 call `res.type('text/plain')` before
`res.send()`, so they arrive as `text/plain; charset=utf-8`. `res.type()`
returns `res`, so it can be chained.

**Displaying JSON neatly in the page.** MDN's page on `JSON.stringify` shows
that its third argument, `space`, indents the output.
`JSON.stringify(data, null, 2)` gives two-space indentation, which is shown
inside a `<pre>` element so the line breaks are kept. Since not every response
is JSON (the non-API 404 is plain text), `app.js` first reads the body with
`response.text()` and then tries `JSON.parse()`. If parsing fails, the text is
shown as it is.

**Finding the folder of the current file in ES modules.** CommonJS has
`__dirname`, but ES modules do not. The Node docs for ES modules list
`import.meta.dirname` (Node 20.11+), which is the absolute folder of the
current file. `path.join(import.meta.dirname, 'public')` makes
`express.static` work no matter which folder the server is started from.

**404 fallback in Express 5.** The Express 5 migration guide explains that
the path-matching library changed and a bare `*` is no longer a valid path.
`app.get('*', ...)` now throws an error. A path-less `app.use((req, res) => {...})`
registered after all routes matches any request that is still unanswered, for
every HTTP method. It checks `req.path.startsWith('/api')` to choose between
JSON and text.

## Testing evidence (curl)

All output below was produced with `curl --include` against a freshly started
server (`npm start`, port 3000), in this order. The status line and all
response headers are shown, not only the body. The redirect was requested
without `-L`, so curl shows the 301 itself instead of following it.

### Successful JSON response (200)

```text
$ curl --include localhost:3000/api/courses
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 193
ETag: W/"c1-CkneYHBW1SIRLixzlBuI17tD39o"
Date: Mon, 16 Nov 2026 18:02:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5

[{"id":1,"title":"Web Programming","credits":6},{"id":2,"title":"Data Structures","credits":5},{"id":3,"title":"Operating Systems","credits":5},{"id":4,"title":"Computer Networks","credits":4}]
```

### 201 Created

```text
$ curl --include -X POST localhost:3000/api/subscribe
HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 19
ETag: W/"13-oWAPIqDXuocNexKhPYW9ayyk98c"
Date: Mon, 16 Nov 2026 18:02:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"subscribed":true}
```

### 403 Forbidden

```text
$ curl --include localhost:3000/api/admin
HTTP/1.1 403 Forbidden
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 21
ETag: W/"15-TLNzmZqKxaTuFdX/dVWWPBu44/c"
Date: Mon, 16 Nov 2026 18:02:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Forbidden"}
```

### Redirect (301)

```text
$ curl --include localhost:3000/old-page
HTTP/1.1 301 Moved Permanently
X-Powered-By: Express
Location: /hello
Vary: Accept
Content-Type: text/plain; charset=utf-8
Content-Length: 40
Date: Mon, 16 Nov 2026 18:02:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Moved Permanently. Redirecting to /hello
```

### 404 on an /api path (JSON)

```text
$ curl --include localhost:3000/api/does-not-exist
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 21
ETag: W/"15-bm7tJgu8FHlq5QU+Y6gDxOGPfRc"
Date: Mon, 16 Nov 2026 18:02:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Not found"}
```

### 404 on a non-API path (plain text)

```text
$ curl --include localhost:3000/does-not-exist
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: text/plain; charset=utf-8
Content-Length: 31
ETag: W/"1f-k0TCbjVa+pfRfed7TWNOJ0tisV0"
Date: Mon, 16 Nov 2026 18:02:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Page not found: /does-not-exist
```

### Plain-text content type

```text
$ curl --include localhost:3000/robots.txt
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/plain; charset=utf-8
Content-Length: 30
ETag: W/"1e-fz6IoKfWOEcSop5pxzp50fKiI7Q"
Date: Mon, 16 Nov 2026 18:02:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5

User-agent: *
Disallow: /api/
```

### Request counter

```text
$ curl --include localhost:3000/api/stats
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 20
ETag: W/"14-WJLLhLcJoemvy6FFy5g+MH2YjPc"
Date: Mon, 16 Nov 2026 18:02:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"requestsServed":8}
```

The server printed one log line for each of these requests:

```text
Server running at http://localhost:3000
[2026-11-16T18:02:19.300Z] GET /api/courses
[2026-11-16T18:02:19.314Z] POST /api/subscribe
[2026-11-16T18:02:19.324Z] GET /api/admin
[2026-11-16T18:02:19.333Z] GET /old-page
[2026-11-16T18:02:19.343Z] GET /api/does-not-exist
[2026-11-16T18:02:19.352Z] GET /does-not-exist
[2026-11-16T18:02:19.360Z] GET /robots.txt
[2026-11-16T18:02:19.368Z] GET /api/stats
```

## Reasoning questions

**1. Route order.** *Experiment:* I moved the 404 fallback block to the top of
`server.js`, above the logger. Afterwards **every** request returned 404:
`GET /` gave `Page not found: /`, `GET /hello` gave `Page not found: /hello`,
and `GET /api/courses` and `GET /api/stats` gave `{"error":"Not found"}`. The
terminal printed only the startup line, with no log lines at all. Express
checks middleware and routes in the order they were registered and stops at
the first one that sends a response. A path-less `app.use()` matches
everything, so it answered every request before the logger, the static files
or any real route got a chance. That is why the fallback must be registered
last.

**2. Middleware.** *Experiment:* I removed `next()` from the request logger
and opened the page. The browser kept loading with no content until I stopped
the server. Requesting `/hello` with curl also hung and timed out after 8
seconds (`curl exit 28`). The server still printed a log line for each request
(`GET /hello`, `GET /`), so the logger ran, but because it never called
`next()` and never sent a response, the request was simply stuck: nothing
after the logger ran and the client waited forever. A middleware must either
send a response or call `next()`.

**3. Status codes.** `201 Created` tells the client that the request
succeeded and *created* something new (here, a subscription), while `200 OK`
only means "it worked" and gives no information about whether a new resource
exists. A missing page is a `404` because status codes are what browsers,
`fetch` (`response.ok`), search engines and monitoring tools look at. A `200`
with an error message in the body would tell all of them the page exists and
is fine, so a search engine would index the error page and our own `app.js`
would show it in green as a success.

**4. Configuration.** The port depends on where the server runs, not on the
code. Hosting platforms assign the port through the `PORT` environment
variable, and on my own machine port 3000 might already be used by another
project. Reading `process.env.PORT` with `3000` as a fallback lets the same
code run everywhere without editing it (`PORT=8080 npm start`), while still
working with no setup during development.

**5. Dependencies.** `node_modules` can be rebuilt exactly from
`package.json` and `package-lock.json`, it is very large (thousands of
files), and some packages contain files built for one operating system. Since
it is listed in `.gitignore`, a teammate must clone the repository, run
`npm install` in the project folder (which installs the exact versions in
`package-lock.json`), and then run `npm start` or `npm run dev`.

**6. Same origin.** If `index.html` were opened directly from disk
(`file:///.../public/index.html`), the page would no longer have an
`http://localhost:3000` origin. The relative URL `/api/courses` would resolve
to `file:///api/courses`, which does not exist, so every button would fail.
Even if the URLs were changed to `http://localhost:3000/api/...`, the page and
the API would have different origins, and the browser would block the page
from reading the responses unless the server sent CORS headers. This
restriction is called the **Same-Origin Policy**. CORS (Cross-Origin Resource
Sharing) is the mechanism a server uses to relax it.

## Challenges

- **Plain text vs HTML.** My first `/hello` used `res.send()` with a string,
  and `curl --include` showed `Content-Type: text/html`. I had to look up
  `res.type()` to send real `text/plain`.
- **Express 5 wildcard.** The `app.get('*', ...)` pattern from older
  tutorials throws `Missing parameter name at index 1: *` in Express 5. The
  path-less `app.use()` fallback solves this and also catches every HTTP
  method, not only GET.
- **Running from another folder.** `express.static('public')` resolves
  relative to the folder the command is run from, so starting the server from
  the parent folder broke the page. ES modules have no `__dirname`, so I used
  `import.meta.dirname` to build an absolute path.
- **Showing non-JSON responses.** Calling `response.json()` on the non-API
  404 would throw, because that body is plain text. Reading the body as text
  first and then trying `JSON.parse()` handles both cases.
- **Deciding what to count.** The counter could have skipped static files or
  404s, but I chose to count every request that reaches the server and placed
  the counter before `express.static` so it sees all of them.
