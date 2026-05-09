import { AnimatePresence, motion } from 'motion/react'
import type { UndoToastState } from '../hooks/useUndoToast'

interface Props {
  toast: UndoToastState | null
  onUndo: () => void
}

function UndoToast({ toast, onUndo }: Props) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className="undo-toast"
          role="status"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <span className="undo-toast-glyph" aria-hidden>
            ⌫
          </span>
          <span className="undo-toast-label">{toast.label}</span>
          <button type="button" className="undo-toast-action" onClick={onUndo}>
            Undo
          </button>
          <motion.span
            className="undo-toast-progress"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: toast.durationMs / 1000, ease: 'linear' }}
            aria-hidden
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default UndoToast
