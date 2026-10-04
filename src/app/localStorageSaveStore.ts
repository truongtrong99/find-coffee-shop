import type { SaveStore } from '../core'

const KEY = 'little-cuppers:save'

/** Browser adapter for the core's save store port; storage failures degrade to "no save". */
export function createLocalStorageSaveStore(): SaveStore {
  return {
    load() {
      try {
        return localStorage.getItem(KEY)
      } catch {
        return null
      }
    },
    save(serialized) {
      try {
        localStorage.setItem(KEY, serialized)
      } catch {
        // Private mode or full storage: progress just isn't persisted.
      }
    },
  }
}
