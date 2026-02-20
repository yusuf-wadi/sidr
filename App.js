import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { AppProvider } from './context/AppContext';
import HomeScreen from './screens/HomeScreen';
import ReadingScreen from './screens/ReadingScreen';
import StatsScreen from './screens/StatsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Reading" component={ReadingScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#1a5c38',
            tabBarInactiveTintColor: '#aaa',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopColor: '#e0e0e0',
            },
          }}
        >
          <Tab.Screen
            name="HomeTab"
            component={HomeStack}
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => (
                <TabIcon emoji="🌿" color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="ReadingTab"
            component={ReadingScreen}
            options={{
              title: 'Read',
              tabBarIcon: ({ color }) => (
                <TabIcon emoji="📖" color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="StatsTab"
            component={StatsScreen}
            options={{
              title: 'Stats',
              tabBarIcon: ({ color }) => (
                <TabIcon emoji="📊" color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
}

function TabIcon({ emoji, color }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}
