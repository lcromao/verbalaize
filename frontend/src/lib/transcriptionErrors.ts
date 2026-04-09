export const isFfmpegMissingError = (message: string) => {
  return message.toLowerCase().includes('ffmpeg');
};
