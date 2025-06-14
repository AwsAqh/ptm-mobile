import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // Expo vector icons
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../components/Header';
import { colors } from '../styles/them';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <Header title="Home" />
      <View style={styles.mainPageContainer}>
        <TouchableOpacity
          style={styles.userOption}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('BrowseModels')}
        >
          <Ionicons name="search" size={48} color="antiquewhite" style={{ marginBottom: 16 }} />
          <Text style={styles.optionText}>Browse trained models</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.userOption}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('TrainNewModel')}
        >
          <MaterialIcons name="add-box" size={48} color="antiquewhite" style={{ marginBottom: 16 }} />
          <Text style={styles.optionText}>Train new model</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainPageContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    padding: 24,
  },
  userOption: {
    color: 'antiquewhite',
    minHeight: 200,
    width: 300,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: 'antiquewhite',
    margin: 10,
    borderRadius: 18,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  optionText: {
    color: 'antiquewhite',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
