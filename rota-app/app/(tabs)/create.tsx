import { View } from "react-native";
import { brand } from "@/constants/Colors";

// Stub — tab press is intercepted by CreateTabButton in _layout.tsx
// which navigates to /create-event modal instead
export default function CreateStub() {
  return <View style={{ flex: 1, backgroundColor: brand.bg }} />;
}
