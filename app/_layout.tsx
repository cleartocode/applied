import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ink, surface } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: surface.page }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: surface.page },
            headerTintColor: ink.primary,
            headerTitleStyle: { fontSize: 16 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: surface.page },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'applied' }} />
          <Stack.Screen name="spike/gradient-descent" options={{ title: 'Learning rate' }} />
          <Stack.Screen name="spike/consolidate" options={{ title: 'What just happened' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
