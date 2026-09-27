import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { fetchUnreadMentionCount, markMentionsRead, subscribeToMentions } from '../services/chatService';
import { ChatPanel } from './ChatPanel';

/**
 * Persistent "Live Chat" launcher (bubble icon + label) on every page.
 * Signed-out visitors see it too; tapping it explains that chat needs an
 * account and opens sign-in. Members get the chat panel. The badge shows
 * how many @mentions of this person haven't been opened yet.
 */
export function ChatWidget() {
  const { chatOpen, closeChat, requestChat } = useUI();
  const { isMember, restored, user } = useAuth();
  const open = chatOpen && isMember;
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (chatOpen && restored && !isMember) closeChat();
  }, [chatOpen, restored, isMember, closeChat]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeChat();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeChat]);

  // Unread @mention badge: loaded once per sign-in, then kept live.
  useEffect(() => {
    if (!isMember || !user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    void fetchUnreadMentionCount().then((n) => {
      if (!cancelled) setUnread(n);
    });
    const unsubscribe = subscribeToMentions(user.id, () => setUnread((n) => n + 1));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isMember, user]);

  // Opening chat clears the badge, the same way opening a WhatsApp thread does.
  useEffect(() => {
    if (!open) return;
    setUnread(0);
    void markMentionsRead();
  }, [open]);

  return (
    <>
      {!open && (
        <button type="button" className="chat-launcher" onClick={requestChat} aria-haspopup="dialog">
          <MessageCircle size={22} aria-hidden="true" />
          <span>Live Chat</span>
          {unread > 0 && (
            <span className="chat-badge" aria-label={`${unread} unread mention${unread === 1 ? '' : 's'}`}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
      {open && <ChatPanel onClose={closeChat} />}
    </>
  );
}