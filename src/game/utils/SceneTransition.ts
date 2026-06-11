import Phaser from "phaser";

export function goToScene(currentScene: Phaser.Scene, targetSceneKey: string): void {
  // ===================================================================
  // STAGE 1: BEFORE SCENE TRANSITION
  // ===================================================================
  // - Disable all input on the current scene so clicks/touches are
  //   blocked during the transition.
  // - Load/prepare any data the target scene needs ahead of time.
  // ===================================================================
  currentScene.input.enabled = false;

  // ===================================================================
  // STAGE 2: DURING SCENE TRANSITION (LoadingScene)
  // ===================================================================
  // - Starts LoadingScene, passing the target scene key.
  // - LoadingScene handles the actual work:
  //   • Destroys current scene children via Phaser's shutdown()
  //   • Displays progress bar simulating preload (network calls, asset
  //     loading, etc.) with a minimum 2-second visible duration.
  //   • Once loading completes AND 2 seconds have elapsed, transitions
  //     to the target scene.
  // ===================================================================
  currentScene.scene.start("LoadingScene", { targetScene: targetSceneKey });
}

export function cleanupTextures(
  scene: Phaser.Scene,
  textureKeys: string[]
): void {
  const manager = scene.textures;

  for (const key of textureKeys) {
    if (manager.exists(key)) {
      manager.remove(key);
    }
  }
}
