import React from 'react';
import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppProvider } from './context/AppContext';
import HomeScreen from './screens/HomeScreen';
import KhatmScreen from './screens/KhatmScreen';
import ExploreScreen from './screens/ExploreScreen';
import StatsScreen from './screens/StatsScreen';
import MemoScreen from './screens/MemoScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji, color }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
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
                  component={HomeScreen}
                  options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <TabIcon emoji="🌿" color={color} />,
                  }}
                />
                <Tab.Screen
                  name="KhatmTab"
                  component={KhatmScreen}
                  options={{
                    title: 'Khatm',
                    tabBarIcon: ({ color }) => <TabIcon emoji="📖" color={color} />,
                  }}
                />
                <Tab.Screen
                  name="MemoTab"
                  component={MemoScreen}
                  options={{
                    title: 'Memo',
                    tabBarIcon: ({ color }) => <TabIcon emoji="🧠" color={color} />,
                  }}
                />
                <Tab.Screen
                  name="ExploreTab"
                  component={ExploreScreen}
                  options={{
                    title: 'Explore',
                    tabBarIcon: ({ color }) => <TabIcon emoji="🔍" color={color} />,
                  }}
                />
                <Tab.Screen
                  name="StatsTab"
                  component={StatsScreen}
                  options={{
                    title: 'Stats',
                    tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} />,
                  }}
                />
              </Tab.Navigator>
            </SafeAreaView>
          </NavigationContainer>
        </AppProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
