/**
 * Shim framer-motion — remplace toutes les animations par des rendus instantanés.
 * Tous les props d'animation (initial, animate, exit, transition...) sont ignorés.
 */
import { forwardRef, createElement, Fragment } from 'react';

const ANIM_PROPS = new Set([
  'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
  'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'layout',
  'layoutId', 'layoutDependency', 'onAnimationStart', 'onAnimationComplete',
  'onUpdate', 'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
  'style', // on garde style
]);

function makeComponent(tag) {
  return forwardRef(function MotionShim({ children, style, ...props }, ref) {
    const clean = {};
    for (const k in props) {
      if (!ANIM_PROPS.has(k)) clean[k] = props[k];
    }
    return createElement(tag, { ...clean, style, ref }, children);
  });
}

// Proxy qui crée un composant pour n'importe quel tag HTML
export const motion = new Proxy({}, {
  get(cache, tag) {
    if (!cache[tag]) cache[tag] = makeComponent(tag);
    return cache[tag];
  },
});

// AnimatePresence rend ses enfants directement sans délai
export const AnimatePresence = ({ children }) => createElement(Fragment, null, children);

// Stubs pour les hooks rarement utilisés
export const useAnimation   = () => ({ start: () => Promise.resolve(), stop: () => {} });
export const useMotionValue = (v) => ({ get: () => v, set: () => {}, onChange: () => () => {} });
export const useTransform   = (_v, _i, _o) => ({ get: () => 0 });
export const useSpring       = (v) => v;
export const useInView       = () => [null, false];
export const useCycle        = (...args) => [args[0], () => {}];
export const usePresence     = () => [true, () => {}];

export default motion;
