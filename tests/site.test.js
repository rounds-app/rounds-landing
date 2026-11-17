// Structural checks for the static pages: no build, so these read the HTML as text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["index.html", "request-demo.html", "404.html"];
const read = (file) => readFileSync(join(root, file), "utf8");

const attrs = (html, name) =>
  [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, "g"))].map((m) => m[1]);

for (const page of pages) {
  const html = read(page);

  test(`${page}: local href and src targets exist`, () => {
    const refs = [...attrs(html, "href"), ...attrs(html, "src")].filter(
      (u) => u && !/^(https?:|mailto:|tel:|#|data:)/.test(u),
    );
    for (const ref of refs) {
      const path = ref.split(/[?#]/)[0].replace(/^\//, "") || "index.html";
      assert.ok(existsSync(join(root, path)), `${page} links to missing file ${ref}`);
    }
  });

  test(`${page}: in-page anchors point at an id on the page`, () => {
    const ids = new Set(attrs(html, "id"));
    for (const href of attrs(html, "href").filter((h) => h.startsWith("#") && h.length > 1)) {
      assert.ok(ids.has(href.slice(1)), `${page} has no element with id ${href}`);
    }
  });

  test(`${page}: links that open a new tab set rel="noopener"`, () => {
    for (const [tag] of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
      assert.match(tag, /rel="[^"]*noopener[^"]*"/, `missing rel=noopener on ${tag}`);
    }
  });
}

test("every team member has a name, a role and a linked school", () => {
  const members = [...read("index.html").matchAll(/<li class="member">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  assert.ok(members.length > 0, "no team members found");
  for (const card of members) {
    const name = card.match(/<span class="name">([^<]+)<\/span>/)?.[1];
    assert.ok(name, `card without a name:\n${card}`);
    assert.match(card, /<span class="role">/, `${name} has no role`);
    assert.match(card, /<a class="school" href="https:\/\/[^"]+"/, `${name}'s school is not a link`);
  }
});

test("JJ is a Software Engineer and Lead Software Developer at Tenaxiom Tech", () => {
  const card = read("index.html").match(/<span class="name">JJ McCauley<\/span>([\s\S]*?)<\/li>/)?.[1];
  assert.ok(card, "JJ's card is missing");
  const text = card.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /Software Engineer/);
  assert.match(text, /Lead Software Developer, Tenaxiom Tech/);
});

test("role and company together link to the company", () => {
  const html = read("index.html");
  const linkText = (href) => {
    const m = html.match(new RegExp(`<a class="company" href="${href}"[^>]*>([\\s\\S]*?)</a>`));
    return m?.[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  };
  assert.equal(linkText("https://www.logxco.com/"), "Founder, Logarithm LLC");
  assert.equal(linkText("https://www.tenaxiom.tech/"), "Lead Software Developer, Tenaxiom Tech");
});

test("photos that link to LinkedIn name the person for screen readers", () => {
  const links = [...read("index.html").matchAll(/<a class="photo"[^>]*>/g)].map((m) => m[0]);
  assert.ok(links.length > 0, "no LinkedIn photo links found");
  for (const tag of links) {
    assert.match(tag, /href="https:\/\/www\.linkedin\.com\/in\/[^"]+"/, `not a LinkedIn profile: ${tag}`);
    assert.match(tag, /aria-label="[^"]+ on LinkedIn"/, `missing aria-label: ${tag}`);
  }
});

test("canonical and social-preview URLs use the domain in CNAME", () => {
  const domain = read("CNAME").trim();
  for (const page of ["index.html", "request-demo.html"]) {
    const html = read(page);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(canonical, `${page} has no canonical link`);
    const ogUrl = html.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
    assert.equal(ogUrl, canonical, `${page}: og:url and canonical differ`);
    for (const url of [canonical, html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]]) {
      assert.equal(new URL(url).host, domain, `${page}: ${url} is not on ${domain}`);
    }
  }
});

test("each LinkedIn label names the same person as the card", () => {
  const members = [...read("index.html").matchAll(/<li class="member">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  for (const card of members) {
    const name = card.match(/<span class="name">([^<]+)<\/span>/)[1];
    assert.match(name, /\S \S/, `${name} should be a full name`);
    assert.match(card, new RegExp(`aria-label="${name} on LinkedIn"`), `${name}'s LinkedIn label differs from the card`);
  }
});

test("404 page uses root-absolute links so it works at any depth", () => {
  const refs = [...attrs(read("404.html"), "href"), ...attrs(read("404.html"), "src")].filter(
    (u) => !/^(https?:|mailto:|#|data:)/.test(u),
  );
  for (const ref of refs) assert.match(ref, /^\//, `404.html has a relative link ${ref}`);
});
