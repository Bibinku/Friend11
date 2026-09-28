import type { ChatMessage } from '../types';
import { Avatar } from './Avatar';
import { Modal } from './Modal';

const full = (ms: number) =>
  new Date(ms).toLocaleString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** The "i" info view for one message: who sent it, exactly when, and its text. */
export function MessageInfoModal({ message, onClose }: { message: ChatMessage | null; onClose: () => void }) {
  return (
    <Modal open={message !== null} onClose={onClose} title="Message info">
      {message && (
        <div className="msg-info">
          <div className="msg-info-head">
            <Avatar id={message.avatarId} size={48} />
            <div>
              <p className="msg-info-name">{message.username}</p>
              <p className="msg-info-time">{full(message.createdAt)}</p>
            </div>
          </div>
          <p className="msg-info-body">{message.body}</p>
        </div>
      )}
    </Modal>
  );
}