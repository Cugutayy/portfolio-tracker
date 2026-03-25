import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing } from "react-native";
import { brand } from "@/constants/Colors";

interface Props {
  visible: boolean;
  emoji: string;
  title: string;
  description: string;
  onClose: () => void;
}

export default function MilestoneModal({ visible, emoji, title, description, onClose }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[s.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={s.emoji}>{emoji}</Text>
          <Text style={s.congrats}>Tebrikler!</Text>
          <Text style={s.title}>{title}</Text>
          <Text style={s.description}>{description}</Text>
          <TouchableOpacity style={s.button} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.buttonText}>DEVAM</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center", padding: 32,
  },
  card: {
    backgroundColor: brand.surface, borderRadius: 24, padding: 32,
    alignItems: "center", width: "100%", maxWidth: 320,
    borderWidth: 1, borderColor: brand.borderLight,
  },
  emoji: { fontSize: 56, marginBottom: 16 },
  congrats: { fontSize: 12, color: brand.accent, fontWeight: "700", letterSpacing: 3, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: brand.text, textAlign: "center", marginBottom: 8 },
  description: { fontSize: 14, color: brand.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  button: {
    backgroundColor: brand.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40,
  },
  buttonText: { fontSize: 13, fontWeight: "800", color: brand.bg, letterSpacing: 2 },
});
