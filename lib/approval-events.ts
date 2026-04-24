type ApprovalEventHandler = () => void

const listeners: Set<ApprovalEventHandler> = new Set()

export function onApprovalAction(handler: ApprovalEventHandler): () => void {
  listeners.add(handler)
  return () => listeners.delete(handler)
}

export function emitApprovalAction() {
  listeners.forEach(fn => fn())
}
