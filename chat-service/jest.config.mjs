import { pathsToModuleNameMapper } from 'ts-jest';
import tsconfigData from './tsconfig.json' assert { type: 'json' };

const { compilerOptions } = tsconfigData;

/** @type {import('ts-jest').JestConfigWithTsJest} */
const jestConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/server.ts',
    '!<rootDir>/src/app.ts',
    '!<rootDir>/src/db/**',
    '!<rootDir>/src/config/**',
    '!<rootDir>/src/shared/utils/logger.ts',
    '!<rootDir>/src/**/*.types.ts',
    '!<rootDir>/src/**/*.schemas.ts',
    '!<rootDir>/src/**/index.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/',
  }),
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/src/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};

export default jestConfig;
