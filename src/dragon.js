import * as THREE from 'three';

export class Dragon {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.lanes = [-3.2, 0, 3.2];
    this.currentLane = 1;
    this.targetX = 0;

    this.y = 0;
    this.vy = 0;
    this.gravity = -38;
    this.jumpForce = 15.5;
    this.isGrounded = true;
    this.isDucking = false;
    this.invulnerableTimer = 0;

    this.buildModel();
    this.scene.add(this.group);
  }

  buildModel() {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xd84315,
      roughness: 0.4,
      metalness: 0.2
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0xffb74d,
      roughness: 0.5
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xff7043,
      roughness: 0.35,
      side: THREE.DoubleSide,
      emissive: 0x3e1005
    });
    const hornMat = new THREE.MeshStandardMaterial({
      color: 0xfff3e0,
      roughness: 0.3
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.5
    });

    this.rig = new THREE.Group();
    this.group.add(this.rig);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 2.0), bodyMat);
    torso.position.set(0, 1.35, 0);
    torso.castShadow = true;
    this.rig.add(torso);

    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 1.8), bellyMat);
    belly.position.set(0, 0.9, 0);
    this.rig.add(belly);

    // Neck & Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.95, -0.95);
    this.rig.add(this.headGroup);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.7), bodyMat);
    neck.rotation.x = -0.35;
    neck.castShadow = true;
    this.headGroup.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 1.15), bodyMat);
    head.position.set(0, 0.35, -0.45);
    head.castShadow = true;
    this.headGroup.add(head);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.65), bellyMat);
    snout.position.set(0, 0.25, -1.15);
    this.headGroup.add(snout);

    // Eyes & Horns
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.2), eyeMat);
    leftEye.position.set(-0.42, 0.45, -0.55);
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.42;
    this.headGroup.add(leftEye, rightEye);

    const hornGeo = new THREE.ConeGeometry(0.12, 0.65, 6);
    const leftHorn = new THREE.Mesh(hornGeo, hornMat);
    leftHorn.position.set(-0.28, 0.85, -0.2);
    leftHorn.rotation.x = -0.5;
    const rightHorn = leftHorn.clone();
    rightHorn.position.x = 0.28;
    this.headGroup.add(leftHorn, rightHorn);

    // Spikes along back
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 5), hornMat);
      spike.position.set(0, 2.02, -0.55 + i * 0.45);
      this.rig.add(spike);
    }

    // Wings
    this.leftWing = new THREE.Group();
    this.leftWing.position.set(-0.55, 1.75, -0.15);
    const lWingMesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.15), wingMat);
    lWingMesh.position.set(-1.05, 0, 0.1);
    lWingMesh.castShadow = true;
    this.leftWing.add(lWingMesh);
    this.rig.add(this.leftWing);

    this.rightWing = new THREE.Group();
    this.rightWing.position.set(0.55, 1.75, -0.15);
    const rWingMesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.15), wingMat);
    rWingMesh.position.set(1.05, 0, 0.1);
    rWingMesh.castShadow = true;
    this.rightWing.add(rWingMesh);
    this.rig.add(this.rightWing);

    // Tail
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, 1.3, 1.0);
    this.rig.add(this.tailGroup);

    const tail1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 1.1), bodyMat);
    tail1.position.set(0, 0, 0.55);
    const tail2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1.1), bodyMat);
    tail2.position.set(0, 0.08, 1.45);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.65, 4), hornMat);
    tailTip.rotation.x = Math.PI / 2;
    tailTip.position.set(0, 0.12, 2.2);
    this.tailGroup.add(tail1, tail2, tailTip);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.36, 0.9, 0.42);
    this.legFL = new THREE.Mesh(legGeo, bodyMat);
    this.legFL.position.set(-0.45, 0.45, -0.65);
    this.legFR = new THREE.Mesh(legGeo, bodyMat);
    this.legFR.position.set(0.45, 0.45, -0.65);
    this.legBL = new THREE.Mesh(legGeo, bodyMat);
    this.legBL.position.set(-0.48, 0.45, 0.65);
    this.legBR = new THREE.Mesh(legGeo, bodyMat);
    this.legBR.position.set(0.48, 0.45, 0.65);
    this.rig.add(this.legFL, this.legFR, this.legBL, this.legBR);
  }

  reset() {
    this.currentLane = 1;
    this.targetX = this.lanes[1];
    this.group.position.set(0, 0, 0);
    this.y = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.isDucking = false;
    this.rig.scale.set(1, 1, 1);
    this.rig.rotation.set(0, 0, 0);
    this.invulnerableTimer = 0;
    this.group.visible = true;
  }

  moveLeft() {
    if (this.currentLane > 0) {
      this.currentLane--;
      this.targetX = this.lanes[this.currentLane];
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.currentLane < 2) {
      this.currentLane++;
      this.targetX = this.lanes[this.currentLane];
      return true;
    }
    return false;
  }

  jump() {
    if (this.isGrounded) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
      this.isDucking = false;
      return true;
    }
    return false;
  }

  setDuck(ducking) {
    if (ducking && !this.isGrounded) {
      this.vy = -25;
    }
    this.isDucking = ducking;
  }

  triggerInvulnerability(duration = 2.2) {
    this.invulnerableTimer = duration;
  }

  update(dt, elapsed, speedMultiplier) {
    // Smooth lane movement
    this.group.position.x += (this.targetX - this.group.position.x) * Math.min(1, dt * 14);
    const tilt = (this.targetX - this.group.position.x) * -0.18;
    this.rig.rotation.z = tilt;

    // Vertical jump physics
    if (!this.isGrounded) {
      this.y += this.vy * dt;
      this.vy += this.gravity * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.isGrounded = true;
      }
    }
    this.group.position.y = this.y;

    // Ducking scale
    const targetScaleY = this.isDucking && this.isGrounded ? 0.52 : 1;
    const targetScaleXZ = this.isDucking && this.isGrounded ? 1.18 : 1;
    this.rig.scale.y += (targetScaleY - this.rig.scale.y) * Math.min(1, dt * 18);
    this.rig.scale.x += (targetScaleXZ - this.rig.scale.x) * Math.min(1, dt * 18);
    this.rig.scale.z += (targetScaleXZ - this.rig.scale.z) * Math.min(1, dt * 18);

    // Animations
    const runFreq = elapsed * 13 * speedMultiplier;
    const flapSpeed = this.isGrounded ? elapsed * 9 : elapsed * 16;
    const flapAmp = this.isGrounded ? 0.45 : 0.85;

    this.leftWing.rotation.z = Math.sin(flapSpeed) * flapAmp + 0.25;
    this.rightWing.rotation.z = -Math.sin(flapSpeed) * flapAmp - 0.25;

    this.tailGroup.rotation.y = Math.sin(runFreq * 0.7) * 0.25;
    this.headGroup.position.y = 1.95 + Math.sin(runFreq) * 0.06;

    if (this.isGrounded) {
      this.legFL.rotation.x = Math.sin(runFreq) * 0.75;
      this.legBR.rotation.x = Math.sin(runFreq) * 0.75;
      this.legFR.rotation.x = -Math.sin(runFreq) * 0.75;
      this.legBL.rotation.x = -Math.sin(runFreq) * 0.75;
    } else {
      this.legFL.rotation.x = -0.5;
      this.legFR.rotation.x = -0.5;
      this.legBL.rotation.x = 0.5;
      this.legBR.rotation.x = 0.5;
    }

    // Invulnerability blink
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      this.group.visible = Math.floor(this.invulnerableTimer * 16) % 2 === 0;
      if (this.invulnerableTimer <= 0) {
        this.group.visible = true;
      }
    }
  }

  getHitbox() {
    const height = this.isDucking && this.isGrounded ? 1.1 : 2.1;
    return new THREE.Box3(
      new THREE.Vector3(this.group.position.x - 0.55, this.y + 0.1, -0.95),
      new THREE.Vector3(this.group.position.x + 0.55, this.y + height, 0.95)
    );
  }
}
