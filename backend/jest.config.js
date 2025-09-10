module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  projects: [
    // 单元测试配置
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setupUnit.ts'],
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest'
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
      },
      globals: {
        'ts-jest': {
          tsconfig: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true
          }
        }
      }
    },
    // 集成测试配置
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest'
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
      },
      globals: {
        'ts-jest': {
          tsconfig: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true
          }
        }
      }
    }
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app.ts',
    '!src/types/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
}