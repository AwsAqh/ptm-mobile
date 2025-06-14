import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../styles/them';

export default function IntroScreen({ navigation }) {
  useEffect(() => {
    // Auto-navigate after 3 seconds (optional)
    // const timer = setTimeout(() => navigation.replace('Login'), 3000);
    // return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to PTM-MOBILE!</Text>
      <Text style={styles.description}>
        This system allows you to browse, train, and use AI models for classification tasks such as plants, animal diseases, entertainment, and more.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.replace('Login')}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { color: colors.primary, fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  description: { color: colors.text, fontSize: 18, marginBottom: 40, textAlign: 'center' },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: 8 },
  buttonText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
});