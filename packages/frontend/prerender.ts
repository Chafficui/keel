/**
 * Vite prerender plugin for keel frontend.
 *
 * Generates static HTML for public routes at build time, making them
 * crawlable by search engines and AI/LLM crawlers that don't execute JS.
 *
 * Only prerenders public (unauthenticated) routes — protected routes
 * still load dynamically after authentication.
 */

import type { Plugin } from "vite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

/** Public routes to prerender at build time. */
const PRERENDER_ROUTES = [
  "/",
  "/login",
  "/signup",
];

export function prerenderPlugin(): Plugin {
  let outDir: string;

  return {
    name: "keel-prerender",
    apply: "build",

    configResolved(config) {
      outDir = config.build.outDir;
    },

    async closeBundle() {
      try {
        // Read the built index.html as the shell
        const indexHtml = readFileSync(join(outDir, "index.html"), "utf-8");

        for (const route of PRERENDER_ROUTES) {
          // Strip leading slash to avoid join() treating it as absolute path
          const routeSegment = route.replace(/^\/+/, "");
          const routeDir = route === "/" ? outDir : join(outDir, routeSegment);
          const htmlPath = route === "/" ? join(outDir, "index.html") : join(routeDir, "index.html");

          if (route !== "/") {
            mkdirSync(routeDir, { recursive: true });
          }

          // Inject SEO-friendly meta tags and a noscript fallback
          const pageTitle = getPageTitle(route);
          const pageDescription = getPageDescription(route);

          let html = indexHtml;

          // Update title
          html = html.replace(
            /<title>[^<]*<\/title>/,
            `<title>${pageTitle}</title>`
          );

          // Add meta description if not present
          if (!html.includes('name="description"')) {
            html = html.replace(
              "</head>",
              `  <meta name="description" content="${pageDescription}" />\n  </head>`
            );
          } else {
            html = html.replace(
              /(<meta name="description" content=")[^"]*(")/,
              `$1${pageDescription}$2`
            );
          }

          // Add canonical URL placeholder
          html = html.replace(
            "</head>",
            `  <link rel="canonical" href="__FRONTEND_URL__${route === "/" ? "" : route}" />\n  </head>`
          );

          // Add noscript content for crawlers that don't execute JS
          const noscriptContent = getNoscriptContent(route, pageTitle, pageDescription);
          html = html.replace(
            '<div id="root"></div>',
            `<div id="root"></div>\n    <noscript>${noscriptContent}</noscript>`
          );

          writeFileSync(htmlPath, html, "utf-8");
        }

        console.log(`  Prerendered ${PRERENDER_ROUTES.length} public routes for SEO/AI crawlability`);
      } catch (error) {
        console.warn("  Prerender warning:", error);
      }
    },
  };
}

function getPageTitle(route: string): string {
  const titles: Record<string, string> = {
    "/": "__APP_NAME__",
    "/login": "Sign In — __APP_NAME__",
    "/signup": "Create Account — __APP_NAME__",
  };
  return titles[route] || "__APP_NAME__";
}

function getPageDescription(route: string): string {
  const descriptions: Record<string, string> = {
    "/": "__APP_NAME__ — A modern full-stack web application",
    "/login": "Sign in to your __APP_NAME__ account",
    "/signup": "Create a new __APP_NAME__ account to get started",
  };
  return descriptions[route] || "__APP_NAME__";
}

function getNoscriptContent(route: string, title: string, description: string): string {
  return `
    <div style="max-width:640px;margin:40px auto;padding:20px;font-family:system-ui,sans-serif">
      <h1>${title}</h1>
      <p>${description}</p>
      <p>This application requires JavaScript to run. Please enable JavaScript in your browser.</p>
      <nav>
        <a href="/">Home</a> |
        <a href="/login">Sign In</a> |
        <a href="/signup">Sign Up</a>
      </nav>
    </div>`;
}
