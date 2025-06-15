import {
  Canvas,
  useImage,
  Image as SkiaImage,
  Group,
  rotate,
  Text,
  matchFont,
} from "@shopify/react-native-skia";
import { useWindowDimensions, View, Platform } from "react-native";

import {
  useSharedValue,
  withTiming,
  Easing,
  withSequence,
  withRepeat,
  useFrameCallback,
  interpolate,
  useDerivedValue,
  Extrapolation,
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";
import React, { useState, useEffect } from "react";

import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";

const GRAVITY = 1000; // pixels per frame
const JUMP_FORCE = -500;

const App = () => {
  const { width, height } = useWindowDimensions();
  const [score, setScore] = useState(0);

  const bg = useImage(require("./assets/sprites/background-day.png"));
  const bird = useImage(require("./assets/sprites/yellowbird-upflap.png"));
  const pipeTop = useImage(require("./assets/sprites/pipe-green-top.png"));
  const pipeBottom = useImage(require("./assets/sprites/pipe-green.png"));
  const base = useImage(require("./assets/sprites/base.png"));

  const x = useSharedValue(width);

  const birdY = useSharedValue(height / 3);
  const birdPos = {
    x: width / 4,
  };

  const birdYVelocity = useSharedValue(0);

  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(-150, { duration: 3000, easing: Easing.linear }),
        withTiming(width, { duration: 0 })
      ),
      -1
    );
  }, []);

  useAnimatedReaction(
    () => x.value,
    (currentValue, previousValue) => {
      const middle = birdPos.x;

      if (
        currentValue !== previousValue &&
        previousValue &&
        currentValue <= middle &&
        previousValue > middle
      ) {
        runOnJS(setScore)(score + 1);
      }
    }
  );

  useFrameCallback(({ timeSincePreviousFrame: dt }) => {
    if (!dt) {
      return;
    }
    birdY.value = birdY.value + (birdYVelocity.value * dt) / 1000;
    birdYVelocity.value = birdYVelocity.value + (GRAVITY * dt) / 1000;
  });

  const gesture = Gesture.Tap().onStart(() => {
    birdYVelocity.value = JUMP_FORCE;
  });

  const birdTransform = useDerivedValue(() => {
    return [
      {
        rotate: interpolate(
          birdYVelocity.value,
          [-500, 500],
          [-0.5, 0.5],
          Extrapolation.CLAMP
        ),
      },
    ];
  });
  const birdOrigin = useDerivedValue(() => {
    return { x: width / 4 + 26, y: birdY.value + 20 };
  });

  const pipeOffest = 0;

  const fontFamily = Platform.select({ ios: "Helvetica", default: "serif" });
  const fontStyle = {
    fontFamily,
    fontSize: 40,
    fontWeight: "bold",
  };
  const font = matchFont(fontStyle);

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
            <Group transform={birdTransform} origin={birdOrigin}>
              <SkiaImage
                image={bird}
                y={birdY}
                x={birdPos.x}
                width={52}
                height={40}
              />
            </Group>
            {/* Score */}
            <Text
              x={width / 2 - 30}
              y={100}
              text={score.toString()}
              font={font}
            />
          </Canvas>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

export default App;
