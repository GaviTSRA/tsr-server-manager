import { router } from "../trpc.js";
import { serverTypeRouter as mcForgeRouter } from "../../../servertypes/mc-forge/router.js";
import { serverTypeRouter as factorioRouter } from "../../../servertypes/factorio/router.js";

export const customRouter = router({
  mcForge: mcForgeRouter,
  factorio: factorioRouter,
});
