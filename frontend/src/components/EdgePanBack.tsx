// Compatibility export. AppLayout mounts only EdgeSwipeHandler, which owns
// both sidebar and back edge gestures; never mount these together.
export { default } from "./EdgeSwipeHandler";
