import { router } from "../trpc.js";
import { serverTypeRouter as mcForgeRouter } from "../../../servertypes/mc-forge/router.js";

export const customRouter = router({
  mcForge: mcForgeRouter,
});
