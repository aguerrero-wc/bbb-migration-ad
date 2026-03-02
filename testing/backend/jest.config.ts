import type { Config } from 'jest';
import * as path from 'path';

const localModules = path.resolve(__dirname, 'node_modules');

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@backend/(.*)$': '<rootDir>/../../backend/src/$1',
    '^@nestjs/(.*)$': `${localModules}/@nestjs/$1`,
    '^typeorm$': `${localModules}/typeorm`,
    '^typeorm/(.*)$': `${localModules}/typeorm/$1`,
    '^rxjs$': `${localModules}/rxjs`,
    '^rxjs/(.*)$': `${localModules}/rxjs/$1`,
    '^class-validator$': `${localModules}/class-validator`,
    '^class-transformer$': `${localModules}/class-transformer`,
    '^class-transformer/(.*)$': `${localModules}/class-transformer/$1`,
    '^fast-xml-parser$': `${localModules}/fast-xml-parser`,
    '^helmet$': `${localModules}/helmet`,
    '^passport$': `${localModules}/passport`,
    '^passport-jwt$': `${localModules}/passport-jwt`,
    '^reflect-metadata$': `${localModules}/reflect-metadata`,
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  verbose: true,
};

export default config;
