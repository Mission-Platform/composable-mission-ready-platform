import type { Meta, StoryObj } from '@mission-platform/storybook-framework';
import { ForgeThreeCanvas, type ThreeContext } from '@mission-platform/three';
import * as THREE from 'three';

/**
 * A small Three.js scene demonstrating `@mission-platform/three`. A single cube
 * is added to the scene and spun every frame through the write-once
 * `ForgeThreeCanvas` component's `onReady` callback (which hands back the
 * package's `useThree`-owned `renderer`/`scene`/`camera`). The material colour,
 * wireframe mode, and spin speed are wired to Storybook controls so the same
 * neutral example is interactive on every framework the package builds for.
 */
interface ThreeSpinningCubeProperties {
  /** Hex colour of the cube material. */
  color?: string;
  /** Render the cube as a wireframe instead of a solid. */
  wireframe?: boolean;
  /** Radians added to each rotation axis per frame. */
  speed?: number;
}

function ThreeSpinningCube({
  color = '#4f46e5',
  wireframe = false,
  speed = 0.01,
}: Readonly<ThreeSpinningCubeProperties>) {
  const onReady = ({ scene }: ThreeContext): (() => void) => {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), wireframe });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    let frameId: number;
    const spin = (): void => {
      frameId = requestAnimationFrame(spin);
      cube.rotation.x += speed;
      cube.rotation.y += speed;
    };
    spin();

    return () => {
      cancelAnimationFrame(frameId);
      scene.remove(cube);
      geometry.dispose();
      material.dispose();
    };
  };

  return (
    <div style={{ width: '100%', height: '360px', background: '#0b0b0f' }}>
      <ForgeThreeCanvas onReady={onReady} />
    </div>
  );
}

const meta = {
  title: 'Organisms/Three/SpinningCube',
  component: ThreeSpinningCube,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`@mission-platform/three` is the framework-neutral Three.js integration. This story mounts the write-once `ForgeThreeCanvas` component and, through its `onReady` callback, adds a cube to the `useThree`-managed scene and animates it every frame — the same neutral source compiled to each supported framework.',
      },
    },
  },
  argTypes: {
    color: { control: 'color' },
    wireframe: { control: 'boolean' },
    speed: { control: { type: 'range', min: 0, max: 0.1, step: 0.005 } },
  },
} satisfies Meta<typeof ThreeSpinningCube>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpinningCube: Story = {};

export const Wireframe: Story = { args: { wireframe: true, color: '#22d3ee' } };

export const FastSpin: Story = { args: { speed: 0.05, color: '#f97316' } };
