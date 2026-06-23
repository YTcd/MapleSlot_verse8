import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private stars!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;
  private score = 0;
  private groundCollider!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(0x4488ff);
    g.fillRect(0, 0, 40, 50);
    g.generateTexture('player', 40, 50);

    g.clear();
    g.fillStyle(0xffdd44);
    g.fillCircle(16, 16, 14);
    g.generateTexture('star', 32, 32);

    g.clear();
    g.fillStyle(0x228844);
    g.fillRect(0, 0, 120, 20);
    g.generateTexture('platform', 120, 20);

    g.clear();
    g.fillStyle(0x886644);
    g.fillRect(0, 0, 64, 20);
    g.generateTexture('ground', 64, 20);

    g.destroy();
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.physics.world.setBounds(0, 0, w, h);
    this.physics.world.checkCollision.down = false;

    this.cameras.main.setBackgroundColor('#87CEEB');

    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(100);

    this.groundCollider = this.physics.add.staticGroup();
    const groundCount = Math.ceil(w / 64) + 1;
    for (let i = 0; i < groundCount; i++) {
      const g = this.groundCollider.create(i * 64 + 32, h - 10, 'ground') as Phaser.Physics.Arcade.Image;
      g.setDisplaySize(64, 20).refreshBody();
    }

    this.player = this.physics.add.sprite(w / 2, h - 200, 'player');
    this.player.setDisplaySize(40, 50);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    this.stars = this.physics.add.group();

    const platforms = this.physics.add.staticGroup();
    const platformPositions = [
      { x: w * 0.2, y: h * 0.65 },
      { x: w * 0.5, y: h * 0.5 },
      { x: w * 0.8, y: h * 0.65 },
      { x: w * 0.35, y: h * 0.35 },
      { x: w * 0.65, y: h * 0.35 },
    ];

    platformPositions.forEach((pos) => {
      const plat = platforms.create(pos.x, pos.y, 'platform') as Phaser.Physics.Arcade.Image;
      plat.setDisplaySize(120, 20).refreshBody();
    });

    platformPositions.forEach((pos) => {
      const star = this.stars.create(pos.x, pos.y - 40, 'star') as Phaser.Physics.Arcade.Sprite;
      star.setDisplaySize(28, 28);
      star.body!.allowGravity = false;
    });

    this.physics.add.collider(this.player, this.groundCollider);
    this.physics.add.collider(this.player, platforms);
    this.physics.add.overlap(this.player, this.stars, this.collectStar, undefined, this);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.tweens.add({
      targets: this.stars.getChildren(),
      y: '-=6',
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  update() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-280);
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(280);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if ((this.cursors.up.isDown || this.cursors.space?.isDown) && body.blocked.down) {
      this.player.setVelocityY(-500);
    }
  }

  private collectStar = (
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    star: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ) => {
    (star as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    this.score += 10;
    this.scoreText.setText(`Score: ${this.score}`);

    if (this.stars.countActive(true) === 0) {
      this.scoreText.setText(`Score: ${this.score} — All collected!`);

      const w = this.cameras.main.width;
      const h = this.cameras.main.height;
      this.stars.children.iterate((child) => {
        const s = child as Phaser.Physics.Arcade.Sprite;
        s.enableBody(true, w * Phaser.Math.FloatBetween(0.1, 0.9), h * Phaser.Math.FloatBetween(0.1, 0.5), true, true);
        s.body!.allowGravity = false;
        return true;
      });
    }
  };
}
