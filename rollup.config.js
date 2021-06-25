import resolve from '@rollup/plugin-node-resolve'

export default {
    input: './src/URDFLoader.js',
    output:{
        file:'build/URDFLoader.js',
        format:'esm',
    },
    plugins:[
        resolve()
    ]
}