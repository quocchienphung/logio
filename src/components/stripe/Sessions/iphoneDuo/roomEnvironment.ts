import {
  BackSide,
  BoxGeometry,
  InstancedMesh,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  Scene,
  type BufferGeometry,
  type Material,
} from "three";

/*
 * three.js r186 RoomEnvironment (MIT, examples/jsm/environments/RoomEnvironment.js), which
 * chuspeeism/iphone-duo renders with. The project's r178 copy paints its area lights with
 * MeshBasicMaterial; r179+ uses emissive-only Lambert lights (three.js #31348) and lowers the room
 * by 3.5, giving the brighter reflections that make the bezel read grey instead of black.
 */
export class RoomEnvironment extends Scene {
  constructor() {
    super();
    this.name = "RoomEnvironment";
    this.position.y = -3.5;

    const geometry = new BoxGeometry();
    geometry.deleteAttribute("uv");
    const roomMaterial = new MeshStandardMaterial({ side: BackSide });
    const boxMaterial = new MeshStandardMaterial();

    const mainLight = new PointLight(0xffffff, 900, 28, 2);
    mainLight.position.set(0.418, 16.199, 0.3);
    this.add(mainLight);

    const room = new Mesh(geometry, roomMaterial);
    room.position.set(-0.757, 13.219, 0.717);
    room.scale.set(31.713, 28.305, 28.591);
    this.add(room);

    const boxes = new InstancedMesh(geometry, boxMaterial, 6);
    const transform = new Object3D();
    const layout: [number[], number, number[]][] = [
      [[-10.906, 2.009, 1.846], -0.195, [2.328, 7.905, 4.651]],
      [[-5.607, -0.754, -0.758], 0.994, [1.97, 1.534, 3.955]],
      [[6.167, 0.857, 7.803], 0.561, [3.927, 6.285, 3.687]],
      [[-2.017, 0.018, 6.124], 0.333, [2.002, 4.566, 2.064]],
      [[2.291, -0.756, -2.621], -0.286, [1.546, 1.552, 1.496]],
      [[-2.193, -0.369, -5.547], 0.516, [3.875, 3.487, 2.986]],
    ];
    layout.forEach(([position, rotationY, scale], i) => {
      transform.position.set(position[0], position[1], position[2]);
      transform.rotation.set(0, rotationY, 0);
      transform.scale.set(scale[0], scale[1], scale[2]);
      transform.updateMatrix();
      boxes.setMatrixAt(i, transform.matrix);
    });
    this.add(boxes);

    const lights: [number, number[], number[]][] = [
      [50, [-16.116, 14.37, 8.208], [0.1, 2.428, 2.739]], // -x right
      [50, [-16.109, 18.021, -8.207], [0.1, 2.425, 2.751]], // -x left
      [17, [14.904, 12.198, -1.832], [0.15, 4.265, 6.331]], // +x
      [43, [-0.462, 8.89, 14.52], [4.38, 5.441, 0.088]], // +z
      [20, [3.235, 11.486, -12.541], [2.5, 2.0, 0.1]], // -z
      [100, [0, 20, 0], [1, 0.1, 1]], // +y
    ];
    for (const [intensity, position, scale] of lights) {
      const light = new Mesh(geometry, new MeshLambertMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: intensity }));
      light.position.set(position[0], position[1], position[2]);
      light.scale.set(scale[0], scale[1], scale[2]);
      this.add(light);
    }
  }

  dispose() {
    const resources = new Set<BufferGeometry | Material>();
    this.traverse((object) => {
      if (object instanceof Mesh) {
        resources.add(object.geometry);
        resources.add(object.material as Material);
      }
    });
    for (const resource of resources) resource.dispose();
  }
}
