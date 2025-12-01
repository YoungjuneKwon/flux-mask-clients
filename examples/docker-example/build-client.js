const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['upstream/public/client-app.js'],
  bundle: true,
  outfile: 'upstream/public/bundle.js',
  define: {
    'global': 'window',
    'process.env.NODE_ENV': '"production"',
  },
  inject: ['upstream/process-shim.js', 'upstream/buffer-shim.js'],
  alias: {
    'crypto': 'crypto-browserify',
    'stream': 'stream-browserify',
    'buffer': 'buffer',
    'events': 'events',
    'util': 'util',
  },
  sourcemap: true,
}).catch(() => process.exit(1));
