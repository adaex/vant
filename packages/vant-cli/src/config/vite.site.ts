import { join } from 'path';
import { get } from 'lodash';
import hljs from 'highlight.js';
import vitePluginMd from 'vite-plugin-md';
import vitePluginVue from '@vitejs/plugin-vue';
import vitePluginJsx from '@vitejs/plugin-vue-jsx';
import { setBuildTarget, getVantConfig } from '../common';
import {
  SITE_DIST_DIR,
  SITE_MOBILE_SHARED_FILE,
  SITE_DESKTOP_SHARED_FILE,
  SITE_SRC_DIR,
} from '../common/constant';
import { injectHtml } from 'vite-plugin-html';
import type { InlineConfig } from 'vite';

function markdownHighlight(str: string, lang: string) {
  if (lang && hljs.getLanguage(lang)) {
    // https://github.com/highlightjs/highlight.js/issues/2277
    return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
  }

  return '';
}

function markdownCardWrapper(htmlCode: string) {
  const group = htmlCode
    .replace(/<h3/g, ':::<h3')
    .replace(/<h2/g, ':::<h2')
    .split(':::');

  return group
    .map((fragment) => {
      if (fragment.indexOf('<h3') !== -1) {
        return `<div class="van-doc-card">${fragment}</div>`;
      }

      return fragment;
    })
    .join('');
}

function getSiteConfig(vantConfig: any) {
  const siteConfig = vantConfig.site;

  if (siteConfig.locales) {
    return siteConfig.locales[siteConfig.defaultLang || 'en-US'];
  }

  return siteConfig;
}

function getTitle(config: { title: string; description?: string }) {
  let { title } = config;

  if (config.description) {
    title += ` - ${config.description}`;
  }

  return title;
}

function getHTMLMeta(vantConfig: any) {
  const meta = get(vantConfig, 'site.htmlMeta');

  if (meta) {
    return Object.keys(meta)
      .map((key) => `<meta name="${key}" content="${meta[key]}">`)
      .join('\n');
  }

  return '';
}

export function getViteConfigForSiteDev(): InlineConfig {
  setBuildTarget('package');

  const vantConfig = getVantConfig();
  const siteConfig = getSiteConfig(vantConfig);
  const title = getTitle(siteConfig);
  const baiduAnalytics = get(vantConfig, 'site.baiduAnalytics');

  return {
    root: SITE_SRC_DIR,

    plugins: [
      vitePluginVue({
        include: [/\.vue$/, /\.md$/],
      }),
      vitePluginMd({
        wrapperClasses: 'van-doc-markdown-body',
        transforms: {
          after: markdownCardWrapper,
        },
        markdownItOptions: {
          highlight: markdownHighlight,
        },
        markdownItSetup(md: any) {
          const { slugify } = require('transliteration');
          const markdownItAnchor = require('markdown-it-anchor');
          md.use(markdownItAnchor, {
            level: 2,
            slugify,
          });
        },
      }),
      vitePluginJsx(),
      injectHtml({
        data: {
          ...siteConfig,
          title,
          baiduAnalytics,
          meta: getHTMLMeta(vantConfig),
        },
      }),
    ],

    resolve: {
      alias: {
        'site-mobile-shared': SITE_MOBILE_SHARED_FILE,
        'site-desktop-shared': SITE_DESKTOP_SHARED_FILE,
      },
    },

    server: {
      host: '0.0.0.0',
    },
  };
}

export function getViteConfigForSiteProd(): InlineConfig {
  const devConfig = getViteConfigForSiteDev();
  const vantConfig = getVantConfig();
  const outDir = get(vantConfig, 'build.site.outputDir', SITE_DIST_DIR);
  const publicPath = get(vantConfig, 'build.site.publicPath', '/');

  return {
    ...devConfig,
    base: publicPath,
    build: {
      outDir,
      brotliSize: false,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: join(SITE_SRC_DIR, 'index.html'),
          nested: join(SITE_SRC_DIR, 'mobile.html'),
        },
      },
    },
  };
}
