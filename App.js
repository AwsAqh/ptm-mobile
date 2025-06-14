import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import your real screens
import BrowseModelsScreen from './screens/BrowseModelsScreen';
import ClassifyImageScreen from './screens/ClassifyImageScreen';
import HomeScreen from './screens/HomeScreen';
import IntroScreen from './screens/IntroScreen';
import LoginScreen from './screens/LoginScreen';
import ModelDetailsScreen from './screens/ModelDetailsScreen';
import RegisterScreen from './screens/RegisterScreen';
import TrainNewModelScreen from './screens/TrainNewModelScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#181a20', paddingTop: 18 }}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator initialRouteName="Intro" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Intro" component={IntroScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="BrowseModels" component={BrowseModelsScreen} />
          <Stack.Screen name="ModelDetails" component={ModelDetailsScreen} />
          <Stack.Screen name="ClassifyImage" component={ClassifyImageScreen} />
          <Stack.Screen name="TrainNewModel" component={TrainNewModelScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}