import {
  Canvas,
  useImage,
  Image as SkiaImage,
} from "@shopify/react-native-skia";
import { useWindowDimensions, View } from "react-native";
import {
  useSharedValue,
  withTiming,
  Easing,
  withSequence,
  withRepeat,
  useFrameCallback,
} from "react-native-reanimated";
import { useEffect } from "react";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";

const GRAVITY = 600; // pixels per frame

const App = () => {
  const { width, height } = useWindowDimensions();

  const bg = useImage(require("./assets/sprites/background-day.png"));
  const bird = useImage(require("./assets/sprites/yellowbird-upflap.png"));
  const pipeTop = useImage(require("./assets/sprites/pipe-green-top.png"));
  const pipeBottom = useImage(require("./assets/sprites/pipe-green.png"));
  const base = useImage(require("./assets/sprites/base.png"));

  const x = useSharedValue(width);

  const birdY = useSharedValue(0);
  const birdYVelocity = useSharedValue(100);

  useFrameCallback(({ timeSincePreviousFrame: dt }) => {
    if (!dt) {
      return;
    }
    birdY.value = birdY.value + (birdYVelocity.value * dt) / 1000;
    birdYVelocity.value = birdYVelocity.value + (GRAVITY * dt) / 1000;
  });

  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(-150, { duration: 3000, easing: Easing.linear }),
        withTiming(width, { duration: 0 })
      ),
      -1
    );
  }, []);

  const gesture = Gesture.Tap().onStart(() => {
    birdYVelocity.value = -300;
  });

  const pipeOffest = 0;

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }}>
          <Canvas style={{ width, height }}>
            {/* BG */}
            <SkiaImage image={bg} width={width} height={height} fit={"cover"} />

            {/* Pipe Top */}
            <SkiaImage
              image={pipeTop}
              y={pipeOffest - 300}
              x={x}
              width={100}
              height={600}
            />

            {/* Pipe Bottom */}
            <SkiaImage
              image={pipeBottom}
              y={height - 300 + pipeOffest}
              x={x}
              width={100}
              height={600}
            />

            {/* Base */}
            <SkiaImage
              image={base}
              width={width}
              height={150}
              x={0}
              y={height - 90}
              fit={"cover"}
            />

            {/* Bird */}
            <SkiaImage image={bird} y={birdY} x={100} width={48} height={36} />
          </Canvas>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

export default App;
