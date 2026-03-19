import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import ViewShot from "react-native-view-shot";
import { formatDistance, formatPace, formatDuration, formatDate } from "@/lib/format";

export interface ShareCardRef {
  capture: () => Promise<string | undefined>;
}

interface ShareCardProps {
  title: string;
  distanceM: number;
  avgPaceSecKm: number | null;
  movingTimeSec: number;
  startTime: string;
  activityType: string;
}

const ShareCard = forwardRef<ShareCardRef, ShareCardProps>(
  ({ title, distanceM, avgPaceSecKm, movingTimeSec, startTime, activityType }, ref) => {
    const viewShotRef = useRef<ViewShot>(null);

    useImperativeHandle(ref, () => ({
      capture: async () => {
        if (!viewShotRef.current?.capture) return undefined;
        return viewShotRef.current.capture();
      },
    }));

    return (
      <ViewShot
        ref={viewShotRef}
        options={{ format: "png", quality: 1, width: 1080, height: 1920 }}
      >
        <View style={s.card}>
          {/* Brand header */}
          <View style={s.header}>
            <Text style={s.logo}>ROTA<Text style={s.logoDot}>.</Text></Text>
            <Text style={s.subtitle}>ALSANCAK RUNNERS</Text>
          </View>

          {/* Activity info */}
          <View style={s.body}>
            <Text style={s.activityType}>{activityType.toUpperCase()}</Text>
            <Text style={s.title}>{title}</Text>
            <Text style={s.date}>{formatDate(startTime)}</Text>

            {/* Main stat: distance */}
            <View style={s.mainStat}>
              <Text style={s.mainStatValue}>{formatDistance(distanceM)}</Text>
              <Text style={s.mainStatUnit}>KM</Text>
            </View>

            {/* Secondary stats */}
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statValue}>{formatPace(avgPaceSecKm)}</Text>
                <Text style={s.statLabel}>TEMPO</Text>
              </View>
              <View style={s.divider} />
              <View style={s.statBox}>
                <Text style={s.statValue}>{formatDuration(movingTimeSec)}</Text>
                <Text style={s.statLabel}>SURE</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>rota.app</Text>
          </View>
        </View>
      </ViewShot>
    );
  }
);

ShareCard.displayName = "ShareCard";
export default ShareCard;

const ACCENT = "#E6FF00";
const BG = "#1a1a2e";

const s = StyleSheet.create({
  card: {
    width: 1080,
    height: 1920,
    backgroundColor: BG,
    justifyContent: "space-between",
    padding: 80,
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
  },
  logo: {
    fontSize: 64,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 12,
  },
  logoDot: {
    color: ACCENT,
  },
  subtitle: {
    fontSize: 20,
    color: "#888888",
    letterSpacing: 8,
    marginTop: 8,
  },
  body: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  activityType: {
    fontSize: 18,
    color: "#888888",
    letterSpacing: 6,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  date: {
    fontSize: 20,
    color: "#555555",
    letterSpacing: 2,
    marginBottom: 60,
  },
  mainStat: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 48,
  },
  mainStatValue: {
    fontSize: 120,
    fontWeight: "bold",
    color: ACCENT,
    lineHeight: 120,
  },
  mainStatUnit: {
    fontSize: 32,
    color: "#888888",
    letterSpacing: 4,
    marginLeft: 8,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 40,
  },
  statBox: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 16,
    color: "#555555",
    letterSpacing: 4,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#333333",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 18,
    color: "#555555",
    letterSpacing: 4,
  },
});
