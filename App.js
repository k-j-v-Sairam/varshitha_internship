import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { HostelProvider } from './src/context/HostelContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <PaperProvider>
      <HostelProvider>
        <AppNavigator />
      </HostelProvider>
    </PaperProvider>
  );
}