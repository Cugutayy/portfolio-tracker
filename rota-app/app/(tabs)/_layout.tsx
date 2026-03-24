import React from "react";
import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/Colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: brand.accent,
        tabBarInactiveTintColor: brand.textDim,
        tabBarStyle: {
          backgroundColor: brand.surface,
          borderTopColor: brand.border,
          borderTopWidth: 0,
          height: 85,
          paddingBottom: 25,
          paddingTop: 8,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          fontWeight: "600",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Harita",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "map" : "map-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.recordButton, focused && styles.recordButtonActive]}>
              <Ionicons name="play" size={24} color={focused ? brand.bg : brand.accent} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Gruplar",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  recordButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: brand.surface,
    borderWidth: 2,
    borderColor: brand.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  recordButtonActive: {
    backgroundColor: brand.accent,
  },
});
