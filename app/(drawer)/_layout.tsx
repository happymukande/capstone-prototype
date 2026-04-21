import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { useRole } from '../../src/context/RoleContext';
import { useAppTheme } from '../../src/context/ThemeContext';

export default function DrawerLayout() {
  const { role } = useRole();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 920;
  const showAdmin = role === 'teacher' || role === 'admin';

  return (
    <Drawer
      initialRouteName="index"
      screenOptions={{
        drawerType: isLargeScreen ? 'permanent' : 'front',
        sceneStyle: {
          backgroundColor: colors.screenBackground,
        },
        drawerStyle: {
          width: 280,
          backgroundColor: colors.drawerBackground,
          borderRightWidth: 1,
          borderRightColor: colors.border,
        },
        drawerItemStyle: {
          borderRadius: 14,
          marginHorizontal: 12,
          marginVertical: 4,
        },
        drawerLabelStyle: {
          fontWeight: '600',
        },
        drawerActiveTintColor: colors.drawerActiveText,
        drawerInactiveTintColor: colors.drawerInactiveText,
        drawerActiveBackgroundColor: colors.drawerActiveBackground,
        headerStyle: {
          backgroundColor: colors.heroBackground,
        },
        headerTintColor: colors.onStrong,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Home',
          drawerLabel: 'Home',
          drawerIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: 'Profile',
          drawerLabel: 'Profile',
          drawerIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
        }}
      />
      <Drawer.Screen
        name="courses"
        options={{
          title: 'Courses',
          drawerLabel: 'Courses',
          drawerIcon: ({ color, size }) => <Ionicons name="book-outline" color={color} size={size} />,
        }}
      />
      <Drawer.Screen
        name="community"
        options={{
          title: 'Community',
          drawerLabel: 'Community',
          drawerIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerLabel: 'Settings',
          drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
        }}
      />
      <Drawer.Screen
        name="test-your-knowledge"
        options={{
          title: 'Test Your Knowledge',
          drawerLabel: 'Test your knowledge',
          drawerIcon: ({ color, size }) => <Ionicons name="game-controller-outline" color={color} size={size} />,
        }}
      />
      <Drawer.Screen
        name="support-us"
        options={{
          title: 'Support Us',
          drawerLabel: 'Support Us',
          drawerIcon: ({ color, size }) => <Ionicons name="heart-outline" color={color} size={size} />,
        }}
      />
      <Drawer.Protected guard={showAdmin}>
        <Drawer.Screen
          name="admin"
          options={{
            title: 'Teacher Admin',
            drawerLabel: 'Teacher Admin',
            drawerIcon: ({ color, size }) => <Ionicons name="construct-outline" color={color} size={size} />,
          }}
        />
      </Drawer.Protected>
    </Drawer>
  );
}
