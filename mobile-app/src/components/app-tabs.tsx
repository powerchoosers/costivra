import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function AppTabs() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#d4ff5a',
      tabBarInactiveTintColor: '#9ba7ba',
      tabBarStyle: { backgroundColor: '#080b14', borderTopColor: '#263144', height: 72, paddingTop: 7 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color, focused }) => <Ionicons color={color} name="pie-chart-outline" size={focused ? 22 : 20} /> }} />
      <Tabs.Screen name="opportunities" options={{ title: 'Cases', tabBarIcon: ({ color, focused }) => <Ionicons color={color} name="aperture-outline" size={focused ? 22 : 20} /> }} />
      <Tabs.Screen name="actions" options={{ title: 'Actions', tabBarIcon: ({ color, focused }) => <Ionicons color={color} name="checkbox-outline" size={focused ? 22 : 20} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, focused }) => <Ionicons color={color} name="ellipsis-horizontal" size={focused ? 22 : 20} /> }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
