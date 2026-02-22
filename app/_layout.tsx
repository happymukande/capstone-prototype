import { Stack } from 'expo-router';
import { ProgressProvider } from '../src/context/ProgressContext';

export default function RootLayout() {
  return (
    <ProgressProvider>
      <Stack />
    </ProgressProvider>
  );
}
