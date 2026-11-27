const fs = require('node:fs/promises');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { setTimeout: sleep } = require('node:timers/promises');
const { mediaURL } = require('./sources');

const DEFAULT_HEADER_TIMEOUT_MS = 30_000;
const DEFAULT_STALL_TIMEOUT_MS = 30_000;
const DEFAULT_TOTAL_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024 * 1024;

function failure(code, message, retryable = false) {
  return Object.assign(new Error(message), { code, retryable });
}

async function receive(url, file, signal, request, written, {
  headerTimeoutMs = DEFAULT_HEADER_TIMEOUT_MS,
  stallTimeoutMs = DEFAULT_STALL_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_BYTES
} = {}) {
  const controller = new AbortController();
  let timedOut = false;
  let timer;
  const resetTimer = (ms) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort(failure('network', 'Media transfer timed out', true));
    }, ms);
  };
  const onAbort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', onAbort, { once: true });
  resetTimer(headerTimeoutMs);

  let response;
  try {
    try {
      response = await request(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'Accept-Encoding': 'identity' }
      });
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      throw failure('network', timedOut ? 'Media transfer timed out' : 'Media request failed', true);
    }

    const type = response.headers.get('content-type') || '';
    const declared = response.headers.get('content-length');
    const encoding = response.headers.get('content-encoding');
    const expected = (!encoding || encoding === 'identity') && /^\d+$/.test(declared || '') ? Number(declared) : null;
    const status = response.status;
    let error;
    if (status === 401 || status === 403) error = failure('access', 'Media access denied');
    else if (status === 429) error = failure('rate-limit', 'Media request rate limited');
    else if (status === 408 || status >= 500) error = failure('network', 'Media server error', true);
    else if (status !== 200 || !response.body || /^(?:text\/|application\/(?:json|xml|xhtml\+xml))/i.test(type)) {
      error = failure('invalid-media', 'Response is not a complete media file');
    } else if (expected !== null && expected > maxBytes) {
      error = failure('invalid-media', 'Media exceeds maximum allowed size');
    }
    if (error) {
      await response.body?.cancel().catch(() => {});
      throw error;
    }

    resetTimer(stallTimeoutMs);
    let bytes = 0;
    const counter = new Transform({
      transform(chunk, _encoding, callback) {
        resetTimer(stallTimeoutMs);
        bytes += chunk.length;
        if (bytes > maxBytes) callback(failure('invalid-media', 'Media exceeds maximum allowed size'));
        else if (expected !== null && bytes > expected) callback(failure('incomplete-media', 'Media exceeds declared size', true));
        else callback(null, chunk);
      }
    });
    let handle;
    try {
      handle = await fs.open(file, 'wx', 0o600);
      written();
      await pipeline(Readable.fromWeb(response.body), counter, handle.createWriteStream(), { signal: controller.signal });
    } catch (cause) {
      if (!handle) await response.body.cancel().catch(() => {});
      if (signal.aborted) throw signal.reason;
      if (timedOut) throw failure('network', 'Media stream stalled', true);
      if (['ECONNRESET', 'ETIMEDOUT', 'UND_ERR_SOCKET'].includes(cause.cause?.code) || cause.message === 'terminated') {
        throw failure('incomplete-media', 'Media stream was interrupted', true);
      }
      throw cause;
    } finally {
      await handle?.close();
    }
    if (!bytes || (expected !== null && bytes !== expected)) {
      throw failure('incomplete-media', 'Media length does not match the response', true);
    }
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

async function downloadMedia(url, file, signal, {
  request = fetch,
  wait = (delay, abortSignal) => sleep(delay, undefined, { signal: abortSignal }),
  headerTimeoutMs = DEFAULT_HEADER_TIMEOUT_MS,
  stallTimeoutMs = DEFAULT_STALL_TIMEOUT_MS,
  totalTimeoutMs = DEFAULT_TOTAL_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_BYTES
} = {}) {
  if (!mediaURL(url)) throw failure('invalid-media', 'Unsupported media host');
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    let created = false;
    const deadline = AbortSignal.timeout(totalTimeoutMs);
    try {
      await receive(url, file, AbortSignal.any([signal, deadline]), request, () => { created = true; }, {
        headerTimeoutMs, stallTimeoutMs, maxBytes
      });
      return;
    } catch (error) {
      if (created) await fs.rm(file, { force: true });
      signal.throwIfAborted();
      if ((!error.retryable && !deadline.aborted) || attempt === 2) throw error;
      await wait(500 * 2 ** attempt, signal);
    }
  }
}

module.exports = { downloadMedia };
