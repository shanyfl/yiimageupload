import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest/presets/default-esm', // Use ESM preset for .mts files
    testEnvironment: 'node', // Use "node" or any other environment you need
    extensionsToTreatAsEsm: ['.ts', '.mts'], // Tell Jest to treat .mts as ESM
    transform: {
        '^.+\\.mts$': ['ts-jest', { useESM: true }], // Transform .mts files with ts-jest
    },
    moduleNameMapper: {
        // Add this if you have path aliases in tsconfig.json
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};

export default config;