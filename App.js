import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — don't refetch on every screen focus
      gcTime: 1000 * 60 * 10,   // 10 minutes — keep unused cache alive
      retry: 2,                  // Retry failed requests twice before showing error
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <AppNavigator />
      </PaperProvider>
    </QueryClientProvider>
  );
}