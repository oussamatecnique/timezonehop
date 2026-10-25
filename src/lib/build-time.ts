/** The single "now" used for all build-time content. Override with BUILD_NOW (epoch ms). */
export const BUILD_NOW: number = Number(process.env.BUILD_NOW) || Date.now();
