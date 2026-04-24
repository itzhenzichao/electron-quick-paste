const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function buildJS() {
  console.log('📦 开始编译 JavaScript...');

  // 压缩 preload.js
  await esbuild.build({
    entryPoints: ['preload.js'],
    outfile: 'dist/preload.min.js',
    minify: true,
    target: 'es2020',
    format: 'cjs',
    platform: 'node',
    treeShaking: true,
    legalComments: 'none'
  });
  console.log('  ✓ dist/preload.min.js');

  // 压缩 main.js
  await esbuild.build({
    entryPoints: ['main.js'],
    outfile: 'dist/main.min.js',
    minify: true,
    target: 'es2020',
    format: 'cjs',
    platform: 'node',
    bundle: true,
    treeShaking: true,
    external: ['electron', 'electron-store'],
    legalComments: 'none'
  });
  console.log('  ✓ dist/main.min.js');

  console.log('✅ JavaScript 编译完成');
}

async function copyAssets() {
  console.log('\n📁 开始复制资源文件...');
  
  // 创建 dist 目录
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }
  
  // 复制 build 目录（图标）到 dist/build
  const distBuildDir = path.join('dist', 'build');
  if (!fs.existsSync(distBuildDir)) {
    fs.mkdirSync(distBuildDir, { recursive: true });
  }
  
  const buildFiles = ['icon.png', 'icon.ico', 'icon.icns'];
  buildFiles.forEach(file => {
    const srcFile = path.join('build', file);
    const destFile = path.join(distBuildDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`  ✓ build/${file} → dist/build/${file}`);
    }
  });
  
  // 复制 HTML 文件
  const htmlFiles = ['ball.html', 'panel.html'];
  htmlFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join('dist', file));
      console.log(`  ✓ ${file} → dist/${file}`);
    }
  });
  
  console.log('✅ 资源文件复制完成');
}

async function main() {
  console.log('🚀 开始资源构建...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await buildJS();
  await copyAssets();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ 资源构建完成！\n');
  console.log('dist 目录结构:');
  
  const files = fs.readdirSync('dist');
  files.forEach(f => {
    const fullPath = path.join('dist', f);
    if (fs.statSync(fullPath).isDirectory()) {
      console.log(`  📂 ${f}/`);
      fs.readdirSync(fullPath).forEach(sf => {
        const size = fs.statSync(path.join(fullPath, sf)).size;
        console.log(`      └─ ${sf} (${formatSize(size)})`);
      });
    } else {
      const size = fs.statSync(fullPath).size;
      console.log(`  📄 ${f} (${formatSize(size)})`);
    }
  });
  
  console.log('\n下一步: npm run pack');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

main().catch(err => {
  console.error('❌ 构建失败:', err);
  process.exit(1);
});