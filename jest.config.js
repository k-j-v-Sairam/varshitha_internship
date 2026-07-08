module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|@react-native-firebase|react-native-paper|react-native-vector-icons|react-native-safe-area-context|react-native-reanimated|@react-navigation|firebase|@firebase)'
  ],
  resolver: '<rootDir>/jest.resolver.js',
  moduleNameMapper: {
    '^@firebase/auth$': '<rootDir>/node_modules/@firebase/auth/dist/node/index.js',
    '^@firebase/firestore$': '<rootDir>/node_modules/@firebase/firestore/dist/index.node.cjs.js',
    '^@firebase/app$': '<rootDir>/node_modules/@firebase/app/dist/index.cjs.js',
    '^firebase/(.*)$': '<rootDir>/node_modules/firebase/$1/dist/index.cjs.js'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest'
  }
};
