import Phaser from "phaser";

export function goToScene(currentScene: Phaser.Scene, targetSceneKey: string): void {
  // ===================================================================
  // STAGE 1: BEFORE SCENE TRANSITION
  // ===================================================================
  // - Disable all input on the current scene so clicks/touches are
  //   blocked during the transition.
  // - Optionally show a loading overlay or fade-out effect here.
  // - Load/prepare any data the target scene needs ahead of time.
  // ===================================================================
  currentScene.input.enabled = false;

  // ===================================================================
  // STAGE 2: DURING SCENE TRANSITION
  // ===================================================================
  // - Phaser's scene.start() automatically:
  //     • Calls shutdown() on the current scene, which destroys all
  //       of its game objects (sprites, text, containers, etc.).
  //     • Calls create() on the target scene to build it fresh.
  // - Clean up textures that are no longer needed across scenes
  //   (triggered by the target scene's create() below).
  // ===================================================================
  currentScene.scene.start(targetSceneKey);

  // ===================================================================
  // STAGE 3: AFTER SCENE TRANSITION
  // ===================================================================
  // - In the target scene's create(), input is re-enabled and a brief
  //   transition-complete effect (fade-in, scale-bounce, etc.) plays.
  // - See the create() method in each scene for this implementation.
  // ===================================================================
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
