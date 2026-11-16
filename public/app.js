const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const buttons = document.querySelectorAll('.buttons button');

// Turn a response body into something readable.
// JSON is pretty-printed with 2-space indentation; anything else (for example
// the plain-text 404 page) is shown as it is.
function formatBody(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function showResult(statusText, isOk, bodyText) {
  statusEl.textContent = statusText;
  statusEl.className = isOk ? 'ok' : 'error';
  outputEl.textContent = bodyText;
}

async function callApi(method, url) {
  showResult('loading…', true, `${method} ${url}`);

  try {
    // Relative URL: the request goes to the same server that served this page.
    const response = await fetch(url, { method });
    const text = await response.text();

    showResult(
      `${response.status} ${response.statusText}`,
      response.ok,
      formatBody(text),
    );
  } catch (error) {
    // fetch only rejects on network failures (server down, CORS, offline).
    // 4xx/5xx responses are handled above through response.ok.
    showResult('Network error', false, error.message);
  }
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    callApi(button.dataset.method, button.dataset.url);
  });
});
