import * as THREE from 'three';
import { Dragon } from './dragon.js';
import { SoundManager } from './sound.js';

export class MarsDragonGame {
  constructor(container) {
    this.container = container;
    this.sound = new SoundManager();

    this.state = 'MENU';
    this.score = 0;
    this.highScore = Number(localStorage.getItem('mars_dragon_highscore') || 0);
    this.lives = 3;
    this.maxLives = 5;
    this.revivedThisRun = false;

    this.baseSpeed = 24;
    this.speed = this.baseSpeed;
    this.spawnTimer = 0;
    this.bonusTimer = 0;
    this.lanes = [-3.2, 0, 3.2];

    this.obstacles = [];
    this.bonuses = [];
    this.particles = [];
    this.scenery = [];

    this.initScene();
    this.initEnvironment();
    this.dragon = new Dragon(this.scene);
    this.bindEvents();
    this.updateHUD();

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a0b05);
    this.scene.fog = new THREE.FogExp2(0x4a1408, 0.013);

    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.1,
      220
    );
    this.camera.position.set(0, 5.4, 9.2);
    this.camera.lookAt(0, 1.8, -8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xff8a65, 0x3e1208, 1.15);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffccbc, 2.1);
    sunLight.position.set(18, 32, 16);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 90;
    const d = 22;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);
  }

  initEnvironment() {
    const trackGeo = new THREE.PlaneGeometry(11.5, 260);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x8d3219,
      roughness: 0.9
    });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.z = -100;
    track.receiveShadow = true;
    this.scene.add(track);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd84315, transparent: true, opacity: 0.45 });
    [-1.6, 1.6].forEach((lx) => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 260), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(lx, 0.02, -100);
      this.scene.add(line);
    });

    const desertGeo = new THREE.PlaneGeometry(340, 260);
    const desertMat = new THREE.MeshStandardMaterial({
      color: 0x5c1d0c,
      roughness: 0.95
    });
    const desert = new THREE.Mesh(desertGeo, desertMat);
    desert.rotation.x = -Math.PI / 2;
    desert.position.set(0, -0.05, -100);
    this.scene.add(desert);

    const planetGeo = new THREE.SphereGeometry(24, 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0xff7043,
      emissive: 0x4e1607,
      roughness: 0.7
    });
    this.skyPlanet = new THREE.Mesh(planetGeo, planetMat);
    this.skyPlanet.position.set(-28, 34, -145);
    this.scene.add(this.skyPlanet);

    const ringGeo = new THREE.RingGeometry(29, 36, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffab91,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.6;
    ring.rotation.y = 0.25;
    this.skyPlanet.add(ring);

    const starVertices = [];
    for (let i = 0; i < 600; i++) {
      starVertices.push(
        (Math.random() - 0.5) * 320,
        15 + Math.random() * 110,
        -40 - Math.random() * 160
      );
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffe0b2, size: 0.65 });
    this.scene.add(new THREE.Points(starGeo, starMat));

    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x6d2310, roughness: 0.9 });
    for (let i = 0; i < 36; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const height = 4 + Math.random() * 12;
      const radius = 3 + Math.random() * 6;
      const m = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 6), mountainMat);
      m.position.set(
        side * (11 + Math.random() * 28),
        height / 2 - 0.2,
        -i * 7
      );
      this.scene.add(m);
      this.scenery.push(m);
    }
  }

  startGame() {
    this.sound.init();
    this.sound.startBGM();
    this.clearEntities();
    this.score = 0;
    this.lives = 3;
    this.revivedThisRun = false;
    this.speed = this.baseSpeed;
    this.spawnTimer = 0.8;
    this.bonusTimer = 2.0;
    this.dragon.reset();
    this.state = 'PLAYING';
    this.updateHUD();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('mobile-controls').classList.remove('hidden');
  }

  reviveGame() {
    if (this.revivedThisRun) return;
    this.revivedThisRun = true;
    this.lives = 2;
    this.clearNearbyObstacles();
    this.dragon.reset();
    this.dragon.triggerInvulnerability(3.0);
    this.spawnExplosion(this.dragon.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0x00e676, 35);
    this.sound.playRevive();
    this.sound.startBGM();
    this.state = 'PLAYING';
    this.updateHUD();
    this.showToast('✨ QAYTA TIRILDINGIZ! +2 JON');

    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('mobile-controls').classList.remove('hidden');
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.sound.stopBGM();
    const finalScore = Math.floor(this.score);
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      localStorage.setItem('mars_dragon_highscore', String(this.highScore));
    }
    this.updateHUD();

    document.getElementById('final-score').textContent = finalScore;
    document.getElementById('final-highscore').textContent = this.highScore;
    const reviveBtn = document.getElementById('revive-btn');
    reviveBtn.disabled = this.revivedThisRun;
    reviveBtn.textContent = this.revivedThisRun ? '✨ REVIVE ISHLATILDI' : '✨ REVIVE (Qayta tirilish)';

    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('mobile-controls').classList.add('hidden');
  }

  clearEntities() {
    this.obstacles.forEach((o) => this.scene.remove(o.mesh));
    this.bonuses.forEach((b) => this.scene.remove(b.mesh));
    this.obstacles = [];
    this.bonuses = [];
  }

  clearNearbyObstacles() {
    this.obstacles = this.obstacles.filter((o) => {
      if (o.mesh.position.z > -45) {
        this.scene.remove(o.mesh);
        return false;
      }
      return true;
    });
  }

  spawnObstacle() {
    const types = ['ROCK', 'LAVA', 'CHASM', 'DEBRIS', 'ROVER'];
    const type = types[Math.floor(Math.random() * types.length)];
    const laneIdx = Math.floor(Math.random() * 3);
    const x = this.lanes[laneIdx];
    const z = -115;

    let mesh;
    if (type === 'ROCK') {
      const geo = new THREE.DodecahedronGeometry(1.15, 0);
      const mat = new THREE.MeshStandardMaterial({ color: 0x4e261b, roughness: 0.9 });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 1.0, z);
      mesh.castShadow = true;
    } else if (type === 'LAVA') {
      const group = new THREE.Group();
      const pool = new THREE.Mesh(
        new THREE.CylinderGeometry(1.25, 1.35, 0.25, 16),
        new THREE.MeshStandardMaterial({
          color: 0xff3d00,
          emissive: 0xff5722,
          emissiveIntensity: 1.6
        })
      );
      group.add(pool);
      mesh = group;
      mesh.position.set(x, 0.12, z);
    } else if (type === 'CHASM') {
      const chasm = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.08, 3.2),
        new THREE.MeshBasicMaterial({ color: 0x090201 })
      );
      mesh = chasm;
      mesh.position.set(x, 0.03, z);
    } else if (type === 'DEBRIS') {
      const group = new THREE.Group();
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 1.5, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.7, roughness: 0.35 })
      );
      plate.rotation.z = 0.25;
      plate.position.y = 0.85;
      plate.castShadow = true;
      group.add(plate);
      mesh = group;
      mesh.position.set(x, 0, z);
    } else {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.8, 1.8),
        new THREE.MeshStandardMaterial({ color: 0xeceff1, metalness: 0.6, roughness: 0.3 })
      );
      body.position.y = 0.65;
      body.castShadow = true;
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff1744 })
      );
      beacon.position.y = 1.25;
      group.add(body, beacon);
      mesh = group;
      mesh.position.set(x, 0, z);
    }

    this.scene.add(mesh);
    this.obstacles.push({
      type,
      mesh,
      moveDir: Math.random() > 0.5 ? 1 : -1
    });
  }

  spawnRaspberry() {
    const laneIdx = Math.floor(Math.random() * 3);
    const x = this.lanes[laneIdx];
    const group = new THREE.Group();

    const berryMat = new THREE.MeshStandardMaterial({
      color: 0xe91e63,
      emissive: 0x880e4f,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x00e676 });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const drupe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), berryMat);
      drupe.position.set(Math.cos(angle) * 0.2, 0, Math.sin(angle) * 0.2);
      group.add(drupe);
    }
    const topDrupe = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), berryMat);
    topDrupe.position.y = 0.24;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 5), leafMat);
    leaf.position.y = 0.52;
    group.add(topDrupe, leaf);

    group.position.set(x, 1.35, -115);
    this.scene.add(group);
    this.bonuses.push({ mesh: group });
  }

  spawnExplosion(pos, colorHex, count = 20) {
    const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          2 + Math.random() * 10,
          (Math.random() - 0.5) * 12
        ),
        life: 0.65
      });
    }
  }

  showToast(text) {
    const el = document.getElementById('toast-msg');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => el.classList.remove('show'), 1400);
  }

  updateHUD() {
    document.getElementById('score-display').textContent = Math.floor(this.score);
    document.getElementById('highscore-display').textContent = Math.max(
      this.highScore,
      Math.floor(this.score)
    );
    document.getElementById('lives-display').textContent =
      this.lives > 0 ? '❤️'.repeat(this.lives) : '💔';
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', (e) => {
      if (this.state !== 'PLAYING') return;
      const key = e.key.toLowerCase();
      if (key === 'a' || e.key === 'ArrowLeft') {
        if (this.dragon.moveLeft()) this.sound.playLaneSwitch();
      } else if (key === 'd' || e.key === 'ArrowRight') {
        if (this.dragon.moveRight()) this.sound.playLaneSwitch();
      } else if (key === 'w' || e.code === 'Space' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.dragon.jump()) this.sound.playJump();
      } else if (key === 's' || e.key === 'ArrowDown') {
        this.dragon.setDuck(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 's' || e.key === 'ArrowDown') {
        this.dragon.setDuck(false);
      }
    });

    document.getElementById('play-btn').addEventListener('click', () => this.startGame());
    document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
    document.getElementById('revive-btn').addEventListener('click', () => this.reviveGame());

    const soundBtn = document.getElementById('sound-toggle');
    soundBtn.addEventListener('click', () => {
      const muted = this.sound.toggleMute();
      soundBtn.textContent = muted ? '🔇' : '🔊';
    });

    document.getElementById('btn-left').addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.state === 'PLAYING' && this.dragon.moveLeft()) this.sound.playLaneSwitch();
    });
    document.getElementById('btn-right').addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.state === 'PLAYING' && this.dragon.moveRight()) this.sound.playLaneSwitch();
    });
    document.getElementById('btn-jump').addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.state === 'PLAYING' && this.dragon.jump()) this.sound.playJump();
    });
    const duckBtn = document.getElementById('btn-duck');
    duckBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.state === 'PLAYING') this.dragon.setDuck(true);
    });
    duckBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.dragon.setDuck(false);
    });
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.skyPlanet.rotation.y += dt * 0.05;

    if (this.state === 'PLAYING') {
      this.speed = Math.min(54, this.baseSpeed + this.score * 0.018);
      this.score += dt * (this.speed * 0.65);
      const speedMult = this.speed / this.baseSpeed;

      this.dragon.update(dt, elapsed, speedMult);

      for (const m of this.scenery) {
        m.position.z += this.speed * dt;
        if (m.position.z > 18) {
          m.position.z = -230;
        }
      }

      this.spawnTimer -= dt * speedMult;
      if (this.spawnTimer <= 0) {
        this.spawnObstacle();
        this.spawnTimer = 1.05 + Math.random() * 0.65;
      }

      this.bonusTimer -= dt;
      if (this.bonusTimer <= 0) {
        this.spawnRaspberry();
        this.bonusTimer = 4.5 + Math.random() * 3.5;
      }

      const dragonBox = this.dragon.getHitbox();

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.mesh.position.z += this.speed * dt;

        if (obs.type === 'ROVER') {
          obs.mesh.position.x += obs.moveDir * dt * 3.2;
          if (obs.mesh.position.x > 3.4) obs.moveDir = -1;
          if (obs.mesh.position.x < -3.4) obs.moveDir = 1;
        }

        const obsBox = new THREE.Box3().setFromObject(obs.mesh);
        obsBox.expandByScalar(-0.18);

        if (this.dragon.invulnerableTimer <= 0 && dragonBox.intersectsBox(obsBox)) {
          this.lives--;
          this.dragon.triggerInvulnerability(2.0);
          if (obs.type === 'LAVA') {
            this.sound.playLava();
            this.spawnExplosion(this.dragon.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xff5722, 28);
          } else {
            this.sound.playHit();
            this.spawnExplosion(this.dragon.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffca28, 22);
          }
          this.scene.remove(obs.mesh);
          this.obstacles.splice(i, 1);

          if (this.lives <= 0) {
            this.updateHUD();
            this.gameOver();
            break;
          } else {
            this.showToast(`💥 TO'QNASHUV! ${this.lives} ta jon qoldi`);
          }
          continue;
        }

        if (obs.mesh.position.z > 15) {
          this.scene.remove(obs.mesh);
          this.obstacles.splice(i, 1);
        }
      }

      for (let i = this.bonuses.length - 1; i >= 0; i--) {
        const b = this.bonuses[i];
        b.mesh.position.z += this.speed * dt;
        b.mesh.rotation.y += dt * 3.2;
        b.mesh.position.y = 1.35 + Math.sin(elapsed * 5 + i) * 0.2;

        const bBox = new THREE.Box3().setFromObject(b.mesh);
        if (dragonBox.intersectsBox(bBox)) {
          this.sound.playRaspberry();
          this.spawnExplosion(b.mesh.position, 0xe91e63, 18);
          this.score += 50;
          if (this.lives < this.maxLives) {
            this.lives++;
            this.showToast('🍓 MALINA! +1 JON & +50 BALL');
          } else {
            this.showToast('🍓 MALINA! +50 BALL');
          }
          this.scene.remove(b.mesh);
          this.bonuses.splice(i, 1);
          continue;
        }

        if (b.mesh.position.z > 15) {
          this.scene.remove(b.mesh);
          this.bonuses.splice(i, 1);
        }
      }

      this.updateHUD();
    } else if (this.state === 'MENU') {
      this.dragon.update(dt, elapsed, 0.7);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 22 * dt;
      p.mesh.scale.setScalar(Math.max(0.01, p.life));
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
