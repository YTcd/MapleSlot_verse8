import Phaser from "phaser";

export abstract class BaseScene extends Phaser.Scene {
  preload() {}

  create() {
    this.input.enabled = true;
    const children = this.buildScene();
    this.fadeIn(children);
  }

  update() {}

  protected abstract buildScene(): Phaser.GameObjects.GameObject[];

  protected fadeIn(children: Phaser.GameObjects.GameObject[]) {
    children.forEach((child) => (child as Phaser.GameObjects.Components.Alpha).setAlpha(0));
    this.tweens.add({
      targets: children,
      alpha: 1,
      duration: 300,
      ease: "Power2",
      delay: this.tweens.stagger(60),
    });
  }
}
