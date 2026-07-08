import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

const { mockAuth, mockFirestore, mockStorage } = require('./firebase-mock');

// Mock React Native Firebase with Real Firebase JS Web SDK (modular v9 API)
jest.mock('@react-native-firebase/app', () => ({}));
jest.mock('@react-native-firebase/auth', () => mockAuth);
jest.mock('@react-native-firebase/firestore', () => mockFirestore);
jest.mock('@react-native-firebase/storage', () => mockStorage);

jest.mock('react-native-file-viewer', () => ({
  open: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-navigation/stack', () => {
  const actual = jest.requireActual('@react-navigation/stack');
  return {
    ...actual,
    createStackNavigator: () => {
      const Stack = actual.createStackNavigator();
      return Stack;
    },
    CardStyleInterpolators: {
      forHorizontalIOS: () => ({}),
      forVerticalIOS: () => ({}),
      forModalPresentationIOS: () => ({}),
      forFadeFromBottomAndroid: () => ({}),
      forRevealFromBottomAndroid: () => ({}),
    },
    TransitionPresets: {
      DefaultTransition: {},
      ModalTransition: {},
      FadeFromBottomAndroid: {},
      RevealFromBottomAndroid: {},
    },
  };
});

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(() => Promise.resolve([{ uri: 'test', type: 'image/jpeg', name: 'test.jpg' }])),
  types: { pdf: 'application/pdf', images: 'image/*' },
  keepLocalCopy: jest.fn(),
}));

// Mock Google Signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ idToken: 'test-id-token' })),
  },
  statusCodes: {},
}));

// Mock Notifee
jest.mock('@notifee/react-native', () => ({
  requestPermission: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
  displayNotification: jest.fn(() => Promise.resolve()),
  createChannel: jest.fn(() => Promise.resolve('channel-id')),
  AndroidImportance: { HIGH: 4 },
}));

// Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-worklets
jest.mock('react-native-worklets', () => ({}));
jest.mock('react-native-worklets-core', () => ({}), { virtual: true });
// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const reactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      call: () => {},
      View: reactNative.View,
      Text: reactNative.Text,
      Image: reactNative.Image,
      ScrollView: reactNative.ScrollView,
      createAnimatedComponent: (Component) => Component,
    },
    FadeInRight: {},
    FadeOutLeft: {},
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn(),
    withSpring: jest.fn(),
    createAnimatedComponent: (Component) => Component,
    Animated: {
      View: reactNative.View,
      Text: reactNative.Text,
      Image: reactNative.Image,
      ScrollView: reactNative.ScrollView,
    }
  };
});

// Silence warning about Animated module
