import React from 'react';
import Svg, { Rect } from 'react-native-svg';

export const Chart: React.FC<{ values: number[]; width?: number; height?: number; color?: string }> = ({ values, width = 300, height = 120, color = '#2D6AE3' }) => {
  const max = Math.max(1, ...values);
  const barW = width / Math.max(1, values.length);
  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => {
        const h = (v / max) * (height - 10);
        return <Rect key={i} x={i * barW + 4} y={height - h} width={barW - 8} height={h} rx={8} fill={color} />;
      })}
    </Svg>
  );
};
