// esbuild configuration for widget bundle

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const isWatch = process.argv.includes('--watch');

async function build() {
  const outdir = path.join(process.cwd(), 'public');

  // Ensure public directory exists
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }

  const ctx = await esbuild.context({
    entryPoints: ['widget/index.ts'],
    bundle: true,
    minify: !isWatch,
    sourcemap: isWatch,
    target: ['es2018'],
    format: 'iife',
    globalName: 'ChatBotWidgetModule',
    outfile: path.join(outdir, 'widget.js'),
    define: {
      'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
    },
    banner: {
      js: `/* ChatBot Widget - https://github.com/your-org/chatbot */`,
    },
    footer: {
      js: `
// Ensure ChatBotWidget is available globally
if (typeof window !== 'undefined' && !window.ChatBotWidget) {
  window.ChatBotWidget = ChatBotWidgetModule.ChatBotWidget;
}
`,
    },
  });

  if (isWatch) {
    console.log('Watching for changes...');
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();

    // Log bundle size
    const stats = fs.statSync(path.join(outdir, 'widget.js'));
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`✓ Built widget.js (${sizeKB} KB)`);
  }
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
