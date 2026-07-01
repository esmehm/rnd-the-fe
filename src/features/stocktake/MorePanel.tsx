import { useState } from 'react';
import { ModalOverlay, Modal, Dialog } from 'react-aria-components';
import type { StocktakeQuery } from '../../gql/generated';
import { formatDate } from './format';
import * as ui from '../../ui/uikit.css';
import * as d from './MorePanel.css';
import { vars } from '../../styles/theme.css';

type Stocktake = Extract<StocktakeQuery['stocktake'], { __typename: 'StocktakeNode' }>;

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={d.field}>
      <span className={d.label}>{label}</span>
      <span className={d.value}>{value || '—'}</span>
    </div>
  );
}

export function MorePanel({
  stocktake,
  disabled,
  onClose,
  onSaveComment,
  onDelete,
}: {
  stocktake: Stocktake;
  disabled: boolean;
  onClose: () => void;
  onSaveComment: (comment: string) => void;
  onDelete: () => void;
}) {
  const [comment, setComment] = useState(stocktake.comment ?? '');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = `Stocktake #${stocktake.stocktakeNumber} · ${stocktake.status} · ${stocktake.description ?? ''} · ${stocktake.lines.totalCount} lines`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  };

  return (
    <ModalOverlay className={d.overlay} isOpen isDismissable onOpenChange={(o) => !o && onClose()}>
      <Modal className={d.drawer}>
        <Dialog aria-label="Additional info" style={{ outline: 'none', display: 'contents' }}>
          <div className={ui.modalHeader}>Additional info</div>
          <div className={d.body}>
            <Field label="Entered by" value={stocktake.user?.username} />
            <Field label="Email" value={stocktake.user?.email} />
            <Field label="Created" value={formatDate(stocktake.createdDatetime)} />
            <Field label="Counted by" value={stocktake.countedBy} />
            <Field label="Verified by" value={stocktake.verifiedBy} />
            <Field label="Finalised" value={stocktake.finalisedDatetime ? formatDate(stocktake.finalisedDatetime) : '—'} />
            <label className={d.field}>
              <span className={d.label}>Comment</span>
              <input
                className={ui.input}
                value={comment}
                disabled={disabled}
                placeholder="Add a comment…"
                onChange={(e) => setComment(e.target.value)}
                onBlur={() => comment !== (stocktake.comment ?? '') && onSaveComment(comment)}
              />
            </label>
          </div>
          <div className={d.actions}>
            <span className={d.label}>Actions</span>
            <button className={ui.button} onClick={copy}>
              {copied ? '✓ Copied' : '⧉ Copy to clipboard'}
            </button>
            <button
              className={ui.buttonDanger}
              onClick={() => {
                if (confirm(`Delete stocktake #${stocktake.stocktakeNumber}? This cannot be undone.`)) onDelete();
              }}
            >
              🗑 Delete stocktake
            </button>
          </div>
          <div className={ui.modalFooter}>
            <button className={ui.buttonPrimary} onClick={onClose} style={{ background: vars.color.surfaceAlt, color: vars.color.text, borderColor: vars.color.border }}>
              Close
            </button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
