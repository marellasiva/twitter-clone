import React from 'react';
import TweetComposer from './TweetComposer';

interface TweetModalProps {
  onClose: () => void;
  quoteTweetOf?: string;
  placeholder?: string;
}

const TweetModal: React.FC<TweetModalProps> = ({ onClose, quoteTweetOf, placeholder }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 rounded-xl w-full max-w-xl p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">✕</button>
          <div />
        </div>
        <TweetComposer onTweetCreated={() => onClose()} quoteTweetOf={quoteTweetOf} placeholder={placeholder} />
      </div>
    </div>
  );
};

export default TweetModal;


