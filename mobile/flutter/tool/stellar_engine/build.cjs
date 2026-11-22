const fs=require('node:fs'),path=require('node:path');
const esbuild=require(require.resolve('esbuild',{paths:[process.env.PLATIK_BUILD_NODE_MODULES||__dirname]}));
const root=path.resolve(__dirname,'../..');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'public-config.json'),'utf8'));
const outfile=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'assets/stellar_engine.js');
esbuild.buildSync({nodePaths:[path.join(process.env.PLATIK_BUILD_NODE_MODULES||__dirname,'node_modules')],entryPoints:[path.join(__dirname,'entry.ts')],bundle:true,platform:'browser',target:'es2020',minify:true,legalComments:'eof',outfile,define:{'process.env.NODE_ENV':'"production"','POLLAR_KEY':JSON.stringify(process.env.POLLAR_PUBLISHABLE_KEY||config.POLLAR_PUBLISHABLE_KEY)}});
console.log('Stellar SDK engine generated: '+outfile);
