import React, { useState, useCallback } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [onConfirm, setOnConfirm] = useState<{ fn: () => void }>({ fn: () => {} });

  const confirm = useCallback((msg: string, onConfirmCallback: () => void) => {
    setMessage(msg);
    setOnConfirm({ fn: () => {
      onConfirmCallback();
      setIsOpen(false);
    }});
    setIsOpen(true);
  }, []);

  const dialog = (
    <ConfirmDialog
      isOpen={isOpen}
      message={message}
      onConfirm={onConfirm.fn}
      onCancel={() => setIsOpen(false)}
    />
  );

  return { confirm, dialog };
};
