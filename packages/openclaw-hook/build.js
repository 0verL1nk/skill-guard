const esbuild = require('esbuild');
const path = require('path');

async function build() {
    try {
        await esbuild.build({
            entryPoints: [path.join(__dirname, 'src/index.ts')],
            bundle: true,
            platform: 'node',
            target: 'node18',
            outfile: path.join(__dirname, 'dist/handler.js'),
            format: 'cjs',
            external: ['fs', 'path', 'crypto', 'util', 'stream', 'events', 'assert', 'os'], // Node built-ins usually handled by platform:node but being explicit doesn't hurt. 'fs-extra' should be bundled?
            // fs-extra is a dependency. It should be bundled unless we assume the hook env has it.
            // OpenClaw hooks run in a VM or child process. Usually they need to be self-contained or use globally available modules.
            // Safest to bundle fs-extra.
        });
        console.log('✅ Build successful: dist/handler.js');
    } catch (e) {
        console.error('❌ Build failed:', e);
        process.exit(1);
    }
}

build();
