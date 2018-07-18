import resolve from 'rollup-plugin-node-resolve';

const externals = [
    'cors',
    'firebase-functions',
    'rxjs',
    'rxjs/operators',
    '@google/maps',
    '@turf/distance',
    '@turf/helpers'
];

export default {
    input: 'tmp/index.js',
    external: externals,
    plugins: [resolve()],
    output: {
        file: 'lib/index.js',
        format: 'cjs',
        sourcemap: false
    }
}
