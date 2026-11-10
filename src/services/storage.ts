import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSnapshot } from '../types';

const STORAGE_KEY = '@amplify/prototype-v1';

export async function loadSnapshot(): Promise<Partial<AppSnapshot> | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as Partial<AppSnapshot>) : null;
  } catch {
    return null;
  }
}

export async function saveSnapshot(snapshot: AppSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // The prototype still works in memory if device storage is unavailable.
  }
}
