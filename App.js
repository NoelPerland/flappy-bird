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
} from "react-native-reanimated";
import { useEffect } from "react";

const App = () => {
  const { width, height } = useWindowDimensions();

  const bg = useImage(require("./assets/sprites/background-day.png"));
  const bird = useImage(require("./assets/sprites/yellowbird-upflap.png"));
  const pipeTop = useImage(require("./assets/sprites/pipe-green-top.png"));
  const pipeBottom = useImage(require("./assets/sprites/pipe-green.png"));
  const base = useImage(require("./assets/sprites/base.png"));

  const x = useSharedValue(width);

  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(-150, { duration: 3000, easing: Easing.linear }),
        withTiming(width, { duration: 0 })
      ),
      -1
    );
  }, []);

  const pipeOffest = 0;

  return (
    <Canvas style={{ width, height }}>
      {/*BG */}
      <SkiaImage image={bg} width={width} height={height} fit={"cover"} />

      {/*Pipe top*/}
      <SkiaImage
        image={pipeTop}
        y={pipeOffest - 300}
        x={x}
        width={100}
        height={600}
      />
      {/*Pipe bottom*/}
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

      {/*Brid */}
      <SkiaImage
        image={bird}
        y={height / 2 - 18}
        x={100}
        width={48}
        height={36}
      />
    </Canvas>
  );
};

export default App;
