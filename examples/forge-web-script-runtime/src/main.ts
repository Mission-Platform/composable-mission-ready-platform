import { load, manifest } from '@forge-example/runtime.fws';

console.log(load, manifest)

const result = document.querySelector<HTMLOutputElement>('#result');
if (result === null) throw new Error('The runtime example output element is missing.');

const exports = await load({
  'clock.now': {
    now: () => BigInt(Date.now()),
  },
});
const currentTime: () => bigint = exports.currentTime;
result.value = String(currentTime());
