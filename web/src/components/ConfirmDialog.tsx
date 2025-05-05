import React from 'react';
import { FiX, FiAlertTriangle } from './IconComponents';
import '../scss/ConfirmDialog.scss';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  type = 'warning'
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        <div className={`dialog-header ${type}`}>
          <h3>{title}</h3>
          <button className="close-button" onClick={onCancel}>
            <FiX />
          </button>
        </div>
        
        <div className="dialog-content">
          <div className="icon-container">
            <FiAlertTriangle className={`icon ${type}`} />
          </div>
          <p>{message}</p>
        </div>
        
        <div className="dialog-actions">
          <button className="cancel-button" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={`confirm-button ${type}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;