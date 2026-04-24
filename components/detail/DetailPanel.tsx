'use client'

import { Fragment, type ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface DetailPanelProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  typeBadge: string
  typeColor?: string
  entityLabel?: string
  entityColor?: string
  children: ReactNode
  footer?: ReactNode
}

export function DetailPanel({
  open,
  onClose,
  title,
  subtitle,
  typeBadge,
  typeColor = 'var(--blue)',
  entityLabel,
  entityColor,
  children,
  footer,
}: DetailPanelProps) {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-400"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 transition-opacity"
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(6, 9, 13, 0.75)' }}
          />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-600"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-400"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-lg">
                  <div
                    className="flex h-full flex-col"
                    style={{
                      background: 'var(--bg-card)',
                      backdropFilter: 'blur(24px) saturate(1.1)',
                      WebkitBackdropFilter: 'blur(24px) saturate(1.1)',
                      boxShadow: '-4px 0 40px rgba(0,0,0,0.5)',
                      borderLeft: '1px solid var(--border-faint)',
                    }}
                  >
                    {/* Header */}
                    <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--border-faint)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                            <span style={{
                              fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
                              padding: '2px 8px', borderRadius: 5,
                              ...(typeColor.startsWith('var(')
                                ? {
                                    background: `color-mix(in srgb, ${typeColor} 9%, transparent)`,
                                    color: typeColor,
                                    border: `1px solid color-mix(in srgb, ${typeColor} 15%, transparent)`,
                                  }
                                : {
                                    background: `${typeColor}15`,
                                    color: typeColor,
                                    border: `1px solid ${typeColor}25`,
                                  }),
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                              {typeBadge}
                            </span>
                            {entityLabel && (
                              <span style={{
                                fontSize: 10, fontFamily: 'monospace',
                                padding: '2px 8px', borderRadius: 5,
                                background: entityColor ? `${entityColor}12` : 'var(--bg-elevated)',
                                color: entityColor || 'var(--text-muted)',
                                border: `1px solid ${entityColor ? `${entityColor}25` : 'var(--border-subtle)'}`,
                              }}>
                                {entityLabel}
                              </span>
                            )}
                          </div>
                          <Dialog.Title style={{
                            fontSize: 20, fontWeight: 600, color: 'var(--text-primary)',
                            lineHeight: 1.3,
                          }}>
                            {title}
                          </Dialog.Title>
                          {subtitle && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                              {subtitle}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={onClose}
                          style={{
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-faint)',
                            borderRadius: 6, padding: 6, cursor: 'pointer',
                            color: 'var(--text-muted)', flexShrink: 0,
                            transition: 'border-color 0.2s, color 0.2s',
                          }}
                        >
                          <XMarkIcon style={{ width: 18, height: 18 }} />
                        </button>
                      </div>
                    </div>

                    {/* Scrollable content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                      {children}
                    </div>

                    {/* Footer (CommandBar + ActionBar) */}
                    {footer && (
                      <div style={{
                        borderTop: '1px solid var(--border-faint)',
                        padding: '16px 24px',
                        background: 'var(--bg-card)',
                      }}>
                        {footer}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
