import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";

function CreateTabButton({ children, ...props }: any) {
  return (
    <TouchableOpacity
      {...props}
      style={fab.wrap}
      activeOpacity={0.8}
      onPress={() => router.push("/create-event" as never)}
    >
      <View style={fab.circle}>
        <Ionicons name="add" size={28} color="#FFF" />
      </View>
    </TouchableOpacity>
  );
}

const fab = StyleSheet.create({
  wrap: { top: -16, justifyContent: "center", alignItems: "center" },
  circle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: brand.accent,
    justifyContent: "center", alignItems: "center",
    shadowColor: brand.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: brand.accent,
        tabBarInactiveTintColor: brand.textDim,
        tabBarStyle: {
          backgroundColor: "rgba(22,27,34,0.92)",
          borderTopColor: "rgba(48,54,61,0.5)",
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          letterSpacing: 1,
          fontWeight: "600",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Harita",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "map" : "map-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Kesfet",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarButton: (props) => <CreateTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Bildirimler",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
      {/* Hidden tabs — kept for Expo Router file routing but not shown in tab bar */}
      <Tabs.Screen name="groups" options={{ href: null }} />
      <Tabs.Screen name="map" options={{ href: null }} />
      <Tabs.Screen name="track" options={{ href: null }} />
      <Tabs.Screen name="events" options={{ href: null }} />
    </Tabs>
  );
}
