import {
  Canvas,
  useImage,
  Image as SkiaImage,
  Group,
  rotate,
  Text,
  matchFont,
  Circle,
} from "@shopify/react-native-skia";
import { useWindowDimensions, View, Platform, Alert } from "react-native";

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
  cancelAnimation,
} from "react-native-reanimated";
import React, { useState, useEffect } from "react";

import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";

const GRAVITY = 1000; // pixels per frame
const JUMP_FORCE = -500;

const pipieWidth = 106;
const pipieHeight = 640;

const App = () => {
  const { width, height } = useWindowDimensions();
  const [score, setScore] = useState(0);

  const bg = useImage(require("./assets/sprites/background-day.png"));
  const bird = useImage(require("./assets/sprites/yellowbird-upflap.png"));
  const pipeTop = useImage(require("./assets/sprites/pipe-green-top.png"));
  const pipeBottom = useImage(require("./assets/sprites/pipe-green.png"));
  const base = useImage(require("./assets/sprites/base.png"));
  const gameOver = useSharedValue(false);

  const x = useSharedValue(width);

  const birdY = useSharedValue(height / 3);
  const birdPos = {
    x: width / 4,
  };

  const birdYVelocity = useSharedValue(0);
  const birdCenterX = useDerivedValue(() => birdPos.x + 26); // bird width is 52, so center is at 26
  const birdCenterY = useDerivedValue(() => birdY.value + 20); // bird height is 40, so center is at 20
  const pipeOffest = 0;
  const allObstacles = useDerivedValue(() => {
    const allObstacles = [];
    // add bottom ppie
    allObstacles.push({
      x: x.value + pipeOffest,
      y: height - 300 + pipeOffest,
      h: pipieHeight,
      w: pipieWidth,
    });
    //add top pipe
    allObstacles.push({
      x: x.value + pipeOffest,
      y: pipeOffest,
      h: pipieHeight - 300,
      w: pipieWidth,
    });
    return allObstacles;
  });

  useEffect(() => {
    moveTheMap();
  }, []);

  const moveTheMap = () => {
    x.value = withRepeat(
      withSequence(
        withTiming(-150, { duration: 3000, easing: Easing.linear }),
        withTiming(width, { duration: 0 })
      ),
      -1
    );
  };

  // Scoring
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

  const isPointCollidingWithRect = (point, rect) => {
    "worklet";
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h
    );
  };

  // Define obstacles
  const obstacles = useDerivedValue(() => [
    // Bottom pipe
    {
      x: x.value,
      y: height - 300 + pipeOffest,
      w: pipieWidth,
      h: pipieHeight,
    },
    // Top pipe
    {
      x: x.value,
      y: pipeOffest - 300,
      w: pipieWidth,
      h: pipieHeight,
    },
  ]);

  // Collision detection
  useAnimatedReaction(
    () => birdY.value,
    (currentValue, previousValue) => {
      // Ground collision detection
      if (currentValue > height - 100 || currentValue < 0) {
        gameOver.value = true;
      }

      // Check multiple points around the bird's edges
      const birdPoints = [
        { x: birdPos.x, y: birdY.value }, // top-left
        { x: birdPos.x + 52, y: birdY.value }, // top-right
        { x: birdPos.x, y: birdY.value + 40 }, // bottom-left
        { x: birdPos.x + 52, y: birdY.value + 40 }, // bottom-right
        { x: birdPos.x + 26, y: birdY.value }, // top-center
        { x: birdPos.x + 26, y: birdY.value + 40 }, // bottom-center
        { x: birdPos.x, y: birdY.value + 20 }, // left-center
        { x: birdPos.x + 52, y: birdY.value + 20 }, // right-center
      ];

      const isColliding = obstacles.value.some((rect) =>
        birdPoints.some((point) => isPointCollidingWithRect(point, rect))
      );

      if (isColliding) {
        gameOver.value = true;
      }
    }
  );
  useAnimatedReaction(
    () => gameOver.value,
    (currentValue, previousValue) => {
      if (currentValue && !previousValue) {
        cancelAnimation(x);
      }
    }
  );

  useFrameCallback(({ timeSincePreviousFrame: dt }) => {
    if (!dt || gameOver.value) {
      return;
    }
    birdY.value = birdY.value + (birdYVelocity.value * dt) / 1000;
    birdYVelocity.value = birdYVelocity.value + (GRAVITY * dt) / 1000;
  });

  const restartGame = () => {
    "worklet";
    birdY.value = height / 3;
    birdYVelocity.value = 0;
    gameOver.value = false;
    x.value = width;
    runOnJS(moveTheMap)();
    runOnJS(setScore)(0);
  };

  const gesture = Gesture.Tap().onStart(() => {
    if (gameOver.value) {
      //restart
      restartGame();
    } else {
      //jump
      birdYVelocity.value = JUMP_FORCE;
    }
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
              width={pipieWidth}
              height={pipieHeight}
            />

            {/* Pipe Bottom */}
            <SkiaImage
              image={pipeBottom}
              y={height - 300 + pipeOffest}
              x={x}
              width={pipieWidth}
              height={pipieHeight}
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
              x={width / 2 - 20}
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
