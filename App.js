import {
  Canvas,
  useImage,
  Image as SkiaImage,
  Group,
  rotate,
  Text,
  matchFont,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";

const GRAVITY = 1000;
const JUMP_FORCE = -500;
const PIPE_GAP = 250;
const pipeWidth = 106;
const pipeHeight = 640;

const App = () => {
  const { width, height } = useWindowDimensions();
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isRestarting, setIsRestarting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const bg = useImage(require("./assets/sprites/background-day.png"));
  const bird = useImage(require("./assets/sprites/yellowbird-upflap.png"));
  const pipeTop = useImage(require("./assets/sprites/pipe-green-top.png"));
  const pipeBottom = useImage(require("./assets/sprites/pipe-green.png"));
  const base = useImage(require("./assets/sprites/base.png"));

  const gameOver = useSharedValue(false);
  const x = useSharedValue(width);
  const birdY = useSharedValue(height / 3);
  const birdYVelocity = useSharedValue(0);
  const pipeOffset = useSharedValue(0);
  const birdPos = { x: width / 4 };

  const loadHighScore = async () => {
    try {
      const saved = await AsyncStorage.getItem("flappyBirdHighScore");
      if (saved !== null) setHighScore(parseInt(saved));
    } catch (e) {
      console.log("Error loading high score", e);
    }
  };

  const saveHighScore = async (newScore) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      await AsyncStorage.setItem("flappyBirdHighScore", newScore.toString());
    }
  };

  const moveMap = () => {
    x.value = withRepeat(
      withSequence(
        withTiming(-pipeWidth, { duration: 3000, easing: Easing.linear }),
        withTiming(width, { duration: 0 })
      ),
      -1
    );
  };

  useEffect(() => {
    moveMap();
    loadHighScore();
  }, []);

  const gapCenter = height / 2;
  const topPipeY = useDerivedValue(
    () => gapCenter - PIPE_GAP / 2 - pipeHeight + pipeOffset.value
  );
  const bottomPipeY = useDerivedValue(
    () => gapCenter + PIPE_GAP / 2 + pipeOffset.value
  );

  useAnimatedReaction(
    () => x.value,
    (current, prev) => {
      if (prev && current >= width && prev < width) {
        pipeOffset.value = Math.random() * 300 - 150;
      }

      if (!gameOver.value && prev && current <= birdPos.x && prev > birdPos.x) {
        const newScore = score + 1;
        runOnJS(setScore)(newScore);
        runOnJS(saveHighScore)(newScore);
      }
    }
  );

  const isPointColliding = (point, rect) => {
    "worklet";
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h
    );
  };

  const obstacles = useDerivedValue(() => [
    { x: x.value, y: bottomPipeY.value, w: pipeWidth, h: pipeHeight },
    { x: x.value, y: topPipeY.value, w: pipeWidth, h: pipeHeight },
  ]);

  useAnimatedReaction(
    () => birdY.value,
    () => {
      const isOffscreen = birdY.value > height - 100 || birdY.value < 0;
      const birdPoints = [
        { x: birdPos.x, y: birdY.value },
        { x: birdPos.x + 52, y: birdY.value },
        { x: birdPos.x, y: birdY.value + 40 },
        { x: birdPos.x + 52, y: birdY.value + 40 },
      ];

      const collides = obstacles.value.some((pipe) =>
        birdPoints.some((pt) => isPointColliding(pt, pipe))
      );

      if (isOffscreen || collides) gameOver.value = true;
    }
  );

  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          runOnJS(restartGame)(); // Start the game when countdown finishes
          setIsRestarting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const showGameOverAlert = () => {
    Alert.alert(
      "Game Over",
      `Score: ${score}\nBest: ${highScore}`,
      [
        {
          text: "Play Again",
          onPress: () => {
            setIsRestarting(true);
            startCountdown();
          },
        },
        {
          text: "See Highscore",
          onPress: () => {
            Alert.alert(
              "Highscore",
              `Your best is ${highScore}`,
              [
                {
                  text: "OK",
                  onPress: () => {
                    setIsRestarting(true);
                    startCountdown();
                  },
                },
              ],
              { cancelable: false }
            );
          },
        },
      ],
      { cancelable: false }
    );
  };

  useAnimatedReaction(
    () => gameOver.value,
    (curr, prev) => {
      if (curr && !prev) {
        cancelAnimation(x);
        runOnJS(showGameOverAlert)();
      }
    }
  );

  const restartGame = () => {
    birdY.value = height / 3;
    birdYVelocity.value = 0;
    gameOver.value = false;
    x.value = width;
    pipeOffset.value = 0;
    moveMap(); // Restart the pipe movement
    setScore(0);
  };

  const gesture = Gesture.Tap().onStart(() => {
    if (gameOver.value && !isRestarting) {
      return;
    }

    if (isRestarting) {
      return;
    }

    if (gameOver.value) {
      runOnJS(restartGame)();
    } else {
      birdYVelocity.value = JUMP_FORCE;
    }
  });

  useFrameCallback(({ timeSincePreviousFrame: dt }) => {
    if (!dt || gameOver.value) return;
    birdY.value += (birdYVelocity.value * dt) / 1000;
    birdYVelocity.value += (GRAVITY * dt) / 1000;
  });

  const font = matchFont({
    fontFamily: Platform.select({
      ios: "Courier New",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 48,
    fontWeight: "bold",
  });

  const countdownFont = matchFont({
    fontFamily: Platform.select({
      ios: "Courier New",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 72,
    fontWeight: "bold",
  });

  const birdTransform = useDerivedValue(() => [
    {
      rotate: interpolate(
        birdYVelocity.value,
        [-500, 500],
        [-0.5, 0.5],
        Extrapolation.CLAMP
      ),
    },
  ]);

  const birdOrigin = useDerivedValue(() => ({
    x: width / 4 + 26,
    y: birdY.value + 20,
  }));

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }}>
          <Canvas style={{ width, height }}>
            <SkiaImage image={bg} width={width} height={height} fit="cover" />
            <SkiaImage
              image={pipeTop}
              x={x}
              y={topPipeY}
              width={pipeWidth}
              height={pipeHeight}
            />
            <SkiaImage
              image={pipeBottom}
              x={x}
              y={bottomPipeY}
              width={pipeWidth}
              height={pipeHeight}
            />
            <SkiaImage
              image={base}
              width={width}
              height={150}
              x={0}
              y={height - 90}
              fit="cover"
            />
            <Group transform={birdTransform} origin={birdOrigin}>
              <SkiaImage
                image={bird}
                x={birdPos.x}
                y={birdY}
                width={52}
                height={40}
              />
            </Group>
            <Text
              x={width / 2 - 15}
              y={80}
              text={score.toString()}
              font={font}
              color="white"
            />
            {countdown > 0 && (
              <Text
                x={width / 2 - 30}
                y={height / 2}
                text={countdown.toString()}
                font={countdownFont}
                color="white"
              />
            )}
          </Canvas>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

export default App;
