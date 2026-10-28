'use strict';

/**
 * A minimal DOM for the tests.
 *
 * The app is a plain browser script with no build step, so the tests load
 * the *shipped* `assets/app.js` into a `vm` context and give it just enough
 * of a browser to run. Testing the real file rather than a copy is the
 * point: a regression in the app has to fail the test, and a refactor that
 * leaves the behaviour alone must not.
 *
 * Nothing here is a browser. It records what the app did and answers the
 * handful of questions the app asks.
 */

/** A very small CSS selector matcher: tag, .class and [attr] / [attr="v"]. */
function matchesSelector(element, selector) {
  if (!element || !element.tagName) {
    return false;
  }
  const parts = selector.trim().split(/(?=[.[])/);
  for (const part of parts) {
    if (!part) {
      continue;
    }
    if (part.startsWith('.')) {
      if (!element.classList.contains(part.slice(1))) {
        return false;
      }
    } else if (part.startsWith('[')) {
      const close = part.indexOf(']');
      const body = part.slice(1, close);
      const equals = body.indexOf('=');
      if (equals === -1) {
        if (!(body in element.attributes)) {
          return false;
        }
      } else {
        const name = body.slice(0, equals);
        const wanted = body.slice(equals + 1).replace(/^["']|["']$/g, '');
        if (element.attributes[name] !== wanted) {
          return false;
        }
      }
    } else if (part !== '*' && element.tagName.toLowerCase() !== part.toLowerCase()) {
      return false;
    }
  }
  return true;
}

function createElement(tagName) {
  const tag = String(tagName || 'div').toLowerCase();
  const element = {
    tagName: tag.toUpperCase(),
    nodeName: tag.toUpperCase(),
    children: [],
    childNodes: [],
    parentNode: null,
    attributes: {},
    dataset: {},
    style: {},
    textContent: '',
    innerHTML: '',
    hidden: false,
    disabled: false,
    value: '',
    title: '',
    id: '',
    options: [],
    classList: {
      add(...names) {
        for (const name of names) {
          if (!element.classNames.has(name)) {
            element.classNames.add(name);
          }
        }
      },
      remove(...names) {
        for (const name of names) {
          element.classNames.delete(name);
        }
      },
      contains(name) {
        return element.classNames.has(name);
      },
      toggle(name, force) {
        const on = force === undefined ? !element.classNames.has(name) : Boolean(force);
        if (on) {
          element.classNames.add(name);
        } else {
          element.classNames.delete(name);
        }
        return on;
      },
    },
    classNames: new Set(),
    addEventListener() {},
    removeEventListener() {},
    setAttribute(name, value) {
      element.attributes[name] = String(value);
      if (name === 'id') {
        element.id = String(value);
      }
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(element.attributes, name)
        ? element.attributes[name]
        : null;
    },
    removeAttribute(name) {
      delete element.attributes[name];
    },
    appendChild(child) {
      element.children.push(child);
      element.childNodes.push(child);
      if (child) {
        child.parentNode = element;
        if (element.tagName === 'SELECT' && child.tagName === 'OPTION') {
          element.options.push(child);
        }
      }
      return child;
    },
    append(...nodes) {
      for (const node of nodes) {
        element.appendChild(node);
      }
    },
    remove() {
      const parent = element.parentNode;
      if (parent) {
        parent.children = parent.children.filter((child) => child !== element);
        parent.childNodes = parent.childNodes.filter((child) => child !== element);
      }
    },
    querySelector(selector) {
      return element.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const found = [];
      const walk = (node) => {
        for (const child of node.children) {
          if (matchesSelector(child, selector)) {
            found.push(child);
          }
          walk(child);
        }
      };
      walk(element);
      return found;
    },
    closest() {
      return null;
    },
    focus() {},
    blur() {},
    click() {
      const handler = element.handlers && element.handlers.click;
      if (handler) {
        handler({ target: element, preventDefault() {}, stopPropagation() {} });
      }
    },
    setSelectionRange() {},
    handlers: {},
  };

  // The app assigns `className` directly in several places, and the
  // selector matcher reads `classList`, so the two have to be the same
  // thing.
  Object.defineProperty(element, 'className', {
    get() {
      return [...element.classNames].join(' ');
    },
    set(value) {
      element.classNames = new Set(
        String(value || '')
          .split(/\s+/)
          .filter(Boolean)
      );
    },
  });

  // `innerHTML = ''` is used to clear a select before its options are
  // rebuilt, so it has to clear the option list too.
  Object.defineProperty(element, 'innerHTML', {
    get() {
      return '';
    },
    set(value) {
      if (value === '') {
        element.children = [];
        element.childNodes = [];
        element.options = [];
      }
    },
  });

  Object.defineProperty(element, 'textContent', {
    get() {
      return element._text || '';
    },
    set(value) {
      element._text = value === null || value === undefined ? '' : String(value);
    },
  });

  return element;
}

/**
 * Build the sandbox the app runs in.
 *
 * @param {object} bank the parsed questions.json
 */
function createSandbox(bank) {
  const elements = new Map();

  const document = {
    documentElement: createElement('html'),
    body: createElement('body'),
    getElementById(id) {
      if (!elements.has(id)) {
        const element = createElement('div');
        element.id = id;
        elements.set(id, element);
      }
      return elements.get(id);
    },
    querySelector(selector) {
      // The app reads the build stamp out of the page head.
      if (selector.includes('build-version')) {
        return { content: 'test-build' };
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement(tagName) {
      return createElement(tagName);
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: String(text), parentNode: null };
    },
    addEventListener() {},
    removeEventListener() {},
  };

  const storage = new Map();
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
  };

  const location = {
    hash: '',
    href: 'http://localhost/',
    hostname: 'localhost',
    protocol: 'http:',
    origin: 'http://localhost',
    pathname: '/',
    search: '',
  };

  const sandbox = {
    console,
    document,
    localStorage,
    location,
    navigator: { onLine: true },
    // The service worker is deliberately absent: the app must work without it.
    fetch: async (url) => {
      if (String(url).startsWith('questions.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => JSON.parse(JSON.stringify(bank)),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    },
    matchMedia: (query) => ({
      media: query,
      matches: false,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }),
    history: {
      replaceState(_state, _title, url) {
        if (typeof url === 'string' && url.startsWith('#')) {
          location.hash = url;
        }
      },
      pushState(_state, _title, url) {
        if (typeof url === 'string' && url.startsWith('#')) {
          location.hash = url;
        }
      },
    },
    print() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return true;
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    JSON,
    URL,
    Blob: class Blob {
      constructor(parts) {
        this.parts = parts;
      }
    },
  };

  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window.location = location;
  sandbox.window.document = document;

  // The app reaches for navigator.serviceWorker; leave it undefined so the
  // registration path is skipped rather than stubbed.
  return sandbox;
}

module.exports = { createSandbox, createElement, matchesSelector };
