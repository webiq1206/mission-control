import type { ApprovalCategory } from './types'

const TYPE_TO_CATEGORY: Record<string, ApprovalCategory> = {
  spend: 'execution',
  campaign: 'execution',
  deploy: 'progression',
  publish: 'progression',
  content: 'review',
  legal: 'review',
  other: 'execution',
}

export function deriveCategory(
  type: string,
  explicitCategory?: string | null,
): ApprovalCategory {
  if (
    explicitCategory &&
    ['execution', 'progression', 'review', 'acknowledgment'].includes(explicitCategory)
  ) {
    return explicitCategory as ApprovalCategory
  }
  return TYPE_TO_CATEGORY[type] || 'execution'
}

interface CategoryMeta {
  label: string
  color: string
  bgColor: string
  borderColor: string
  description: string
}

const CATEGORY_META: Record<ApprovalCategory, CategoryMeta> = {
  execution: {
    label: 'Execution Approval',
    color: 'var(--type-execution)',
    bgColor: 'var(--type-execution-bg)',
    borderColor: 'rgba(74,158,255,0.20)',
    description: 'Permission to take a specific action',
  },
  progression: {
    label: 'Progression Approval',
    color: 'var(--type-progression)',
    bgColor: 'var(--type-progression-bg)',
    borderColor: 'rgba(45,212,160,0.20)',
    description: 'Permission to move forward in a workflow',
  },
  review: {
    label: 'Review Required',
    color: 'var(--type-review)',
    bgColor: 'var(--type-review-bg)',
    borderColor: 'rgba(229,185,60,0.20)',
    description: 'Your input or edits are needed before proceeding',
  },
  acknowledgment: {
    label: 'Acknowledgment Only',
    color: 'var(--text-secondary)',
    bgColor: 'rgba(138,138,168,0.10)',
    borderColor: 'rgba(138,138,168,0.20)',
    description: 'No decision required — just confirming you have seen this',
  },
}

export function getCategoryMeta(category: ApprovalCategory): CategoryMeta {
  return CATEGORY_META[category]
}

interface ActionOutcome {
  label: string
  items: string[]
}

export function getActionOutcomes(
  category: ApprovalCategory,
  type: string,
  requestedBy?: string,
): { approve: ActionOutcome; reject: ActionOutcome; modify: ActionOutcome; acknowledge?: ActionOutcome } {
  const agent = requestedBy || 'the requesting agent'

  const base = {
    approve: {
      label: 'If Approved',
      items: [
        `${agent} is cleared to proceed with the requested action`,
        'The linked task (if any) moves to the next status',
        'This item is removed from pending approvals',
      ],
    },
    reject: {
      label: 'If Rejected',
      items: [
        'No action will be taken',
        `${agent} is notified of the rejection`,
        'The item is closed and logged',
      ],
    },
    modify: {
      label: 'If Modified',
      items: [
        'Your edits are recorded on the approval',
        'The item remains pending for a final decision',
        `${agent} can see the modifications`,
      ],
    },
  }

  if (category === 'execution') {
    base.approve.items = [
      `${agent} will execute the approved action immediately`,
      type === 'spend' ? 'Funds will be committed as described' : 'The specified action will be carried out',
      'This item moves to decided and is logged',
    ]
    base.reject.items = [
      'The action is canceled — nothing will be executed',
      `${agent} is notified and the task is returned or closed`,
      'No resources are committed',
    ]
  } else if (category === 'progression') {
    base.approve.items = [
      'The workflow advances to the next stage',
      `${agent} proceeds with the next step in the pipeline`,
      type === 'deploy' ? 'Deployment will be initiated to the target environment' : 'Publication or release will proceed',
    ]
    base.reject.items = [
      'The workflow is held at the current stage',
      `${agent} is notified and must revise before resubmitting`,
      'No progression occurs',
    ]
  } else if (category === 'review') {
    base.approve.items = [
      'Your review is accepted — the work is cleared to move forward',
      `${agent} will proceed based on your feedback`,
      'Any edits you provided are applied',
    ]
    base.reject.items = [
      'The work is sent back for revision',
      `${agent} must address your feedback before resubmitting`,
      'The item remains in review state',
    ]
    base.modify.items = [
      'Your edits and feedback are attached to the item',
      `${agent} receives your modifications`,
      'The item can then be approved or stays pending for further review',
    ]
  }

  if (category === 'acknowledgment') {
    return {
      ...base,
      acknowledge: {
        label: 'If Acknowledged',
        items: [
          'This item is marked as seen',
          'No action is triggered',
          'It is removed from your queue and logged',
        ],
      },
    }
  }

  return base
}

export function getImpactText(category: ApprovalCategory, urgency: string): string {
  if (urgency === 'urgent') {
    return 'This is marked urgent. Delaying could impact deadlines, block agent work, or cause downstream issues that are harder to fix later.'
  }

  switch (category) {
    case 'execution':
      return 'An agent is waiting on your go-ahead to take action. Until you decide, the work is paused and nothing moves forward.'
    case 'progression':
      return 'A workflow is waiting at a gate. Approving lets it advance; ignoring it means the next steps cannot begin.'
    case 'review':
      return 'Work has been completed and needs your review. The agent cannot finalize or publish until you have provided input.'
    case 'acknowledgment':
      return 'This is informational. No action is blocked, but acknowledging it clears it from your queue and confirms you are aware.'
    default:
      return 'This approval is needed before agents can proceed. Review the details and decide how to move forward.'
  }
}

export function getNextStepText(
  category: ApprovalCategory,
  status: string,
  requestedBy?: string,
): string {
  const agent = requestedBy || 'The responsible agent'

  switch (status) {
    case 'approved':
      if (category === 'execution') return `${agent} will now execute the approved action. You will see progress in the activity feed.`
      if (category === 'progression') return `The workflow has advanced. ${agent} is proceeding with the next stage.`
      if (category === 'review') return `Your review is accepted. ${agent} will finalize the work.`
      return `${agent} has been notified and will proceed accordingly.`

    case 'rejected':
      return `${agent} has been notified of the rejection. No action will be taken. The item is closed.`

    case 'acknowledged':
      return 'This item has been acknowledged and removed from your queue. No further action is needed.'

    case 'deferred':
      return 'This item remains open and will stay in your queue until a final decision is made.'

    case 'pending':
      if (category === 'acknowledgment') return 'Acknowledge this item to clear it from your queue. No decision is required.'
      return 'Review the details below and take action. The responsible agent is waiting on your decision.'

    default:
      return ''
  }
}

export function getPurposeText(
  category: ApprovalCategory,
  type: string,
  requestedBy: string,
  entity: string,
): string {
  const agent = requestedBy
  switch (category) {
    case 'execution':
      return `${agent} is requesting permission to take action on behalf of ${entity}. This requires your explicit approval before anything is executed.`
    case 'progression':
      return `${agent} has completed a stage of work for ${entity} and needs your approval to move the workflow to the next step.`
    case 'review':
      return `${agent} has produced work for ${entity} that needs your review. Your input or edits are required before it can proceed.`
    case 'acknowledgment':
      return `${agent} is sharing an update related to ${entity}. No decision is needed — just confirm you have seen it.`
    default:
      return `${agent} is requesting your attention on a ${type} matter for ${entity}.`
  }
}
