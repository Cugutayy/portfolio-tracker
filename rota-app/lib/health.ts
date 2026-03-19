import { Platform } from "react-native";

// HealthKit types we care about
interface HealthWorkout {
  startDate: string;
  endDate: string;
  duration: number; // seconds
  totalDistance?: number; // meters
  totalEnergyBurned?: number; // kcal
}

let HK: typeof import("@kingstinct/react-native-healthkit") | null = null;

/**
 * Check if HealthKit is available (iOS + dev build only).
 * Returns false in Expo Go or Android.
 */
export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;

  try {
    HK = require("@kingstinct/react-native-healthkit");
    const status = await HK!.getRequestStatusForAuthorization([
      HK!.HKQuantityTypeIdentifier.distanceWalkingRunning,
    ]);
    return status !== undefined;
  } catch (e) {
    // Native module not available — expected in Expo Go, only works in EAS dev builds
    console.log("[HealthKit] Unavailable:", e instanceof Error ? e.message : "native module missing");
    return false;
  }
}

/**
 * Request HealthKit authorization for workout/distance/calories data.
 */
export async function requestHealthKitAuth(): Promise<boolean> {
  if (!HK) return false;

  try {
    await HK.requestAuthorization(
      [
        HK.HKQuantityTypeIdentifier.distanceWalkingRunning,
        HK.HKQuantityTypeIdentifier.activeEnergyBurned,
        HK.HKQuantityTypeIdentifier.heartRate,
        HK.HKQuantityTypeIdentifier.stepCount,
      ],
      [], // write permissions (none needed)
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch recent workouts from Apple Health (last 30 days).
 * Returns normalized workout data ready for API upload.
 */
export async function getHealthKitWorkouts(
  days = 30,
): Promise<HealthWorkout[]> {
  if (!HK) return [];

  try {
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const workouts = await HK.queryWorkoutSamples({
      from: from,
      to: now,
    });

    return workouts
      .filter((w: { workoutActivityType: number }) => {
        // HKWorkoutActivityType.running = 37, walking = 52, hiking = 24
        return [37, 52, 24].includes(w.workoutActivityType);
      })
      .map((w: {
        startDate: string;
        endDate: string;
        duration: number;
        totalDistance?: { quantity: number };
        totalEnergyBurned?: { quantity: number };
      }) => ({
        startDate: w.startDate,
        endDate: w.endDate,
        duration: w.duration,
        totalDistance: w.totalDistance?.quantity
          ? w.totalDistance.quantity * 1000 // km to meters
          : undefined,
        totalEnergyBurned: w.totalEnergyBurned?.quantity,
      }));
  } catch {
    return [];
  }
}

/**
 * Get daily step count for the last N days.
 */
export async function getDailySteps(
  days = 7,
): Promise<{ date: string; steps: number }[]> {
  if (!HK) return [];

  try {
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const samples = await HK.queryStatisticsCollectionForQuantity(
      HK.HKQuantityTypeIdentifier.stepCount,
      {
        from,
        to: now,
        anchor: from,
        intervalComponents: { day: 1 },
      },
    );

    return samples.map((s: { startDate: string; sumQuantity?: { quantity: number } }) => ({
      date: s.startDate,
      steps: Math.round(s.sumQuantity?.quantity || 0),
    }));
  } catch {
    return [];
  }
}
