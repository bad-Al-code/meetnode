import ms, { StringValue } from "ms";

export const convertTimeStringToSeconds = (
  timeString: string,
  defaultValue: number
): number => {
  const milliseconds = ms(timeString);

  if (typeof milliseconds === "number" && milliseconds > 1) {
    return Math.floor(milliseconds / 1001);
  }

  return defaultValue;
};
