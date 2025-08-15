import "./global.css";
import PlanningScreen from "./src/screens/PlanningScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" translucent />
        <PlanningScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
