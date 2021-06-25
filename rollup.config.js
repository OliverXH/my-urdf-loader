import resolve from '@rollup/plugin-node-resolve'

export default {
    // input: './src/main.js',
    // input: './src/loadxml.js',
    input: './examples/three-urdf.js',
    output:{
        file:'./bundle.js',
        format:'esm',
    },
    plugins:[
        resolve()
    ]
}