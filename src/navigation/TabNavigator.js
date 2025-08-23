import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import screens
import PlanningScreen from '../screens/PlanningScreen';
import TrackingScreen from '../screens/TrackingScreen';
import SummaryScreen from '../screens/SummaryScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#2D2D35', // surface color
          borderTopColor: '#404045', // divider color
          borderTopWidth: 1,
          height: 70, // Keep original background height
          paddingBottom: 0, // Minimal bottom padding
          paddingTop: 0, // More top padding to move text up
          position: 'absolute', // Make sure tab bar doesn't interfere with content
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarShowLabel: true, // Show labels
        tabBarActiveTintColor: '#81C784', // income color
        tabBarInactiveTintColor: '#F3F4F6', // textLight color
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          textTransform: 'capitalize',
          marginBottom: 0, // Remove margin to position text higher
          marginTop: -15, // Pull text much higher up
          lineHeight: 16, // Tighter line height
        },
        tabBarIcon: () => null, // Explicitly remove all icons
      }}
    >
      <Tab.Screen 
        name="Planning" 
        component={PlanningScreen}
      />
      
      <Tab.Screen 
        name="Tracking" 
        component={TrackingScreen}
      />
      
      <Tab.Screen 
        name="Summary" 
        component={SummaryScreen}
      />
    </Tab.Navigator>
  );
}
